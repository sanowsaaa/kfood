import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

let db, pool, invoiceScopeBefore, invoiceScopeAfter;
const root = new URL('../',import.meta.url);
const user = '40000000-0000-4000-8000-000000000001';
const other = '40000000-0000-4000-8000-000000000002';
const company = '50000000-0000-4000-8000-000000000001';
const unclaimed = '50000000-0000-4000-8000-000000000002';
const hash = s => createHash('sha256').update(s).digest('hex');
before(async () => {
  if (process.env.TEST_DATABASE_URL) {
    const url = new URL(process.env.TEST_DATABASE_URL);
    if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== '/kfood_test') {
      throw new Error('Tests require a disposable loopback database named kfood_test');
    }
    pool = new pg.Pool({ connectionString: url.toString(),max:8 });
    db = { exec: q => pool.query(q),query: (q,p) => pool.query(q,p),close: () => pool.end() };
    // This test suite runs after the retail suite in the disposable CI database.
    await db.exec('drop schema if exists auth cascade; drop schema public cascade; create schema public;');
  } else db = new PGlite();
  await db.exec(await readFile(new URL('tests/fixtures/b2b-schema.sql',root),'utf8'));
  const unaffected = async () => (await db.query("select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('orders','b2b_companies') order by tablename,policyname")).rows;
  invoiceScopeBefore=await unaffected();
  await db.exec(await readFile(new URL('supabase/migrations/20261008045000_retire_web_invoices.sql',root),'utf8'));
  invoiceScopeAfter=await unaffected();
  await db.exec(await readFile(new URL('supabase/migrations/20261008050000_b2b_access_and_requests.sql',root),'utf8'));
});
after(async () => { await db?.close(); });
async function reset() {
  await db.exec('truncate public.b2b_request_attempts,public.orders,public.products,public.b2b_companies,public.b2b_rate_limits,public.user_roles,auth.users cascade;');
  await db.query('insert into auth.users values($1,$2,now()),($3,$4,now())',[user,'partner@example.invalid',other,'other@example.invalid']);
  await db.query("insert into public.b2b_companies(id,company_name,email,status,user_id,internal_notes) values($1,'Partner','partner@example.invalid','active',$2,'private'),($3,'Unclaimed','other@example.invalid','active',null,'private')",[company,user,unclaimed]);
  await db.exec("insert into public.products(id,name,price,wholesale_price,carton_price,pieces_per_carton,sku) values(1,'Carton',9,10,19.99,12,'ONE'),(2,'Piece',3.99,2.51,29.99,0,'TWO'),(3,'Disabled',5,4,0,0,'THREE'); update public.products set in_stock=false where id=3;");
}
async function request({attempt=randomUUID(),actor=user,owner=company,requestHash=hash('same request'),items=[{id:1,quantity:24}],...overrides}={}) {
  const params = [actor,owner,attempt,requestHash,JSON.stringify(items),'partner@example.invalid','0899123456',
    JSON.stringify({full_name:'Partner',city:'Veliko Tarnovo',address:'Test address'}),''];
  for (const [index,value] of Object.entries(overrides)) params[Number(index)]=value;
  return (await db.query('select public.b2b_create_request($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9) result',params)).rows[0].result;
}
async function withRole(role,actor,fn) {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('begin'); await client.query(`set local role ${role}`);
      await client.query("select set_config('request.jwt.claim.sub',$1,true)",[actor || '']);
      return await fn(client);
    } finally { await client.query('rollback'); client.release(); }
  }
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor || '']);
    return fn(tx);
  });
}

