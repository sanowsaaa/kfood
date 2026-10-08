import { handleB2BAuth } from "../supabase/functions/b2b-auth/index.ts";
import { handleB2BCheckout } from "../supabase/functions/create-b2b-checkout/index.ts";
import retired from "../supabase/functions/generate-b2b-invoice/index.ts";
import { type B2BDependencies, b2bMail } from "../supabase/functions/_shared/b2b.ts";
import { b2bRequestAttempt, finishB2BAttempt } from "../src/utils/b2bAttempt.ts";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`Expected ${JSON.stringify(a)} to equal ${JSON.stringify(b)}`);
  }
}
function ok(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
const userId = "40000000-0000-4000-8000-000000000001";
const companyId = "50000000-0000-4000-8000-000000000001";
const orderId = "60000000-0000-4000-8000-000000000001";
const attemptId = "70000000-0000-4000-8000-000000000001";
const user = {
  id: userId,
  email: "partner@example.invalid",
  email_confirmed_at: new Date().toISOString(),
};
const payload = () => ({
  b2b_company_id: companyId,
  attemptId,
  customer_email: user.email,
  customer_phone: "0899123456",
  items: [{ id: 1, quantity: 12, price: 0.01, name: "Forged" }],
  total_amount: 0.01,
  company_name: "Forged company",
  shipping_address: {
    full_name: "Partner",
    city: "Veliko Tarnovo",
    address: "Test address",
    postal_code: "5000",
    notes: "<script>evil</script>",
  },
});
function post(body: unknown, token = "real-token", origin = "https://k-foodvelikotarnovo.com") {
  return new Request("https://example.invalid/b2b", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, origin },
    body: JSON.stringify(body),
  });
}
function fixture({ bound = true, mailStatus = 200, role = "partner", allowed = true } = {}) {
  const company = {
    id: companyId,
    company_name: "Company <name>",
    email: user.email,
    status: "active",
    user_id: bound ? userId : null,
    internal_notes: "private",
  };
  const order = {
    id: orderId,
    order_number: "B2B-fixture",
    customer_email: user.email,
    customer_phone: "0899123456",
    total_amount: 19.99,
    shipping_address: payload().shipping_address,
    items: [{ name: "Real <item>", quantity: 12, price: 19.99 / 12, line_total_minor: 1999 }],
  };
  const snapshot = { order, company_name: company.company_name };
  const saved = {
    order,
    company_name: company.company_name,
    notification_snapshot: snapshot,
    notification_sent_at: null as string | null,
    request_created_at: new Date().toISOString(),
  };
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  const mails: Record<string, unknown>[] = [];
  const passwords: string[] = [];
  const selections: string[] = [];
  let committed = false;
  const session = { access_token: "fixture-access-token", refresh_token: "fixture-refresh-token" };
  const auth = {
    getUser: (token: string) =>
      Promise.resolve({ data: { user: token === "real-token" ? user : null }, error: null }),
    signInWithPassword: ({ password }: { password: string }) => {
      passwords.push(password);
      return Promise.resolve({ data: { user, session }, error: null });
    },
    verifyOtp: ({ token }: { token: string }) =>
      Promise.resolve(
        token === "123456"
          ? { data: { user, session }, error: null }
          : { data: { user: null, session: null }, error: { message: "Invalid OTP" } },
      ),
    updateUser: ({ password }: { password: string }) => {
      passwords.push(password);
      return Promise.resolve({ error: null });
    },
  };
  function from(table: string) {
    let fields = "", mutation: Record<string, unknown> | undefined;
    const filters: [string, unknown][] = [];
    function resolve() {
      if (mutation) {
        saved.notification_sent_at = String(mutation.notification_sent_at);
        return { data: null, error: null };
      }
      const source = table === "b2b_companies"
        ? company
        : table === "user_roles"
        ? { user_id: userId, role }
        : {
          order_id: orderId,
          notification_snapshot: snapshot,
          notification_sent_at: saved.notification_sent_at,
          created_at: saved.request_created_at,
        };
      if (!filters.every(([k, v]) => (source as Record<string, unknown>)[k] === v)) {
        return { data: null, error: null };
      }
      const data = Object.fromEntries(
        fields.split(",").map((k) => [k, (source as Record<string, unknown>)[k]]),
      );
      return { data, error: null };
    }
    const q = {
      select: (s: string) => {
        fields = s;
        selections.push(s);
        return q;
      },
      eq: (k: string, v: unknown) => {
        filters.push([k, v]);
        return q;
      },
      update: (m: Record<string, unknown>) => {
        mutation = m;
        return q;
      },
      maybeSingle: () => Promise.resolve(resolve()),
      then: (fn: (result: unknown) => unknown) => Promise.resolve(resolve()).then(fn),
    };
    return q;
  }
  const d = {
    db: {
      from,
      rpc: async (name: string, params: Record<string, unknown>) => {
        calls.push({ name, params });
        if (name === "b2b_rate_limit") return { data: allowed, error: null };
        if (name === "b2b_activate_company") {
          company.user_id = userId;
          return { data: null, error: null };
        }
        await Promise.resolve();
        committed = true;
        return { data: saved, error: null };
      },
      auth: {
        admin: {
          generateLink: () =>
            Promise.resolve({ data: { properties: { email_otp: "123456" } }, error: null }),
        },
      },
    },
    auth: { auth },
    resendKey: "fixture-key",
    resendDomain: "example.invalid",
    bossEmail: "boss@example.invalid",
    mail: async (_input: unknown, init: RequestInit) => {
      const data = JSON.parse(String(init.body));
      mails.push({ ...data, key: new Headers(init.headers).get("Idempotency-Key"), committed });
      return new Response(
        JSON.stringify(mailStatus === 200 ? { id: "mail-fixture" } : { error: "unavailable" }),
        { status: mailStatus },
      );
    },
  } as unknown as B2BDependencies;
  return { d, calls, mails, passwords, selections, company, saved };
}

