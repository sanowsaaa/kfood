import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

let db;
before(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    if (!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname) || parsed.pathname !== '/kfood_test') {
      throw new Error('Tests require a disposable loopback database named kfood_test');
    }
    const pool = new pg.Pool({ connectionString: url, max: 8 });
    db = { query: (q,p) => pool.query(q,p), exec: (q) => pool.query(q), close: () => pool.end() };
  } else db = new PGlite();
  await db.exec(await readFile(new URL('./fixtures/payment-schema.sql', import.meta.url), 'utf8'));
  const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url));
  const migration = migrations.find(p => p.endsWith('_checkout_payment_integrity.sql'));
  await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });
const hash = (s) => createHash('sha256').update(s).digest('hex');
async function reset() {
  await db.exec('truncate public.checkout_outbox,public.stripe_webhook_events,public.checkout_stock_holds,public.checkout_payments,public.orders,public.products,public.checkout_rate_limits;');
  await db.exec("insert into public.products(id,name,price,stock) values(1,'Kimchi',3.99,100),(2,'Noodles',19.99,100),(3,'Tea',0.99,100);");
}
async function quote({ attempt = randomUUID(), items = [{id:1,quantity:4}], total = 1596,
  request = hash('request'), token = hash('token'), live = false } = {}) {
  const result = await db.query('select public.checkout_prepare($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9) as payment',
    [attempt,request,token,JSON.stringify(items),'buyer@example.invalid','0899123456',total,live,'https://example.invalid']);
  return result.rows[0].payment;
}
async function apply(p, { id = randomUUID(), type = 'checkout.session.completed', sid = 'cs_fixture_1',
  orderId = p.order_id, attempt = p.attempt_id, number = p.order_number, live = p.livemode,
  amount = p.total_minor, currency = 'eur', status = 'complete', paid = 'paid', intent = 'succeeded', refunded = 0, disputed = false } = {}) {
  const result = await db.query('select public.checkout_apply_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16) as result',
    [id,type,sid,orderId,attempt,number,live,amount,currency,status,paid,null,null,intent,refunded,disputed]);
  return result.rows[0].result;
}
async function row(table, column, value) {
  return (await db.query(`select * from public.${table} where ${column}=$1`, [value])).rows[0];
}