test('B2B migration works independently and retains historical invoices while closing public rights', async () => {
  assert.deepEqual(invoiceScopeAfter,invoiceScopeBefore);
  assert.equal((await db.query('select count(*)::int n from public.b2b_invoices')).rows[0].n,1);
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.b2b_invoices'::regclass")).rows[0].relrowsecurity,true);
  for (const role of ['anon','authenticated']) {
    const rights = (await db.query("select has_table_privilege($1,'public.b2b_invoices','SELECT') sel,has_table_privilege($1,'public.b2b_invoices','INSERT') ins,has_table_privilege($1,'public.b2b_invoices','UPDATE') upd,has_table_privilege($1,'public.b2b_invoices','DELETE') del",[role])).rows[0];
    assert.deepEqual(rights,{sel:false,ins:false,upd:false,del:false});
  }
});
test('transaction uses database prices, preserves piece pricing and exact carton cents', async () => {
  await reset();
  const saved = await request({items:[{id:1,quantity:24,price:0.01,name:'Forged'},{id:2,quantity:3}]});
  assert.equal(Number(saved.order.total_amount),47.51);
  assert.deepEqual(saved.order.items.map(x=>x.line_total_minor),[3998,753]);
  assert.equal(saved.order.items[0].name,'Carton');
  assert.equal(saved.order.status,'pending_review');
  assert.equal(saved.order.payment_method,'b2b_request');
  assert.equal(saved.order.currency,'EUR');
  assert.equal((await db.query('select stock from public.products where id=1')).rows[0].stock,100);
  assert.equal((await db.query('select count(*)::int n from public.b2b_invoices')).rows[0].n,0);
});
test('concurrent retries return one order; a changed request cannot reuse its identifier', async () => {
  await reset(); const attempt=randomUUID();
  const [a,b] = await Promise.all([request({attempt}),request({attempt})]);
  assert.equal(a.order.id,b.order.id);
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,1);
  await assert.rejects(request({attempt,requestHash:hash('changed')}),/REQUEST_CONFLICT/);
  await db.query("update public.orders set total_amount=1,items='[]' where id=$1",[a.order.id]);
  const retry = await request({attempt});
  assert.equal(Number(retry.notification_snapshot.order.total_amount),39.98);
  assert.equal(retry.notification_snapshot.order.items.length,1);
});
test('another partner, inactive company and invalid products do not create orders', async () => {
  await reset();
  await assert.rejects(request({actor:other}),/COMPANY_ACCESS_DENIED/);
  await db.query("update public.b2b_companies set status='suspended' where id=$1",[company]);
  await assert.rejects(request(),/COMPANY_ACCESS_DENIED/);
  await db.query("update public.b2b_companies set status='active' where id=$1",[company]);
  await assert.rejects(request({items:[{id:3,quantity:1}]}),/PRODUCT_UNAVAILABLE/);
  await assert.rejects(request({items:[{id:1,quantity:13}]}),/WHOLE_CARTONS_REQUIRED/);
  await assert.rejects(request({items:[{id:2,quantity:1},{id:2,quantity:1}]}),/INVALID_CART/);
  await assert.rejects(request({items:[{id:2,quantity:-1}]}),/INVALID_CART/);
  await assert.rejects(request({items:[{}]}),/INVALID_CART/);
  await assert.rejects(request({'3':null}),/INVALID_REQUEST/);
  await assert.rejects(request({'4':null}),/INVALID_REQUEST/);
  await assert.rejects(request({'7':null}),/INVALID_REQUEST/);
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,0);
});
test('failure to persist the notification snapshot rolls back the entire order', async () => {
  await reset();
  await db.exec('alter table public.b2b_request_attempts add constraint fixture_failure check(false) not valid');
  await assert.rejects(request(),/fixture_failure/);
  await db.exec('alter table public.b2b_request_attempts drop constraint fixture_failure');
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,0);
});
test('activation requires the verified company email and cannot steal a bound company', async () => {
  await reset();
  await assert.rejects(db.query('select public.b2b_activate_company($1,$2)',[company,other]),/COMPANY_NOT_AVAILABLE/);
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[other]);
  await assert.rejects(db.query('select public.b2b_activate_company($1,$2)',[unclaimed,other]),/EMAIL_NOT_VERIFIED/);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[other]);
  await db.query('select public.b2b_activate_company($1,$2)',[unclaimed,other]);
  assert.equal((await db.query('select user_id from public.b2b_companies where id=$1',[unclaimed])).rows[0].user_id,other);
  const secondCompany=randomUUID();
  await db.query("insert into public.b2b_companies(id,company_name,email,status) values($1,'Second','partner@example.invalid','active')",[secondCompany]);
  await assert.rejects(db.query('select public.b2b_activate_company($1,$2)',[secondCompany,user]),/USER_ALREADY_HAS_COMPANY/);
  assert.equal((await db.query('select user_id from public.b2b_companies where id=$1',[secondCompany])).rows[0].user_id,null);
});
test('public clients cannot bypass the B2B transaction; existing retail inserts still work', async () => {
  await reset();
  const q = "insert into public.orders(order_number,customer_email,total_amount,items,is_b2b_order,payment_method) values($1,'buyer@example.invalid',10,'[]',$2,$3)";
  for (const role of ['anon','authenticated']) {
    await assert.rejects(withRole(role,user,tx=>tx.query(q,[randomUUID(),true,'b2b_request'])),/row-level security/);
    await assert.rejects(withRole(role,user,tx=>tx.query(q,[randomUUID(),false,'b2b_invoice'])),/row-level security/);
    await withRole(role,user,tx=>tx.query(q,[randomUUID(),false,'stripe']));
    for (const signature of ['b2b_activate_company(uuid,uuid)','b2b_rate_limit(text,text,integer)','b2b_create_request(uuid,uuid,uuid,text,jsonb,text,text,jsonb,text)']) {
      assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') allowed',[role,signature])).rows[0].allowed,false);
    }
    assert.equal((await db.query("select has_table_privilege($1,'public.b2b_request_attempts','SELECT') allowed",[role])).rows[0].allowed,false);
  }
});
test('partners can view their orders without access to private company columns; staff retain access', async () => {
  await reset(); const saved=await request();
  assert.equal((await withRole('authenticated',user,tx=>tx.query('select id from public.orders'))).rows.length,1);
  assert.equal((await withRole('authenticated',other,tx=>tx.query('select id from public.orders'))).rows.length,0);
  assert.equal((await withRole('authenticated',user,tx=>tx.query('select internal_notes from public.b2b_companies'))).rows.length,0);
  await db.query("insert into public.user_roles values($1,'admin') on conflict(user_id) do update set role='admin'",[other]);
  assert.equal((await withRole('authenticated',other,tx=>tx.query('select internal_notes from public.b2b_companies'))).rows.length,2);
  assert.equal((await withRole('authenticated',other,tx=>tx.query('select id from public.orders where id=$1',[saved.order.id]))).rows.length,1);
});
test('persistent rate limits are atomic and expire after their window', async () => {
  await reset(); const actor=hash('actor');
  const results=await Promise.all(Array.from({length:12},()=>db.query("select public.b2b_rate_limit('order',$1,10) allowed",[actor])));
  assert.equal(results.filter(r=>r.rows[0].allowed).length,10);
  await db.exec("update public.b2b_rate_limits set window_start=now()-interval '16 minutes'");
  assert.equal((await db.query("select public.b2b_rate_limit('order',$1,10) allowed",[actor])).rows[0].allowed,true);
});
test('B2B schema and request stay compatible with the separate retail payment migration', async () => {
  await reset();
  const migrations=await readdir(new URL('supabase/migrations/',root));
  await db.exec(await readFile(new URL('supabase/migrations/'+migrations.find(n=>n.endsWith('_checkout_payment_integrity.sql')),root),'utf8'));
  assert.equal(Number((await request()).order.total_amount),39.98);
  assert.equal((await db.query("select has_table_privilege('anon','public.orders','INSERT') allowed")).rows[0].allowed,false);
});
