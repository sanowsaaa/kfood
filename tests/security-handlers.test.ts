import { createClient } from '@supabase/supabase-js';
import { handleApprove } from '../supabase/functions/approve-b2b/index.ts';
import { handleReview } from '../supabase/functions/review-b2b-order/index.ts';
import { handleCod } from '../supabase/functions/create-cod-order/index.ts';
import { handleCodNotification } from '../supabase/functions/send-cod-order-notification/index.ts';
import { deliverNotifications } from '../supabase/functions/_shared/notifications.ts';
import type { B2BDependencies } from '../supabase/functions/_shared/b2b.ts';
function equal(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Expected ${JSON.stringify(a)} = ${JSON.stringify(b)}`); }
function ok(x: unknown) { if (!x) throw new Error('Assertion failed'); }
const id = '70000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000001';
const jobId = '80000000-0000-4000-8000-000000000001';
function post(body: unknown, token = 'valid-token', method = 'POST') {
  return new Request('https://example.invalid/function', { method, headers: {
    'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}),
    origin: 'https://k-foodvelikotarnovo.com',
  }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
}
function fixture(options: { role?: string; rpcFailure?: string; nullResult?: boolean; mailFailure?: boolean; finishFailure?: boolean; absentOrder?: boolean; confirmed?: boolean } = {}) {
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  const emails: { key: string | null; body: Record<string, unknown> }[] = [];
  let state = 'pending'; let stored: Record<string, unknown> | null = null;
  const job = { id: jobId, lease_id: id, kind: 'b2b_approval', recipient: 'activation@example.invalid',
    snapshot: { company_id: id, company_name: '<img src=x onerror=alert(1)>', first_name: '<script>' }, payload: null };
  const order = { id, order_number: 'ORD-SYNTHETIC', payment_method: 'cod', is_b2b_order: false, total_amount: 17.02 };
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const db = createClient('https://example.invalid', 'fixture-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.pathname.endsWith('/auth/v1/user')) {
      const token = new Headers(init?.headers).get('authorization');
      return token === 'Bearer valid-token' ? reply({ id: userId, email: 'staff@example.invalid',
        email_confirmed_at: options.confirmed === false ? null : new Date().toISOString() }) : reply({ message: 'Invalid token' }, 401);
    }
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/').at(-1)!; calls.push({ name, body });
      if (options.rpcFailure === name) return reply({ code: 'P0001', message: 'INJECTED_WRITE_FAILURE' }, 400);
      if (name === 'b2b_rate_limit') return reply(true);
      if (name === 'b2b_approve_application') return reply(options.nullResult ? null : { company_id: id, notification_id: jobId, email_sent: state === 'sent', email: job.recipient });
      if (name === 'b2b_review_order') return reply(options.nullResult ? null : { success: true, action: 'approved', discounted_total: 7 });
      if (name === 'cod_create_order') return reply({ order });
      if (name === 'notification_claim') {
        if (state !== 'pending') return reply([]);
        state = 'leased'; return reply([{ ...job, payload: stored }]);
      }
      if (name === 'notification_prepare') { stored ||= body.p_payload; return reply(stored); }
      if (name === 'notification_finish') {
        if (options.finishFailure) return reply({ code: 'P0001', message: 'INJECTED_FINISH_FAILURE' }, 400);
        state = body.p_success ? 'sent' : 'pending'; return reply(null);
      }
      throw new Error('Unexpected RPC: ' + name);
    }
    if (url.pathname.endsWith('/user_roles')) return reply({ role: options.role || 'admin' });
    if (url.pathname.endsWith('/orders')) return options.absentOrder ? reply({ message: '0 rows' }, 406) : reply(order);
    if (url.pathname.endsWith('/notification_outbox')) {
      if (url.searchParams.has('entity_id')) return reply([]); // COD completion tests do not invent uncommitted jobs.
      return reply({ state, recipient: job.recipient });
    }
    throw new Error('Unexpected offline request: ' + url.pathname);
  } } });
  const deps: B2BDependencies = { db, auth: db, resendKey: 'synthetic', resendDomain: 'example.invalid', bossEmail: 'boss@example.invalid',
    mail: async (_url, init) => {
      emails.push({ key: new Headers(init?.headers).get('idempotency-key'), body: JSON.parse(String(init?.body)) });
      return reply(options.mailFailure ? { message: 'unavailable' } : { id: 'mail-fixture' }, options.mailFailure ? 503 : 200);
    } };
  return { deps, calls, emails, resetLease: () => { state = 'pending'; }, setCodJob: () => {
    job.kind = 'cod_customer'; job.recipient = 'buyer@example.invalid';
    job.snapshot = { order_number: 'ORD-SYNTHETIC',customer_email:'buyer@example.invalid',customer_phone:'0899000000',total_amount:17.02,
      shipping_address:{full_name:'Buyer <script>',address:'Test <img>',city:'Sofia',postal_code:'1000'},
      items:[{name:'Noodles <script>',quantity:4,unit_minor:400}],subtotal_minor:1600,discount_percent:0,goods_minor:1600,cod_fee_minor:102 } as unknown as typeof job.snapshot;
  } };
}

Deno.test('unauthenticated callers and non-admins cannot approve or send COD email', async () => {
  for (const handler of [handleApprove, handleReview, handleCodNotification]) {
    const f = fixture(); equal((await handler(post({ application_id:id,order_id:id,action:'approve',orderId:id }, ''),f.deps)).status,401);
    equal(f.calls.length,0); equal(f.emails.length,0);
    const p = fixture({ role:'partner' }); equal((await handler(post({}),p.deps)).status,403); equal(p.emails.length,0);
    const unverified = fixture({confirmed:false}); equal((await handler(post({}),unverified.deps)).status,401);
  }
});
Deno.test('approval write failures never send mail or claim success', async () => {
  for (const opts of [{rpcFailure:'b2b_approve_application'}, {nullResult:true}]) {
    const f=fixture(opts); const r=await handleApprove(post({application_id:id}),f.deps);
    equal(r.status,503); equal(f.emails.length,0); equal(f.calls.some(c=>c.name==='notification_claim'),false);
  }
});
Deno.test('approval preserves the template, escapes user text and sends to the activation identity only once', async () => {
  const f=fixture(); const req=()=>post({application_id:id,review_notes:'Approved',adminEmail:'attacker@example.invalid'});
  const a=await (await handleApprove(req(),f.deps)).json(), b=await (await handleApprove(req(),f.deps)).json();
  equal(a.success,true); equal(a.email_sent,true); equal(b.email_sent,true); equal(f.emails.length,1);
  equal(f.emails[0].body.to,['activation@example.invalid']); ok(f.emails[0].key?.includes(jobId));
  ok(String(f.emails[0].body.html).includes('&lt;script&gt;')); ok(!String(f.emails[0].body.html).includes('<img src=x'));
});
Deno.test('mail failure reports a committed approval without falsely claiming mail delivery', async () => {
  const f=fixture({mailFailure:true}); const r=await (await handleApprove(post({application_id:id}),f.deps)).json();
  equal(r.success,true); equal(r.email_sent,false); equal(f.calls.at(-1)?.body.p_success,false);
});
Deno.test('ambiguous completion retry reuses identical payload and provider idempotency key', async () => {
  const f=fixture({finishFailure:true}); const req=()=>post({application_id:id});
  equal((await (await handleApprove(req(),f.deps)).json()).email_sent,false);
  f.resetLease(); await handleApprove(req(),f.deps);
  equal(f.emails.length,2); equal(f.emails[0],f.emails[1]);
});
Deno.test('review rejects negative prices, unknown IDs and non-finite discounts before mutation', async () => {
  for (const body of [
    {line_items:[{id:1,unit_price:-1,carton_price:-12}]}, {line_items:[{id:0,unit_price:1,carton_price:12}]},
    {discount_percent:100}, {discount_percent:-1}, {discount_percent:'10'},
  ]) { const f=fixture(); equal((await handleReview(post({order_id:id,action:'approve',...body}),f.deps)).status,400); equal(f.calls.length,0); }
});
Deno.test('review confirms success only from the committed database result', async () => {
  for (const opts of [{rpcFailure:'b2b_review_order'},{nullResult:true}]) {
    const f=fixture(opts); equal((await handleReview(post({order_id:id,action:'approve'}),f.deps)).status,503);
  }
  const f=fixture(); const r=await handleReview(post({order_id:id,action:'approve',line_items:[{id:1,unit_price:7/12,carton_price:7}]}),f.deps);
  equal(r.status,200); equal((await r.json()).discounted_total,7); equal(f.emails.length,0);
});
Deno.test('legacy arbitrary-email payload and missing stored COD order cannot send mail', async () => {
  const f=fixture(); equal((await handleCodNotification(post({adminEmail:'attacker@example.invalid',products:[]}),f.deps)).status,400);
  equal(f.emails.length,0);
  const missing=fixture({absentOrder:true}); equal((await handleCodNotification(post({orderId:id}),missing.deps)).status,404); equal(missing.emails.length,0);
});
const codBody=()=>({attemptId:id,items:[{id:1,name:'Forged',price:0.01,quantity:4}],customer:{fullName:'Buyer',phone:'0899000000',email:'buyer@example.invalid',city:'Sofia',address:'Test',postalCode:'1000'}});
Deno.test('COD accepts only IDs/quantities and validated customer data; browser pricing and recipients are ignored', async () => {
  const f=fixture(); const r=await handleCod(post({...codBody(),adminEmail:'attacker@example.invalid'}),f.deps);
  equal(r.status,200); equal((await r.json()).totalWithCOD,'17.02');
  const call=f.calls.find(c=>c.name==='cod_create_order')!;
  equal(call.body.p_items,[{id:1,quantity:4}]); equal(call.body.p_email,'buyer@example.invalid');
  ok(!JSON.stringify(call.body).includes('attacker')); ok(!JSON.stringify(call.body).includes('Forged'));
});
Deno.test('COD requires a stable attempt, refuses forged promo discounts and does not send after a failed transaction', async () => {
  for (const body of [{...codBody(),attemptId:undefined},{...codBody(),promoDiscountPercent:10},{...codBody(),items:[{id:1,quantity:1.5}]}]) {
    const f=fixture(); ok((await handleCod(post(body),f.deps)).status>=400); equal(f.emails.length,0); equal(f.calls.length,0);
  }
  const f=fixture({rpcFailure:'cod_create_order'}); equal((await handleCod(post(codBody()),f.deps)).status,503); equal(f.emails.length,0);
});
Deno.test('stored COD notification keeps the customer template and escapes product/address content', async () => {
  const f=fixture(); f.setCodJob(); equal(await deliverNotifications(f.deps,jobId),1);
  equal(f.emails[0].body.to,['buyer@example.invalid']); ok(String(f.emails[0].body.html).includes('Сума за плащане при доставка'));
  ok(String(f.emails[0].body.html).includes('&lt;script&gt;')); ok(!String(f.emails[0].body.html).includes('Buyer <script>'));
});
