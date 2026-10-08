import {
  bodyJson,
  checkRequest,
  type Dependencies,
  dependencies,
  failure,
  HttpError,
  json,
  limited,
  sha256,
  TOKEN,
} from "../_shared/checkout.ts";

export async function handleStatus(req: Request, deps: Dependencies): Promise<Response> {
  try {
    const early = checkRequest(req, deps.config);
    if (early) return early;
    await limited(req, deps, "status", 90);
    const body = await bodyJson(req);
    if ('email' in body) return await tracking(req, body, deps);
    if (
      typeof body.orderNumber !== "string" || body.orderNumber.length > 100 ||
      typeof body.statusToken !== "string" || !TOKEN.test(body.statusToken)
    ) {
      throw new HttpError(400, "Невалидна заявка за статус");
    }
    const { data, error } = await deps.db.from("checkout_payments")
      .select("order_number,state,total_minor,livemode,expires_at")
      .eq("order_number", body.orderNumber).eq("status_token_hash", await sha256(body.statusToken))
      .eq("livemode", deps.config.live).maybeSingle();
    if (error) throw new Error("Status lookup failed");
    if (!data) throw new HttpError(404, "Нямате достъп до тази поръчка");
    return json(
      {
        orderNumber: data.order_number,
        paymentState: data.state,
        totalAmountMinor: data.total_minor,
        currency: "EUR",
        livemode: data.livemode,
        expiresAt: data.expires_at,
      },
      200,
      req,
      deps.config,
    );
  } catch (error) {
    return failure(error, req, deps.config);
  }
}

// Existing guest tracking belongs on the server: an email filter in the browser
// cannot satisfy ownership RLS. Keep the proof-only payment contract unchanged.
async function tracking(req: Request, body: Record<string, unknown>, deps: Dependencies): Promise<Response> {
  await limited(req, deps, "tracking", 10, 600);
  if (typeof body.orderNumber !== "string" || !/^[a-z0-9-]{3,100}$/i.test(body.orderNumber.trim()) ||
      typeof body.email !== "string" || body.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    throw new HttpError(400, "Проверете номера на поръчката и имейла.");
  }
  const number = body.orderNumber.trim();
  // Legacy email casing and the UUID suffix must still match. Escape ILIKE
  // metacharacters: '%' and '_' can be legitimate literal email characters.
  const email = body.email.trim().toLowerCase().replace(/[\\%_]/g, "\\$&");
  const { data: order, error } = await deps.db.from("orders")
    .select("order_number,status,total_amount,original_total_amount,currency,items,shipping_address,customer_phone,tracking_notes,estimated_delivery,created_at,payment_method,stripe_session_id,is_b2b_order")
    .ilike("order_number", number).ilike("customer_email", email)
    .eq("is_b2b_order", false).maybeSingle();
  if (error) throw new Error("Tracking lookup failed");
  if (!order) throw new HttpError(404, "Поръчка с този номер и имейл не е намерена.");
  const { data: payment, error: paymentError } = await deps.db.from("checkout_payments")
    .select("state,livemode").eq("order_number", order.order_number).maybeSingle();
  if (paymentError) throw new Error("Tracking payment lookup failed");
  if (payment && payment.livemode !== deps.config.live) throw new HttpError(404, "Поръчка с този номер и имейл не е намерена.");
  // Whitelist the existing customer-facing fields. Do not return customer email,
  // Stripe IDs, internal pricing/discount notes, ownership or payment credentials.
  return json({ order: {
    order_number: order.order_number, status: order.status, total_amount: order.total_amount,
    currency: order.currency, original_total_amount: order.original_total_amount,
    items: Array.isArray(order.items) ? order.items.map((item: Record<string, unknown>) => ({
      name: item.name, quantity: item.quantity,
      price: typeof item.unit_minor === "number" ? item.unit_minor / 100 : Number(item.price) || 0,
    })) : [],
    shipping_address: order.shipping_address ? {
      full_name: order.shipping_address.full_name, address: order.shipping_address.address,
      city: order.shipping_address.city, postal_code: order.shipping_address.postal_code,
    } : null,
    customer_phone: order.customer_phone, tracking_notes: order.tracking_notes,
    estimated_delivery: order.estimated_delivery, created_at: order.created_at,
    payment_method: order.payment_method || (order.stripe_session_id ? "stripe" : "cod"),
  }, paymentState: payment?.state || "unknown" }, 200, req, deps.config);
}
export default {
  fetch: async (req: Request) => {
    try {
      return await handleStatus(req, dependencies());
    } catch (error) {
      return failure(error);
    }
  },
};
