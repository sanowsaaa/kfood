import type Stripe from "stripe";
import {
  applySession,
  bodyJson,
  checkRequest,
  type Dependencies,
  dependencies,
  failure,
  HttpError,
  json,
  type Payment,
  retrieveSession,
  sha256,
  UUID,
} from "../_shared/checkout.ts";

type MailJob = {
  id: string;
  order_id: string;
  lease_id: string;
  order_snapshot: {
    order_number: string;
    customer_email: string;
    customer_phone: string;
    total_amount: number;
    shipping_address: { city?: string; address?: string } | null;
    items: { name: string; quantity: number; line_minor: number }[];
  };
};
function html(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]!);
}
async function authorize(req: Request, deps: Dependencies): Promise<"worker" | "admin"> {
  const supplied = req.headers.get("x-checkout-worker-secret");
  if (supplied && await sha256(supplied) === await sha256(deps.config.workerSecret)) {
    return "worker";
  }
  const jwt = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!jwt) throw new HttpError(401, "Unauthorized");
  const { data: userData, error } = await deps.db.auth.getUser(jwt);
  if (error || !userData.user) throw new HttpError(401, "Unauthorized");
  const { data: role, error: roleError } = await deps.db.from("user_roles").select("role")
    .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (roleError) throw new Error("Admin lookup failed");
  if (!role) throw new HttpError(403, "Forbidden");
  return "admin";
}

async function findDetached(
  deps: Dependencies,
  payment: Payment & { created_at: string },
  deadline: number,
) {
  const created = Math.floor(new Date(payment.created_at).getTime() / 1000);
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    if (Date.now() > deadline - 20_000) throw new Error("Reconciliation time budget reached");
    const sessions = await deps.stripe.checkout.sessions.list({
      created: {
        gte: created - 60,
        lte: Math.floor(new Date(payment.expires_at).getTime() / 1000),
      },
      limit: 100,
      ...(cursor ? { starting_after: cursor } : {}),
    });
    const matches = sessions.data.filter((s) =>
      s.metadata?.order_id === payment.order_id &&
      s.metadata?.attempt_id === payment.attempt_id && s.metadata?.checkout_version === "1"
    );
    if (matches.length > 1) throw new Error("Multiple sessions for one attempt");
    if (matches[0]) return matches[0];
    if (!sessions.has_more) return null;
    cursor = sessions.data.at(-1)?.id;
  }
  throw new Error("Detached session search limit reached");
}
async function reconcile(
  deps: Dependencies,
  payment: Payment & { created_at: string },
  deadline: number,
) {
  let session: Stripe.Checkout.Session | null;
  if (payment.session_id) session = await retrieveSession(deps, payment.session_id);
  else session = await findDetached(deps, payment, deadline);
  if (!session) {
    // Keep ambiguous holds for review instead of guessing that no payment exists.
    console.error(
      JSON.stringify({ order_id: payment.order_id, reason: "DETACHED_SESSION_NOT_FOUND" }),
    );
    const { error } = await deps.db.from("stripe_webhook_events").upsert({
      event_id: `reconcile:detached:${payment.order_id}`,
      event_type: "reconcile.detached",
      session_id: "unknown",
      order_id: payment.order_id,
      livemode: payment.livemode,
      decision: "review",
      reason: "DETACHED_SESSION_NOT_FOUND",
    }, { onConflict: "event_id", ignoreDuplicates: true });
    if (error) throw new Error("Reconciliation issue persistence failed");
    return "review";
  }
  if (!payment.session_id) {
    session = await retrieveSession(deps, session.id);
    const { error } = await deps.db.rpc("checkout_attach_session", {
      p_order_id: payment.order_id,
      p_session_id: session.id,
      p_url: session.url,
      p_livemode: session.livemode,
      p_amount: session.amount_total,
      p_currency: session.currency,
    });
    if (error) throw new Error("Recovered session attachment failed");
  }
  const intent = session.payment_intent && typeof session.payment_intent !== "string"
    ? session.payment_intent
    : null;
  const charge = intent?.latest_charge && typeof intent.latest_charge !== "string"
    ? intent.latest_charge
    : null;
  const type = session.status === "expired"
    ? "checkout.session.expired"
    : session.status === "complete" && session.payment_status === "unpaid" &&
        ["canceled", "requires_payment_method"].includes(intent?.status || "")
    ? "checkout.session.async_payment_failed"
    : "checkout.session.completed";
  const eventId = [
    "reconcile",
    session.id,
    session.status,
    session.payment_status,
    intent?.status,
    charge?.amount_refunded,
    charge?.disputed,
  ].join(":");
  return (await applySession(deps, session, eventId, type)).decision;
}

