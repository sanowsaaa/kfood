// Cross-handler contract probe. Uses the real Supabase client with intercepted
// HTTP calls and a synthetic Stripe Session. Never contacts a real service.
import { createClient } from "@supabase/supabase-js";
import { applySession, type Dependencies } from "../supabase/functions/_shared/checkout.ts";
import { handleStatus } from "../supabase/functions/checkout-status/index.ts";
import type Stripe from "stripe";

let shipping: Record<string, unknown> | null = null;
const config = { live: false, appUrl: "https://example.invalid", origins: ["https://example.invalid"],
  webhookSecret: "synthetic", workerSecret: "synthetic-worker-value-at-least-32-characters" };
const db = createClient("https://example.invalid", "synthetic", {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const reply = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    if (url.pathname.endsWith("/rpc/checkout_apply_event")) { shipping = body.p_shipping; return reply({ decision: "applied" }); }
    if (url.pathname.endsWith("/rpc/checkout_rate_limit")) return reply(true);
    if (url.pathname.endsWith("/orders")) return reply({ order_number: "ORD-SYNTHETIC",status:"confirmed",total_amount:16,currency:"EUR",items:[],shipping_address:shipping,payment_method:"stripe",is_b2b_order:false });
    if (url.pathname.endsWith("/checkout_payments")) return reply({ state: "paid",livemode:false });
    throw new Error("Unexpected request in offline audit: " + url.pathname);
  } },
});
const deps = { config, db, stripe: {} as Stripe };
const session = { id:"cs_test_synthetic",mode:"payment",livemode:false,amount_total:1600,currency:"eur",status:"complete",payment_status:"paid",
  metadata:{checkout_version:"1",order_id:"30000000-0000-4000-8000-000000000001",attempt_id:"40000000-0000-4000-8000-000000000001",order_number:"ORD-SYNTHETIC"},
  collected_information:{shipping_details:{name:"Synthetic Recipient",address:{line1:"Synthetic address",city:"Sofia",postal_code:"1000",country:"BG"}}},
  payment_intent:{status:"succeeded",latest_charge:{amount_refunded:0,disputed:false}},
} as unknown as Stripe.Checkout.Session;
await applySession(deps as Dependencies,session,"evt_synthetic","checkout.session.completed");
const response=await handleStatus(new Request("https://example.invalid/status", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber:"ORD-SYNTHETIC",email:"buyer@example.invalid"})}),deps);
const result=await response.json();
const ok=response.status===200&&result.order?.shipping_address?.full_name==="Synthetic Recipient";
console.log(JSON.stringify({scope:"Offline actual handler-to-handler contract",findings:[{id:"CONTRACT01",status:ok?"PASS":"BLOCKED",expectation:"Stripe recipient name remains visible in guest tracking and the existing administrator full_name field",evidence:{responseStatus:response.status,storedShippingKeys:Object.keys(shipping||{}),trackingShipping:result.order?.shipping_address}}],summary:{passed:ok?1:0,blocked:ok?0:1,errors:0}},null,2));
if(!ok)Deno.exit(1);
