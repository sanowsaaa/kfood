import { createClient } from "@supabase/supabase-js";
import { handleStatus } from "../supabase/functions/checkout-status/index.ts";
import type { Dependencies } from "../supabase/functions/_shared/checkout.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
const config = { live: false, appUrl: "https://shop.invalid", origins: ["https://shop.invalid"], webhookSecret: "fixture", workerSecret: "fixture-worker-secret-with-32-characters" };
function fixture(options: { b2b?: boolean; live?: boolean; limited?: boolean; readError?: boolean; email?: string; number?: string } = {}) {
  const calls: { path: string; params: URLSearchParams; body: unknown }[] = [];
  const row = { order_number: options.number || "ORD-TEST-001", customer_email: options.email || "buyer@example.invalid", is_b2b_order: !!options.b2b,
    status: "shipped", total_amount: 35.63, original_total_amount: 37.5, currency: "EUR", payment_method: "stripe",
    stripe_session_id: "private-fixture-session", id: "private-owner-id", discount_notes: "private-notes",
    shipping_address: { full_name: "Тестов клиент", address: "Тестов адрес", city: "София", notes: "private-notes" },
    items: [{ name: "Рамен", quantity: 10, unit_minor: 375, line_minor: 3563, cost_price: 1 }], created_at: "2026-10-08T09:00:00Z" };
  const db = createClient("https://fixture.invalid", "fixture-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path: url.pathname, params: url.searchParams, body });
    if (url.pathname.endsWith("/rpc/checkout_rate_limit")) return new Response(JSON.stringify(!options.limited), { headers: { "Content-Type": "application/json" } });
    if (options.readError) return new Response(JSON.stringify({ message: "private database detail", code: "XX000" }), { status: 500, headers: { "Content-Type": "application/json" } });
    if (url.pathname.endsWith("/orders")) {
      const literalEmail = row.customer_email.toLowerCase().replace(/[\\%_]/g, "\\$&");
      const matches = url.searchParams.get("order_number")?.toLowerCase() === "ilike." + row.order_number.toLowerCase() &&
        url.searchParams.get("customer_email") === "ilike." + literalEmail && url.searchParams.get("is_b2b_order") === "eq.false" && !row.is_b2b_order;
      return new Response(JSON.stringify(matches ? [row] : []), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname.endsWith("/checkout_payments")) {
      equal(url.searchParams.get("order_number"), "eq." + row.order_number);
      return new Response(JSON.stringify([{ state: "paid", livemode: options.live ?? false }]), { headers: { "Content-Type": "application/json" } });
    }
    throw new Error("Unexpected external request");
  } } });
  return { deps: { config, db, stripe: {} } as unknown as Dependencies, calls };
}
const request = (email: unknown = "buyer@example.invalid", number = "ord-test-001") => new Request(config.appUrl, { method: "POST", headers: { Origin: config.appUrl }, body: JSON.stringify({ orderNumber: number, email }) });

Deno.test("guest tracking checks both credentials on the server and returns only customer-facing fields", async () => {
  const f = fixture(); const response = await handleStatus(request(" BUYER@example.invalid "), f.deps);
  equal(response.status, 200); equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json(); equal(result.paymentState, "paid"); equal(result.order.items[0], { name: "Рамен", quantity: 10, price: 3.75 });
  equal(result.order.total_amount, 35.63); equal(result.order.original_total_amount, 37.5);
  for (const key of ["id", "customer_email", "stripe_session_id", "discount_notes", "is_b2b_order"]) equal(key in result.order, false);
  equal("notes" in result.order.shipping_address, false);
  equal(f.calls.filter(c => c.path.includes("/rpc/")).map(c => (c.body as Record<string, unknown>).p_window_seconds), [60,600]);
  equal(f.calls.filter(c => c.path.includes("/rpc/")).every(c => c.path.endsWith("/checkout_rate_limit")), true);
});
Deno.test("wrong email, B2B orders and a different payment mode have the same unavailable response", async () => {
  for (const [options, email] of [[{}, "other@example.invalid"], [{ b2b: true }, "buyer@example.invalid"], [{ live: true }, "buyer@example.invalid"]] as const) {
    const f = fixture(options); const response = await handleStatus(request(email), f.deps); equal(response.status, 404);
    equal(await response.json(), { error: "Поръчка с този номер и имейл не е намерена." });
  }
});
Deno.test("invalid tracking input and exhausted rate limits never read orders", async () => {
  for (const input of [null, [], "buyer@invalid"]) {
    const f = fixture(); equal((await handleStatus(request(input), f.deps)).status, 400);
    equal(f.calls.some(c => c.path.endsWith("/orders")), false);
  }
  const f = fixture({ limited: true }); equal((await handleStatus(request(), f.deps)).status, 429);
  equal(f.calls.some(c => c.path.endsWith("/orders")), false);
});
Deno.test("tracking database failure returns a temporary error without leaking database details", async () => {
  const f = fixture({ readError: true }); const response = await handleStatus(request(), f.deps);
  equal(response.status, 503); equal((await response.text()).includes("private"), false);
});
Deno.test("tracking retains mixed-case legacy credentials and UUID order suffixes without email wildcard matching", async () => {
  const number = "ORD-20261008-a1b2c3d4e5f64789a1b2c3d4e5f64789";
  const f = fixture({ number, email: "Buyer_Tag%@EXAMPLE.invalid" });
  const response = await handleStatus(request("Buyer_Tag%@example.invalid", number.toUpperCase()), f.deps);
  equal(response.status, 200); equal((await response.json()).order.order_number, number);
  equal(f.calls.find(call => call.path.endsWith("/orders"))?.params.get("customer_email"), "ilike.buyer\\_tag\\%@example.invalid");
  const wrong = await handleStatus(request("BuyerTag@example.invalid", number), f.deps);
  equal(wrong.status, 404);
});
