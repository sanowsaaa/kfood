const assert = Object.assign((value: unknown) => {
  if (!value) throw new Error("Assertion failed");
}, {
  equal: (a: unknown, b: unknown) => {
    if (a !== b) throw new Error(`Expected ${String(a)} to equal ${String(b)}`);
  },
  notEqual: (a: unknown, b: unknown) => {
    if (a === b) throw new Error("Values should differ");
  },
  deepEqual: (a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("Values differ");
  },
  throws: (fn: () => unknown) => {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw) throw new Error("Expected rejection");
  },
});
import Stripe from "stripe";
import { handleCheckout } from "../supabase/functions/create-checkout/index.ts";
import { handleWebhook } from "../supabase/functions/stripe-webhook/index.ts";
import { handleStatus } from "../supabase/functions/checkout-status/index.ts";
import { handleReconcile } from "../supabase/functions/reconcile-checkouts/index.ts";
import retired from "../supabase/functions/update-stripe-order/index.ts";
import {
  checkEnvironment,
  type Dependencies,
  lineItems,
  sha256,
  validateInput,
} from "../supabase/functions/_shared/checkout.ts";
import { clearCheckoutAttempt, getCheckoutAttempt } from "../src/utils/checkoutAttempt.ts";

const input = () => ({
  attemptId: crypto.randomUUID(),
  statusToken: "a".repeat(64),
  items: [{ id: 1, quantity: 4 }],
  customerEmail: "buyer@example.invalid",
  customerPhone: "0899123456",
  expectedTotalMinor: 1596,
});
const config = {
  live: false,
  appUrl: "https://example.invalid",
  origins: ["https://example.invalid"],
  webhookSecret: "fixture-signing-secret",
  workerSecret: "fixture-worker-secret-with-32-characters",
};
const stripe = new Stripe("fixture-key", {
  httpClient: Stripe.createFetchHttpClient(),
  maxNetworkRetries: 0,
});
const session = (extra: Record<string, unknown> = {}) => ({
  id: "cs_fixture_1",
  object: "checkout.session",
  livemode: false,
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  amount_total: 1596,
  currency: "eur",
  payment_intent: { status: "succeeded", latest_charge: { amount_refunded: 0, disputed: false } },
  metadata: {
    checkout_version: "1",
    order_id: "40000000-0000-4000-8000-000000000001",
    attempt_id: "40000000-0000-4000-8000-000000000002",
    order_number: "ORD-fixture",
  },
  ...extra,
});
function deps(
  rpc: (name: string, params: Record<string, unknown>) => unknown,
  retrieve: () => unknown = () => session(),
): Dependencies {
  return {
    config,
    db: { rpc } as unknown as Dependencies["db"],
    stripe: {
      webhooks: stripe.webhooks,
      checkout: { sessions: { retrieve } },
    } as unknown as Stripe,
  };
}
async function signed(
  {
    type = "checkout.session.completed",
    live = false,
    account,
    timestamp,
    secret = config.webhookSecret,
    alter = false,
  }: {
    type?: string;
    live?: boolean;
    account?: string;
    timestamp?: number;
    secret?: string;
    alter?: boolean;
  } = {},
) {
  const raw = JSON.stringify({
    id: "evt_fixture",
    object: "event",
    type,
    livemode: live,
    account,
    data: { object: session({ payment_status: "unpaid" }) },
  });
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({
    payload: raw,
    secret,
    timestamp,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  return new Request("https://example.invalid/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: alter ? `${raw} ` : raw,
  });
}
Deno.test("invalid, absent, altered and stale signatures cannot read Stripe or write the DB", async () => {
  let reads = 0;
  let writes = 0;
  const d = deps(() => {
    writes++;
    return { data: {} };
  }, () => {
    reads++;
    return session();
  });
  for (
    const request of [
      new Request("https://example.invalid", { method: "POST", body: "{}" }),
      await signed({ secret: "wrong-secret" }),
      await signed({ alter: true }),
      await signed({ timestamp: 1 }),
    ]
  ) {
    assert.equal((await handleWebhook(request, d)).status, 400);
  }
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});
Deno.test("test/live and connected-account mismatches fail before any side effects", async () => {
  let calls = 0;
  const d = deps(() => {
    calls++;
    return { data: {} };
  });
  assert.equal((await handleWebhook(await signed({ live: true }), d)).status, 400);
  assert.equal((await handleWebhook(await signed({ account: "acct_unrelated" }), d)).status, 400);
  assert.equal(calls, 0);
});
Deno.test("signed snapshot uses current Stripe data and ACK follows the committed RPC", async () => {
  let committed = false;
  const d = deps(async (name, p) => {
    assert.equal(name, "checkout_apply_event");
    assert.equal(p.p_payment_status, "paid");
    assert.equal(p.p_amount, 1596);
    assert.equal(p.p_order_id, session().metadata.order_id);
    await Promise.resolve();
    committed = true;
    return { data: { decision: "applied" }, error: null };
  });
  assert.equal((await handleWebhook(await signed(), d)).status, 200);
  assert(committed);
});
Deno.test("database and Stripe failures return retryable responses; unsupported events have no effects", async () => {
  assert.equal(
    (await handleWebhook(await signed(), deps(() => ({ error: { message: "fixture" } })))).status,
    503,
  );
  assert.equal(
    (await handleWebhook(
      await signed(),
      deps(() => {
        throw new Error("must not call");
      }, () => {
        throw new Error("fixture");
      }),
    )).status,
    503,
  );
  assert.equal(
    (await handleWebhook(
      await signed({ type: "customer.created" }),
      deps(() => {
        throw new Error("must not call");
      }),
    )).status,
    200,
  );
});
Deno.test("input rejects fractional, duplicate, negative and oversized quantities and forged discounts", () => {
  for (
    const patch of [
      { items: [{ id: 1, quantity: 1.5 }] },
      { items: [{ id: 1, quantity: 4 }, { id: 1, quantity: 4 }] },
      { items: [{ id: 1, quantity: -1 }] },
      { items: [{ id: 1, quantity: 101 }] },
      { items: [null] },
      { items: Array.from({ length: 51 }, (_, i) => ({ id: i + 1, quantity: 1 })) },
      { promoDiscountPercent: 90 },
      { promoCode: "FORGED" },
      { customerEmail: "bad" },
      { statusToken: "guess" },
    ]
  ) assert.throws(() => validateInput({ ...input(), ...patch }));
  assert.equal(
    validateInput({ ...input(), customerEmail: " Buyer@Example.invalid " }).customerEmail,
    "buyer@example.invalid",
  );
});
Deno.test("Stripe line item encoding preserves each quoted cent at arbitrary quantities", () => {
  for (let quantity = 1; quantity <= 100; quantity++) {
    for (
      const lineMinor of [0, quantity - 1, quantity * 99, quantity * 103 + 17, quantity * 399 - 1]
    ) {
      const lines = lineItems([{
        id: 1,
        name: "Kimchi",
        quantity,
        unit_minor: 399,
        line_minor: lineMinor,
      }]);
      assert.equal(
        lines.reduce((n, l) => n + Number(l.price_data?.unit_amount) * Number(l.quantity), 0),
        lineMinor,
      );
      assert.equal(lines.reduce((n, l) => n + Number(l.quantity), 0), quantity);
      assert(lines.length <= 2);
    }
  }
});
Deno.test("real Stripe SDK request uses persisted quote and stable idempotency on ambiguous retry", async () => {
  const journal: string[] = [];
  const requests: { key: string | null; params: URLSearchParams }[] = [];
  const i = input();
  const p = {
    order_id: session().metadata.order_id,
    attempt_id: i.attemptId,
    order_number: "ORD-fixture",
    state: "pending",
    total_minor: 1596,
    discount_percent: 0,
    livemode: false,
    customer_email: i.customerEmail,
    customer_phone: i.customerPhone,
    line_items: [{ id: 1, name: "Kimchi", quantity: 4, unit_minor: 399, line_minor: 1596 }],
    session_id: null,
    stripe_url: null,
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    return_origin: config.appUrl,
    integration_suffix: "abcdefgh",
  };
  const api = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen: () => {} }, async (req) => {
    journal.push("stripe");
    requests.push({
      key: req.headers.get("idempotency-key"),
      params: new URLSearchParams(await req.text()),
    });
    return Response.json(
      session({
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/fixture",
      }),
    );
  });
  try {
    let attachments = 0;
    const d = {
      config,
      stripe: new Stripe("fixture-key", {
        host: "127.0.0.1",
        port: api.addr.port,
        protocol: "http",
        httpClient: Stripe.createFetchHttpClient(),
        maxNetworkRetries: 0,
        telemetry: false,
      }),
      db: {
        rpc: (name: string) => {
          journal.push(name);
          if (name === "checkout_rate_limit") return { data: true, error: null };
          if (name === "checkout_prepare") return { data: structuredClone(p), error: null };
          // Simulate a lost attachment response, then retry exactly the same attempt.
          if (++attachments === 1) return { error: { message: "fixture lost response" } };
          return { data: null, error: null };
        },
      } as unknown as Dependencies["db"],
    };
    const request = () =>
      new Request(config.appUrl, {
        method: "POST",
        headers: { origin: config.appUrl, "content-type": "application/json" },
        body: JSON.stringify(i),
      });
    assert.equal((await handleCheckout(request(), d)).status, 503);
    const response = await handleCheckout(request(), d);
    assert.equal(response.status, 200);
    assert(journal.indexOf("checkout_prepare") < journal.indexOf("stripe"));
    assert.equal(requests.length, 2);
    assert.equal(requests[0].key, requests[1].key);
    assert.equal(requests[0].params.toString(), requests[1].params.toString());
    assert(
      !Array.from(requests[0].params.keys()).some((k) => k.startsWith("payment_method_types")),
    );
    assert.equal(requests[0].params.get("metadata[order_id]"), p.order_id);
    assert.equal(requests[0].params.get("line_items[0][price_data][unit_amount]"), "399");
    assert.equal(requests[0].params.get("adaptive_pricing[enabled]"), "false");
  } finally {
    await api.shutdown();
  }
});
Deno.test("guest status is read only and needs the exact hashed order proof", async () => {
  const equals: Record<string, unknown> = {};
  let rpcCalls = 0;
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => {
      equals[key] = value;
      return query;
    },
    maybeSingle: () => ({
      data: equals.status_token_hash === undefined
        ? null
        : { order_number: "ORD-fixture", state: "paid", total_minor: 1596, livemode: false },
    }),
  };
  const d = {
    config,
    stripe,
    db: {
      rpc: () => {
        rpcCalls++;
        return { data: true };
      },
      from: () => query,
    } as unknown as Dependencies["db"],
  };
  const response = await handleStatus(
    new Request(config.appUrl, {
      method: "POST",
      body: JSON.stringify({ orderNumber: "ORD-fixture", statusToken: "a".repeat(64) }),
    }),
    d,
  );
  assert.equal(response.status, 200);
  assert.equal(equals.status_token_hash, await sha256("a".repeat(64)));
  const body = await response.json();
  assert.equal(body.paymentState, "paid");
  assert(!("customer_email" in body));
  assert.equal(rpcCalls, 1); // Only the rate limit; no order/payment mutation.
});
Deno.test("public callers cannot use reconciliation or the retired order updater", async () => {
  let privileged = 0;
  const d = {
    config,
    stripe,
    db: {
      auth: { getUser: () => ({ data: { user: null }, error: { message: "invalid" } }) },
      from: () => {
        privileged++;
        throw new Error("must not read");
      },
    } as unknown as Dependencies["db"],
  };
  assert.equal(
    (await handleReconcile(new Request(config.appUrl, { method: "POST", body: "{}" }), d)).status,
    401,
  );
  assert.equal(
    (await handleReconcile(
      new Request(config.appUrl, {
        method: "POST",
        headers: { authorization: "Bearer expired" },
        body: "{}",
      }),
      d,
    )).status,
    401,
  );
  assert.equal(privileged, 0);
  assert.equal(retired.fetch().status, 410);
});
Deno.test("browser retry credentials survive an ambiguous result and rotate for changed baskets", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  } as unknown as Storage;
  const first = getCheckoutAttempt("basket-a", storage, 1_000_000);
  assert.deepEqual(getCheckoutAttempt("basket-a", storage, 1_000_001), first);
  assert.notEqual(getCheckoutAttempt("basket-b", storage, 1_000_002).id, first.id);
  assert.notEqual(getCheckoutAttempt("basket-a", storage, 1_000_000 + 66 * 60_000).id, first.id);
  assert.throws(() =>
    getCheckoutAttempt("basket-c", {
      ...storage,
      setItem: () => {
        throw new Error("storage blocked");
      },
    }, 1_000_001)
  );
});
Deno.test("confirmed terminal orders permit a new purchase without clearing a newer attempt", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as unknown as Storage;
  const first = getCheckoutAttempt("same-basket", storage, 1_000_000);
  clearCheckoutAttempt("another-order-token", storage);
  assert.equal(getCheckoutAttempt("same-basket", storage, 1_000_001).id, first.id);
  clearCheckoutAttempt(first.token, storage);
  const next = getCheckoutAttempt("same-basket", storage, 1_000_002);
  assert.notEqual(next.id, first.id);
  clearCheckoutAttempt(first.token, storage);
  assert.equal(getCheckoutAttempt("same-basket", storage, 1_000_003).id, next.id);
});
Deno.test("a test payment configuration cannot target the production Supabase project", () => {
  assert.throws(() =>
    checkEnvironment("test", "staging", "https://quqlovoiwgqfmgjumpgd.supabase.co")
  );
  assert.throws(() =>
    checkEnvironment("test", "production", "https://quqlovoiwgqfmgjumpgd.supabase.co")
  );
  assert.throws(() => checkEnvironment("live", "staging", "https://staging.supabase.co"));
  checkEnvironment("live", "production", "https://quqlovoiwgqfmgjumpgd.supabase.co");
  checkEnvironment("test", "staging", "https://staging.supabase.co");
});