async function sendEmails(deps: Dependencies) {
  const key = Deno.env.get("RESEND_API");
  const domain = Deno.env.get("RESEND_FROM_DOMAIN");
  const recipient = Deno.env.get("ORDER_NOTIFICATION_EMAIL");
  if (!key || !domain || !recipient) throw new Error("Order email configuration missing");
  const { data, error } = await deps.db.rpc("checkout_claim_emails", { p_limit: 5 });
  if (error) throw new Error("Email claim failed");
  let sent = 0;
  for (const job of (data || []) as MailJob[]) {
    let success = false;
    try {
      const order = job.order_snapshot;
      const items = order.items
        .map((item) =>
          `<li>${html(item.name)} × ${item.quantity} — €${(item.line_minor / 100).toFixed(2)}</li>`
        ).join("");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "Idempotency-Key": `kfood-order-${job.id}`,
        },
        body: JSON.stringify({
          from: `K-FOOD Поръчки <noreply@${domain}>`,
          to: [recipient],
          subject: `Платена поръчка ${order.order_number}`,
          html: `<h1>Платена поръчка ${html(order.order_number)}</h1><p>${
            html(order.customer_email)
          } · ${html(order.customer_phone)}</p><p>${html(order.shipping_address?.city)} · ${
            html(order.shipping_address?.address)
          }</p><ul>${items}</ul><p>Общо: €${Number(order.total_amount).toFixed(2)}</p>`,
        }),
      });
      success = response.ok;
      await response.body?.cancel();
    } catch {
      console.error(JSON.stringify({ mail_job_id: job.id, reason: "EMAIL_ATTEMPT_FAILED" }));
    }
    const { error: finishError } = await deps.db.rpc("checkout_finish_email", {
      p_id: job.id,
      p_lease_id: job.lease_id,
      p_success: success,
    });
    if (finishError) throw new Error("Email completion failed");
    if (success) sent++;
  }
  return sent;
}

export async function handleReconcile(req: Request, deps: Dependencies): Promise<Response> {
  try {
    const early = checkRequest(req, deps.config);
    if (early) return early;
    const role = await authorize(req, deps);
    const body = await bodyJson(req);
    if (
      body.orderId !== undefined && (typeof body.orderId !== "string" || !UUID.test(body.orderId))
    ) {
      throw new HttpError(400, "Invalid order ID");
    }
    if (role === "admin" && !body.orderId) throw new HttpError(400, "Select one order");
    let query = deps.db.from("checkout_payments").select("*").eq("livemode", deps.config.live);
    if (body.orderId) query = query.eq("order_id", body.orderId);
    else {query = query.in("state", ["pending", "awaiting_payment"])
        .order("last_reconciled_at", { nullsFirst: true }).order("created_at").limit(10);}
    const { data, error } = await query;
    if (error) throw new Error("Reconciliation query failed");
    if (body.orderId && !data?.length) {
      throw new HttpError(
        409,
        "За тази поръчка няма надеждна нова оферта. Необходим е ръчен преглед.",
      );
    }
    let checked = 0;
    let reviews = 0;
    const deadline = Date.now() + 45_000;
    for (const payment of (data || []) as (Payment & { created_at: string })[]) {
      if (Date.now() > deadline - 20_000) break;
      try {
        const decision = await reconcile(deps, payment, deadline);
        checked++;
        if (decision === "review") reviews++;
      } catch {
        reviews++;
        console.error(JSON.stringify({ order_id: payment.order_id, reason: "RECONCILE_FAILED" }));
      }
      const { error: touchError } = await deps.db.from("checkout_payments")
        .update({ last_reconciled_at: new Date().toISOString() }).eq("order_id", payment.order_id);
      if (touchError) throw new Error("Reconciliation cursor update failed");
    }
    const emailsSent = role === "worker" ? await sendEmails(deps) : 0;
    if (role === "worker") {
      const { error: cleanupError } = await deps.db.from("checkout_rate_limits").delete()
        .lt("expires_at", new Date(Date.now() - 86_400_000).toISOString());
      if (cleanupError) throw new Error("Rate limit cleanup failed");
    }
    return json({ checked, reviews, emailsSent }, 200, req, deps.config);
  } catch (error) {
    return failure(error, req, deps.config);
  }
}
export default {
  fetch: async (req: Request) => {
    try {
      return await handleReconcile(req, dependencies());
    } catch (error) {
      return failure(error);
    }
  },
};