test('quote persists a real order before Stripe and retries reuse it', async () => {
  await reset(); const attempt = randomUUID();
  const [a,b] = await Promise.all([quote({attempt}),quote({attempt})]);
  assert.equal(a.order_id,b.order_id);
  assert.equal((await db.query('select count(*)::int as n from public.orders')).rows[0].n,1);
  assert.equal(Number((await row('orders','id',a.order_id)).total_amount),15.96);
  assert.equal((await row('products','id',1)).stock,100);
  await assert.rejects(quote({attempt,request:hash('modified')}),/CHECKOUT_ATTEMPT_CONFLICT/);
  await assert.rejects(quote({attempt,token:hash('other-token')}),/CHECKOUT_ATTEMPT_CONFLICT/);
});
test('server pricing, discounts and largest remainder preserve exact cents', async () => {
  await reset();
  const p = await quote({items:[{id:1,quantity:7},{id:2,quantity:3},{id:3,quantity:14}],total:9158});
  assert.equal(p.discount_percent,10);
  assert.equal(p.line_items.reduce((n,line) => n+line.line_minor,0),p.total_minor);
  assert.equal(Number((await row('orders','id',p.order_id)).total_amount),p.total_minor/100);
  const before = (await db.query('select count(*)::int n from public.orders')).rows[0].n;
  await assert.rejects(quote({total:1}),/PRICE_CHANGED/);
  await assert.rejects(quote({items:[{id:3,quantity:1}],total:99}),/INVALID_TOTAL/);
  await assert.rejects(quote({items:[{id:1,quantity:4},{id:1,quantity:4}],total:3192}),/INVALID_CART/);
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,before);
});
test('competing orders cannot reserve the same stock; wholesale and disabled products are rejected', async () => {
  await reset(); await db.exec('update public.products set stock=4 where id=1');
  const results = await Promise.allSettled([quote(),quote()]);
  assert.equal(results.filter(x => x.status==='fulfilled').length,1);
  assert.match(results.find(x=>x.status==='rejected').reason.message,/INSUFFICIENT_STOCK/);
  await db.exec("update public.products set visibility='wholesale' where id=2");
  await assert.rejects(quote({items:[{id:2,quantity:1}],total:1999}),/PRODUCT_UNAVAILABLE/);
  await db.exec('update public.products set in_stock=false where id=2');
  await assert.rejects(quote({items:[{id:2,quantity:1}],total:1999}),/PRODUCT_UNAVAILABLE/);
  await db.exec('update public.products set in_stock=true,visibility=null where id=2');
  await assert.rejects(quote({items:[{id:2,quantity:1}],total:1999}),/PRODUCT_UNAVAILABLE/);
});
test('paid webhook can arrive before attachment and produces one stock movement and one job', async () => {
  await reset(); const p = await quote(); const id = randomUUID();
  assert.equal((await apply(p,{id})).decision,'applied');
  assert.equal((await apply(p,{id})).duplicate,true);
  await Promise.all([apply(p),apply(p)]);
  assert.equal((await row('orders','id',p.order_id)).status,'confirmed');
  assert.equal((await row('orders','id',p.order_id)).stripe_session_id,'cs_fixture_1');
  assert.equal((await row('products','id',1)).stock,96);
  assert.equal((await db.query('select count(*)::int n from public.checkout_outbox')).rows[0].n,1);
  await db.query("update public.orders set status='delivered' where id=$1",[p.order_id]);
  await apply(p,{type:'checkout.session.expired',status:'expired',paid:'unpaid'});
  assert.equal((await row('orders','id',p.order_id)).status,'delivered');
  assert.equal((await row('checkout_payments','order_id',p.order_id)).state,'paid');
});
test('different session, order binding, amount, currency and environment require review', async () => {
  await reset(); const p = await quote();
  const cases = [{amount:0},{amount:p.total_minor+1},{currency:'bgn'},{live:true},{attempt:randomUUID()},{number:'another-order'}];
  for (const bad of cases) assert.equal((await apply(p,bad)).decision,'review');
  assert.equal((await row('checkout_payments','order_id',p.order_id)).state,'pending');
  assert.equal((await row('products','id',1)).stock,100);
  await db.query('select public.checkout_attach_session($1,$2,$3,$4,$5,$6)',[p.order_id,'cs_bound','https://checkout.stripe.com/test',false,p.total_minor,'eur']);
  assert.equal((await apply(p,{sid:'cs_other'})).decision,'review');
  assert.equal((await apply(p,{orderId:null})).reason,'NO_TRUSTED_QUOTE');
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,1);
});
test('asynchronous completion waits; failed or expired sessions release once; late paid requires review', async () => {
  await reset(); const p = await quote();
  await apply(p,{paid:'unpaid'});
  assert.equal((await row('checkout_payments','order_id',p.order_id)).state,'awaiting_payment');
  assert.equal((await row('products','id',1)).stock,100);
  await apply(p,{type:'checkout.session.async_payment_failed',paid:'unpaid'});
  assert.equal((await row('checkout_stock_holds','order_id',p.order_id)).state,'released');
  const next = await quote();
  await apply(next,{sid:'cs_fixture_2',type:'checkout.session.expired',status:'expired',paid:'unpaid'});
  await apply(next,{sid:'cs_fixture_2',type:'checkout.session.expired',status:'expired',paid:'unpaid'});
  assert.equal((await row('checkout_payments','order_id',next.order_id)).state,'expired');
  assert.equal((await apply(p)).decision,'review');
  assert.equal((await row('products','id',1)).stock,100);
  assert.equal((await db.query('select count(*)::int n from public.checkout_outbox')).rows[0].n,0);
});
test('outbox insertion failure rolls back payment, stock and event together', async () => {
  await reset(); const p = await quote(); const id = randomUUID();
  await db.exec('alter table public.checkout_outbox add constraint fixture_failure check(false) not valid');
  await assert.rejects(apply(p,{id}),/fixture_failure/);
  await db.exec('alter table public.checkout_outbox drop constraint fixture_failure');
  assert.equal((await row('checkout_payments','order_id',p.order_id)).state,'pending');
  assert.equal((await row('products','id',1)).stock,100);
  assert.equal(await row('stripe_webhook_events','event_id',id),undefined);
  assert.equal((await apply(p,{id})).decision,'applied');
});
test('workers lease each notification once and stale completion cannot close a new lease', async () => {
  await reset(); const p = await quote(); await apply(p);
  const claims = await Promise.all([db.query('select * from public.checkout_claim_emails(5)'),db.query('select * from public.checkout_claim_emails(5)')]);
  const jobs = claims.flatMap(r=>r.rows); assert.equal(jobs.length,1);
  const job = jobs[0];
  await db.query('select public.checkout_finish_email($1,$2,true)',[job.id,randomUUID()]);
  assert.equal((await row('checkout_outbox','id',job.id)).state,'leased');
  await db.query('select public.checkout_finish_email($1,$2,false)',[job.id,job.lease_id]);
  assert.equal((await row('checkout_outbox','id',job.id)).state,'pending');
  await db.query("update public.checkout_outbox set first_attempt_at=now()-interval '21 hours' where id=$1",[job.id]);
  assert.equal((await db.query('select * from public.checkout_claim_emails(5)')).rows.length,0);
  assert.equal((await row('checkout_outbox','id',job.id)).state,'review');
});
test('expired worker leases stop after ten attempts without revoking the active final lease', async () => {
  await reset(); const p = await quote(); await apply(p);
  const job = (await db.query('select * from public.checkout_claim_emails(5)')).rows[0];
  await db.query("update public.checkout_outbox set attempts=9,lease_until=now()-interval '1 minute' where id=$1",[job.id]);
  const finalLease = (await db.query('select * from public.checkout_claim_emails(5)')).rows[0];
  assert.equal(finalLease.attempts,10);
  assert.equal((await db.query('select * from public.checkout_claim_emails(5)')).rows.length,0);
  assert.equal((await row('checkout_outbox','id',job.id)).state,'leased');
  await db.query("update public.checkout_outbox set lease_until=now()-interval '1 minute' where id=$1",[job.id]);
  assert.equal((await db.query('select * from public.checkout_claim_emails(5)')).rows.length,0);
  assert.equal((await row('checkout_outbox','id',job.id)).state,'review');
  await db.query('select public.checkout_finish_email($1,$2,true)',[job.id,finalLease.lease_id]);
  assert.equal((await row('checkout_outbox','id',job.id)).state,'review');
});
test('public callers cannot insert orders, see payment proofs or execute payment RPCs', async () => {
  for (const role of ['anon','authenticated']) {
    const rights = (await db.query("select has_table_privilege($1,'public.orders','INSERT') ins,has_table_privilege($1,'public.checkout_payments','SELECT') sel,has_function_privilege($1,'public.checkout_prepare(uuid,text,text,jsonb,text,text,integer,boolean,text)','EXECUTE') rpc",[role])).rows[0];
    assert.deepEqual(rights,{ins:false,sel:false,rpc:false});
  }
  const tables = (await db.query("select relname,relrowsecurity from pg_class where relname in ('checkout_payments','checkout_stock_holds','checkout_outbox','stripe_webhook_events','checkout_rate_limits')")).rows;
  assert.equal(tables.length,5); assert(tables.every(t=>t.relrowsecurity));
  const functions = (await db.query("select proname,prosecdef from pg_proc where proname like 'checkout_%'")).rows;
  assert(functions.every(f=>!f.prosecdef));
});
test('distributed rate limit is atomic across concurrent requests', async () => {
  await reset();
  const calls = await Promise.all(Array.from({length:12},()=>db.query("select public.checkout_rate_limit('bucket',10,60) as allowed")));
  assert.equal(calls.filter(r=>r.rows[0].allowed).length,10);
});
test('missing canonical charge, prior refunds and disputes cannot automatically fulfill', async () => {
  await reset(); const p = await quote();
  assert.equal((await apply(p,{intent:null,refunded:null,disputed:null})).reason,'NO_CANONICAL_CHARGE');
  assert.equal((await row('checkout_payments','order_id',p.order_id)).state,'pending');
  assert.equal((await apply(p,{refunded:100})).reason,'REFUNDED_OR_DISPUTED');
  assert.equal((await row('checkout_payments','order_id',p.order_id)).state,'review');
  assert.equal((await row('products','id',1)).stock,100);
  const other = await quote();
  assert.equal((await apply(other,{sid:'cs_fixture_2',disputed:true})).decision,'review');
  assert.equal((await db.query('select count(*)::int n from public.checkout_outbox')).rows[0].n,0);
});