Deno.test("invoice endpoint is retired for every method without database or email dependencies", async () => {
  for (const method of ["GET", "POST", "OPTIONS"]) {
    equal((await retired.fetch(new Request("https://example.invalid", { method }))).status, 410);
  }
});
Deno.test("B2B orders reject anonymous tokens, unrelated companies and invalid quantities before creation", async () => {
  const f = fixture();
  equal((await handleB2BCheckout(post(payload(), "anon-key"), f.d)).status, 401);
  equal(
    (await handleB2BCheckout(post({ ...payload(), b2b_company_id: crypto.randomUUID() }), f.d))
      .status,
    403,
  );
  for (
    const items of [
      [{ id: 1, quantity: 1.5 }],
      [{ id: 1, quantity: 12 }, { id: 1, quantity: 12 }],
      [],
    ]
  ) {
    equal((await handleB2BCheckout(post({ ...payload(), items }), f.d)).status, 400);
  }
  equal(f.calls.filter((x) => x.name === "b2b_create_request").length, 0);
  equal(f.mails.length, 0);
});
Deno.test("order notification follows the committed server quote, preserves recipient/settings and escapes content", async () => {
  const f = fixture();
  const response = await handleB2BCheckout(post(payload()), f.d);
  equal(response.status, 200);
  equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json();
  equal(result.total_amount, 19.99);
  equal(result.email_sent, true);
  const call = f.calls.find((x) => x.name === "b2b_create_request")!;
  equal(call.params.p_items, [{ id: 1, quantity: 12 }]);
  equal(call.params.p_user_id, userId);
  equal(call.params.p_attempt_id, attemptId);
  equal(f.mails[0].to, ["boss@example.invalid"]);
  equal(f.mails[0].from, "K-FOOD <noreply@example.invalid>");
  equal(f.mails[0].key, "kfood-b2b-order-" + orderId);
  equal(f.mails[0].committed, true);
  ok(String(f.mails[0].html).includes("19.99 €"));
  ok(String(f.mails[0].html).includes("Real &lt;item&gt;"));
  ok(!String(f.mails[0].html).includes("<script>"));
  ok(!String(f.mails[0].html).includes("Forged"));
  await handleB2BCheckout(post(payload()), f.d);
  equal(f.mails.length, 1);
});
Deno.test("Resend failure retains a successful order and staff retry sends the same immutable message", async () => {
  const f = fixture({ mailStatus: 503, role: "admin" });
  const first = await (await handleB2BCheckout(post(payload()), f.d)).json();
  equal(first.success, true);
  equal(first.order_id, orderId);
  equal(first.email_sent, false);
  // A later admin edit cannot change the body associated with the Resend key.
  f.saved.order = { ...f.saved.order, total_amount: 1, items: [] };
  const retry = await handleB2BCheckout(
    post({ mode: "resend_notification", order_id: orderId }),
    f.d,
  );
  equal(retry.status, 200);
  equal(f.mails.length, 2);
  equal(f.mails[0].html, f.mails[1].html);
  equal(f.mails[0].key, f.mails[1].key);
  equal(f.calls.filter((c) => c.name === "b2b_create_request").length, 1);
});
Deno.test("partner cannot invoke the staff notification retry; old uncertain deliveries require manual review", async () => {
  const f = fixture();
  equal(
    (await handleB2BCheckout(post({ mode: "resend_notification", order_id: orderId }), f.d)).status,
    403,
  );
  f.saved.request_created_at = new Date(Date.now() - 21 * 3600_000).toISOString();
  const result = await (await handleB2BCheckout(post(payload()), f.d)).json();
  equal(result.success, true);
  equal(result.email_sent, false);
  equal(f.mails.length, 0);
});
Deno.test("email OTP request does not bind a company or return a session", async () => {
  const f = fixture({ bound: false });
  const result = await (await handleB2BAuth(
    post({ mode: "request_activation", companyId, email: user.email }),
    f.d,
  )).json();
  equal(result, { success: true, verification_required: true });
  equal(f.company.user_id, null);
  equal(f.passwords, []);
  equal(f.calls.filter((c) => c.name === "b2b_activate_company").length, 0);
  equal(f.mails[0].to, [user.email]);
  ok(String(f.mails[0].html).includes("123456"));
});
Deno.test("wrong OTP or mismatched approved email cannot set a password or claim a company", async () => {
  const f = fixture({ bound: false });
  const input = {
    mode: "register",
    companyId,
    email: user.email,
    password: "fixture-password",
    code: "000000",
  };
  equal((await handleB2BAuth(post(input), f.d)).status, 401);
  equal(
    (await handleB2BAuth(
      post({ ...input, email: "attacker@example.invalid", code: "123456" }),
      f.d,
    )).status,
    401,
  );
  equal(f.passwords, []);
  equal(f.company.user_id, null);
  equal(f.mails.length, 0);
});
Deno.test("verified OTP activation retains session contract and registration email; an email error does not undo activation", async () => {
  const f = fixture({ bound: false, mailStatus: 503 });
  const result = await (await handleB2BAuth(
    post({
      mode: "register",
      companyId,
      email: user.email,
      password: " fixture-password ",
      code: "123456",
    }),
    f.d,
  )).json();
  equal(result.success, true);
  equal(result.access_token, "fixture-access-token");
  equal(result.company_id, companyId);
  equal(result.email_sent, false);
  equal(f.passwords, [" fixture-password "]);
  equal(f.company.user_id, userId);
  equal(f.mails[0].to, ["boss@example.invalid"]);
  equal(f.mails[0].key, "kfood-b2b-registration-" + companyId);
});
Deno.test("existing partners keep legacy passwords including surrounding spaces; profile exposes explicit columns", async () => {
  const f = fixture();
  const result =
    await (await handleB2BAuth(post({ mode: "login", email: user.email, password: " pass " }), f.d))
      .json();
  equal(result.success, true);
  equal(result.refresh_token, "fixture-refresh-token");
  equal(f.passwords, [" pass "]);
  const profile = await (await handleB2BAuth(post({ mode: "profile" }), f.d)).json();
  equal(profile.company.id, companyId);
  ok(!Object.hasOwn(profile.company, "internal_notes"));
  equal(f.mails.length, 0);
});
Deno.test("body, method, CORS and persistent limits reject requests with no side effects", async () => {
  const f = fixture({ allowed: false });
  equal((await handleB2BCheckout(post(payload()), f.d)).status, 429);
  equal(
    (await handleB2BCheckout(post(payload(), "real-token", "https://attacker.invalid"), f.d))
      .status,
    403,
  );
  equal(
    (await handleB2BAuth(new Request("https://example.invalid", { method: "GET" }), f.d)).status,
    405,
  );
  equal(
    (await handleB2BAuth(
      new Request("https://example.invalid", { method: "POST", body: "x".repeat(65537) }),
      f.d,
    )).status,
    413,
  );
  equal(f.mails.length, 0);
  equal(f.calls.filter((c) => c.name === "b2b_create_request").length, 0);
});
Deno.test("mail helper preserves the existing fallback sender and fails cleanly without credentials", async () => {
  const f = fixture();
  f.d.resendDomain = "";
  equal(
    (await b2bMail(f.d, "fixture-key", "boss@example.invalid", "Subject", "<p>Test</p>")).sent,
    true,
  );
  equal(f.mails[0].from, "K-FOOD <onboarding@resend.dev>");
  f.d.resendKey = "";
  equal(
    (await b2bMail(f.d, "fixture-key", "boss@example.invalid", "Subject", "<p>Test</p>")).sent,
    false,
  );
  equal(f.mails.length, 1);
});
Deno.test("client retries retain their identifier and an old response cannot clear a newer attempt", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  } as unknown as Storage;
  const a = b2bRequestAttempt("first", storage);
  equal(b2bRequestAttempt("first", storage), a);
  const b = b2bRequestAttempt("changed", storage);
  ok(a !== b);
  finishB2BAttempt(a, storage);
  equal(b2bRequestAttempt("changed", storage), b);
  finishB2BAttempt(b, storage);
  ok(b2bRequestAttempt("changed", storage) !== b);
});
