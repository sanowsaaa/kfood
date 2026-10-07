import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TOKEN = /^[0-9a-f]{64}$/;
export type Config = {
  live: boolean;
  appUrl: string;
  origins: string[];
  webhookSecret: string;
  workerSecret: string;
};
export type Dependencies = { db: SupabaseClient; stripe: Stripe; config: Config };
export type QuoteLine = {
  id: number;
  name: string;
  quantity: number;
  unit_minor: number;
  line_minor: number;
};
export type Payment = {
  order_id: string;
  attempt_id: string;
  order_number: string;
  state: string;
  total_minor: number;
  discount_percent: number;
  line_items: QuoteLine[];
  customer_email: string;
  customer_phone: string;
  livemode: boolean;
  session_id: string | null;
  stripe_url: string | null;
  expires_at: string;
  return_origin: string;
  integration_suffix: string;
};
export type CheckoutInput = {
  attemptId: string;
  statusToken: string;
  items: { id: number; quantity: number }[];
  customerEmail: string;
  customerPhone: string;
  expectedTotalMinor: number;
};

export function checkEnvironment(mode: string, environment: string, url: string) {
  const productionHost = "quqlovoiwgqfmgjumpgd.supabase.co";
  const host = new URL(url).hostname;
  if (environment !== "production" && environment !== "staging") {
    throw new Error("Invalid CHECKOUT_ENVIRONMENT");
  }
  if (
    (environment === "production" && (mode !== "live" || host !== productionHost)) ||
    (environment === "staging" && (mode !== "test" || host === productionHost))
  ) {
    throw new Error("Checkout environment and Stripe mode mismatch");
  }
}

export function dependencies(): Dependencies {
  const env = (key: string) => {
    const value = Deno.env.get(key);
    if (!value) throw new Error(`Missing configuration: ${key}`);
    return value;
  };
  const mode = env("STRIPE_MODE");
  if (mode !== "live" && mode !== "test") throw new Error("Invalid STRIPE_MODE");
  const supabaseUrl = env("SUPABASE_URL");
  checkEnvironment(mode, env("CHECKOUT_ENVIRONMENT"), supabaseUrl);
  const key = env("STRIPE_SECRET_KEY");
  if (
    !key.startsWith(mode === "live" ? "sk_live_" : "sk_test_") &&
    !key.startsWith(mode === "live" ? "rk_live_" : "rk_test_")
  ) {
    throw new Error("Stripe key mode mismatch");
  }
  const app = new URL(env("CHECKOUT_APP_URL"));
  if (
    app.pathname !== "/" || app.search || app.hash || app.username || app.password ||
    (app.protocol !== "https:" && (mode === "live" || app.hostname !== "localhost"))
  ) {
    throw new Error("Invalid CHECKOUT_APP_URL");
  }
  const workerSecret = env("CHECKOUT_WORKER_SECRET");
  if (workerSecret.length < 32) throw new Error("Worker secret must have at least 32 characters");
  return {
    db: createClient(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(12_000)])
              : AbortSignal.timeout(12_000),
          }),
      },
    }),
    stripe: new Stripe(key, {
      apiVersion: "2026-09-30.endive",
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 1,
      timeout: 8_000,
    }),
    config: {
      live: mode === "live",
      appUrl: app.origin,
      workerSecret,
      origins: [
        app.origin,
        ...(Deno.env.get("CHECKOUT_ALLOWED_ORIGINS") || "").split(",")
          .map((v) => v.trim()).filter(Boolean),
      ],
      webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
    },
  };
}

export function headers(req?: Request, config?: Config): HeadersInit {
  const origin = req?.headers.get("origin");
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...(origin && config?.origins.includes(origin)
      ? {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }
      : {}),
  };
}
export function json(body: unknown, status = 200, req?: Request, config?: Config) {
  return new Response(JSON.stringify(body), { status, headers: headers(req, config) });
}
export function checkRequest(req: Request, config: Config): Response | undefined {
  const origin = req.headers.get("origin");
  if (origin && !config.origins.includes(origin)) throw new HttpError(403, "Forbidden origin");
  if (req.method === "OPTIONS") return json({}, 200, req, config);
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
}
export async function boundedText(req: Request, limit = 65_536): Promise<string> {
  if (Number(req.headers.get("content-length")) > limit) {
    throw new HttpError(413, "Request too large");
  }
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.length;
    if (length > limit) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(next.value);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(result);
}
export async function bodyJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = JSON.parse(await boundedText(req));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Невалидна заявка");
  }
}
export function validateInput(value: Record<string, unknown>): CheckoutInput {
  if (
    typeof value.attemptId !== "string" || !UUID.test(value.attemptId) ||
    typeof value.statusToken !== "string" || !TOKEN.test(value.statusToken)
  ) {
    throw new HttpError(400, "Невалиден опит за плащане");
  }
  // Existing game codes can be forged through the public Data API. They must be
  // reworked before this checkout accepts them; never accept a browser percentage.
  if (
    value.promoCode ||
    (value.promoDiscountPercent !== undefined && value.promoDiscountPercent !== 0)
  ) {
    throw new HttpError(
      409,
      "Промо кодовете временно не се приемат за плащане с карта. Премахнете кода, за да продължите.",
    );
  }
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 50) {
    throw new HttpError(400, "Допустими са от 1 до 50 различни продукта");
  }
  const ids = new Set<number>();
  const items = value.items.map((item: { id?: unknown; quantity?: unknown } | null) => {
    if (
      !item || !Number.isSafeInteger(item.id) || Number(item.id) < 1 ||
      Number(item.id) > 2_147_483_647 ||
      !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 ||
      Number(item.quantity) > 100 ||
      ids.has(Number(item.id))
    ) throw new HttpError(400, "Невалидни продукти или количества");
    ids.add(Number(item.id));
    return { id: Number(item.id), quantity: Number(item.quantity) };
  }).sort((a, b) => a.id - b.id);
  const customerEmail = typeof value.customerEmail === "string"
    ? value.customerEmail.trim().toLowerCase()
    : "";
  const customerPhone = typeof value.customerPhone === "string"
    ? value.customerPhone.replace(/\s/g, "")
    : "";
  if (
    customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
    !/^(\+359\d{8,9}|0\d{9})$/.test(customerPhone)
  ) {
    throw new HttpError(400, "Невалидни данни за връзка");
  }
  if (!Number.isSafeInteger(value.expectedTotalMinor) || Number(value.expectedTotalMinor) < 1) {
    throw new HttpError(400, "Невалидна очаквана сума");
  }
  return {
    attemptId: value.attemptId.toLowerCase(),
    statusToken: value.statusToken,
    items,
    customerEmail,
    customerPhone,
    expectedTotalMinor: Number(value.expectedTotalMinor),
  };
}
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function lineItems(lines: QuoteLine[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  // Split quantities into at most two adjacent cent prices. The total is exact,
  // including basket discounts whose line total is not divisible by quantity.
  return lines.flatMap((line) => {
    const unit = Math.floor(line.line_minor / line.quantity);
    const extra = line.line_minor % line.quantity;
    if (unit < 0) throw new Error("Invalid quoted unit price");
    return [{ cents: unit, quantity: line.quantity - extra }, { cents: unit + 1, quantity: extra }]
      .filter((part) => part.quantity > 0).map((part) => ({
        price_data: {
          currency: "eur",
          unit_amount: part.cents,
          product_data: {
            name: line.name.slice(0, 127),
            metadata: { product_id: String(line.id) },
          },
        },
        quantity: part.quantity,
      }));
  });
}
export async function limited(req: Request, deps: Dependencies, scope: string, count: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = await sha256(`${deps.config.workerSecret}:${scope}:${ip}`);
  const { data, error } = await deps.db.rpc("checkout_rate_limit", {
    p_bucket: bucket,
    p_limit: count,
    p_window_seconds: 60,
  });
  if (error) throw new Error("Rate limit storage unavailable");
  if (!data) throw new HttpError(429, "Твърде много заявки. Опитайте след минута.");
}
export function failure(error: unknown, req?: Request, config?: Config) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status, req, config);
  // Avoid logging Stripe objects, request bodies, customer data or secrets.
  console.error("checkout operation failed");
  return json({ error: "Временен проблем. Опитайте отново със същата поръчка." }, 503, req, config);
}

export const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);
export async function retrieveSession(deps: Dependencies, id: string) {
  return await deps.stripe.checkout.sessions.retrieve(id, {
    expand: ["payment_intent.latest_charge"],
  });
}
export async function applySession(
  deps: Dependencies,
  session: Stripe.Checkout.Session,
  eventId: string,
  eventType: string,
) {
  if (session.livemode !== deps.config.live || session.mode !== "payment") {
    throw new HttpError(400, "Stripe session mode mismatch");
  }
  const metadata = session.metadata || {};
  const orderId = metadata.checkout_version === "1" && UUID.test(metadata.order_id || "")
    ? metadata.order_id
    : null;
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const intent = session.payment_intent && typeof session.payment_intent !== "string"
    ? session.payment_intent
    : null;
  const charge = intent?.latest_charge && typeof intent.latest_charge !== "string"
    ? intent.latest_charge
    : null;
  const { data, error } = await deps.db.rpc("checkout_apply_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_session_id: session.id,
    p_order_id: orderId,
    p_attempt_id: metadata.attempt_id || "",
    p_order_number: metadata.order_number || "",
    p_livemode: session.livemode,
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_session_status: session.status,
    p_payment_status: session.payment_status,
    p_shipping: address
      ? {
        name: shipping?.name,
        address: [address.line1, address.line2].filter(Boolean).join(", "),
        city: address.city,
        postal_code: address.postal_code,
        country: address.country,
      }
      : null,
    p_billing: session.customer_details?.address || null,
    p_intent_status: intent?.status || null,
    p_refunded: charge?.amount_refunded ?? null,
    p_disputed: charge?.disputed ?? null,
  });
  if (error) throw new Error("Payment transaction failed");
  return data as { decision: string };
}
