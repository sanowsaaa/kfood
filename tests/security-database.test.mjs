import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {database,migrate,asRole,admin,partner,stranger,company} from './helpers/prelaunch-db.mjs';
let db;
const hash=s=>createHash('sha256').update(s).digest('hex');
const service=fn=>asRole(db,'service_role',null,fn);
const adminCall=fn=>asRole(db,'authenticated',admin,fn);
const anon=fn=>asRole(db,'anon',null,fn);
const member=fn=>asRole(db,'authenticated',partner,fn);
before(async()=>{
  db=await database(); await migrate(db);
  await db.exec(await readFile('supabase/migrations/20261011165307_security_reliability.sql','utf8'));
  await db.exec(`create schema storage; grant usage on schema storage to authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security; alter table storage.buckets enable row level security; grant select,insert,update,delete on storage.objects to authenticated; grant select,insert on storage.buckets to authenticated;`);
  await db.exec(await readFile('supabase/migrations/20261011165345_b2b_document_storage.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261011165407_launch_compatibility.sql','utf8'));
  await adminCall(tx=>tx.query("insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('b2b-documents','b2b-documents',false,10485760,array['application/pdf'])"));
});
after(async()=>{await db?.close();});
const denied=fn=>assert.rejects(fn,{code:'42501'});
async function application(){return (await db.query(`insert into public.b2b_applications(company_name,email,contact_email,
  contact_first_name,contact_last_name,business_type,address,city,status) values('Synthetic Firm','activation@example.invalid','contact@example.invalid',
  'Synthetic','Partner','retail','Test address','Sofia','pending') returning id`)).rows[0].id;}
const approve=id=>service(async tx=>(await tx.query('select public.b2b_approve_application($1,$2,$3) r',[id,admin,'Approved'])).rows[0].r);
const prepare=(id=1,qty=4)=>service(async tx=>(await tx.query('select public.checkout_prepare($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9) r',
  [randomUUID(),hash('request'),hash('token'),JSON.stringify([{id,quantity:qty}]),'buyer@example.invalid','0899000000',400*qty,false,'https://example.invalid'])).rows[0].r);
const apply=p=>service(async tx=>(await tx.query('select public.checkout_apply_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16) r',
  [randomUUID(),'checkout.session.completed','cs_test_'+p.order_id,p.order_id,p.attempt_id,p.order_number,false,p.total_minor,'eur','complete','paid',null,null,'succeeded',0,false])).rows[0].r);

test('catalog remains readable; cost is denied to visitors and partners, available only through checked admin RPC',async()=>{
  assert.equal((await anon(tx=>tx.query('select id,name,price,stock,slug from products where id=1'))).rows.length,1);
  await denied(()=>anon(tx=>tx.query('select cost_price from products')));
  await denied(()=>member(tx=>tx.query('select cost_price from products')));
  await denied(()=>member(tx=>tx.query('select * from admin_products()')));
  assert.equal(Number((await adminCall(tx=>tx.query('select * from admin_products() where id=1'))).rows[0].cost_price),1);
  assert.equal((await adminCall(tx=>tx.query('update products set cost_price=2 where id=1 returning id'))).rows.length,1);
});
test('public order forging and internal company reads are denied',async()=>{
  await denied(()=>anon(tx=>tx.query("insert into orders(total_amount,status) values(0,'confirmed')")));
  await denied(()=>anon(tx=>tx.query('select internal_notes from b2b_companies')));
});
test('review submission stays pending, and administrators can moderate and publish a draft',async()=>{
  await denied(()=>anon(tx=>tx.query("insert into reviews(name,rating,text,is_approved) values('Synthetic',5,'Review',true)")));
  await anon(tx=>tx.query("insert into reviews(name,rating,text) values('Synthetic',5,'Review')"));
  assert.equal((await anon(tx=>tx.query("select id from reviews where name='Synthetic'"))).rows.length,0);
  assert.equal((await adminCall(tx=>tx.query("update reviews set is_approved=true where name='Synthetic' returning id"))).rows.length,1);
  const blog=(await adminCall(tx=>tx.query("insert into blog_posts(title,slug,published) values('Draft','fixture-draft',false) returning id"))).rows[0];
  assert.equal((await anon(tx=>tx.query('select id from blog_posts where id=$1',[blog.id]))).rows.length,0);
  await adminCall(tx=>tx.query('update blog_posts set published=true where id=$1',[blog.id]));
  assert.equal((await anon(tx=>tx.query('select id from blog_posts where id=$1',[blog.id]))).rows.length,1);
});
test('public B2B application cannot supply administrative approval fields',async()=>{
  await denied(()=>anon(tx=>tx.query("insert into b2b_applications(company_name,email,contact_first_name,contact_last_name,business_type,status,accept_terms,accept_privacy,confirm_accurate) values('Forged','test@example.invalid','Test','Partner','retail','approved',true,true,true)")));
  await anon(tx=>tx.query("insert into b2b_applications(company_name,email,contact_first_name,contact_last_name,business_type,status,accept_terms,accept_privacy,confirm_accurate) values('Legitimate','test@example.invalid','Test','Partner','retail','pending',true,true,true)"));
});
test('approval retries create one company, one contact/address and one persisted notification to the activation email',async()=>{
  const id=await application(), a=await approve(id), b=await approve(id);
  assert.equal(a.company_id,b.company_id); assert.equal(a.notification_id,b.notification_id);
  const result=(await db.query('select company_id,status from b2b_applications where id=$1',[id])).rows[0];
  assert.equal(result.status,'approved'); assert.equal(result.company_id,a.company_id);
  assert.equal((await db.query('select id from b2b_company_contacts where company_id=$1',[a.company_id])).rows.length,1);
  assert.equal((await db.query('select id from b2b_company_addresses where company_id=$1',[a.company_id])).rows.length,1);
  const jobs=(await db.query('select recipient from notification_outbox where entity_id=$1',[id])).rows;
  assert.deepEqual(jobs,[{recipient:'activation@example.invalid'}]);
  await denied(()=>member(tx=>tx.query('select b2b_approve_application($1,$2,$3)',[id,partner,''])));
});
test('late approval failure rolls back the company, linked records and application status',async()=>{
  const id=await application(); const before=(await db.query('select count(*)::int n from b2b_companies')).rows[0].n;
  await db.exec(`create function public.fixture_fail_mail() returns trigger language plpgsql as $$begin raise exception 'INJECTED_FAILURE'; end$$;
    create trigger fixture_fail_mail before insert on notification_outbox for each row execute function fixture_fail_mail();`);
  try { await assert.rejects(()=>approve(id),/INJECTED_FAILURE/); }
  finally { await db.exec('drop trigger fixture_fail_mail on notification_outbox; drop function fixture_fail_mail();'); }
  assert.equal((await db.query('select count(*)::int n from b2b_companies')).rows[0].n,before);
  assert.deepEqual((await db.query('select company_id,status from b2b_applications where id=$1',[id])).rows[0],{company_id:null,status:'pending'});
});
test('B2B review rejects negative/unknown prices and missing rows; carton totals retain exact cents',async()=>{
  const id=(await db.query(`insert into orders(order_number,customer_email,total_amount,is_b2b_order,b2b_company_id,status,items)
    values('B2B-SYNTHETIC-REVIEW','test@example.invalid',7,true,$1,'pending_review',$2::jsonb) returning id`,[company,JSON.stringify([{id:1,name:'Carton',quantity:12,pieces_per_carton:12,price:7/12,carton_price:7,line_total_minor:700}])])).rows[0].id;
  const review=(lines,order=id,discount=0)=>service(async tx=>(await tx.query('select b2b_review_order($1,$2,$3,$4,$5,$6::jsonb) r',[order,admin,'approve',discount,'',lines===null?null:JSON.stringify(lines)])).rows[0].r);
  await assert.rejects(()=>review([{id:1,unit_price:-1,carton_price:-12}]),/INVALID_PRICES/);
  await assert.rejects(()=>review([{id:999,unit_price:1,carton_price:12}]),/INVALID_PRICES/);
  await assert.rejects(()=>review(null,randomUUID()),/ORDER_NOT_FOUND/);
  await assert.rejects(()=>review(null,id,100),/INVALID_REVIEW/);
  assert.equal(Number((await review(null,id,10)).discounted_total),6.30);
  const r=await review([{id:1,unit_price:0.58,carton_price:7}]);
  assert.equal(Number(r.discounted_total),7);
  assert.equal(Number((await db.query('select total_amount from orders where id=$1',[id])).rows[0].total_amount),7);
});
test('partner metadata and Storage permissions agree; suspension revokes both',async()=>{
  const other=(await db.query("insert into b2b_companies(company_name,email) values('Other','other@example.invalid') returning id")).rows[0].id;
  await db.query(`insert into b2b_documents(title,file_url,storage_path,visibility,company_id) values
    ('Own','','own/document.pdf','company',$1),('Other','','other/document.pdf','company',$2)`,[company,other]);
  await db.exec("insert into storage.objects(bucket_id,name) values('b2b-documents','own/document.pdf'),('b2b-documents','other/document.pdf')");
  assert.equal((await member(tx=>tx.query('select id from b2b_documents'))).rows.length,1);
  assert.deepEqual((await member(tx=>tx.query('select name from storage.objects'))).rows,[{name:'own/document.pdf'}]);
  assert.equal((await asRole(db,'authenticated',stranger,tx=>tx.query('select name from storage.objects'))).rows.length,0);
  await db.query("update b2b_companies set status='suspended' where id=$1",[company]);
  assert.equal((await member(tx=>tx.query('select name from storage.objects'))).rows.length,0);
  await db.query("update b2b_companies set status='active' where id=$1",[company]);
  assert.equal((await db.query("select public from storage.buckets where id='b2b-documents'")).rows[0].public,false);
});
test('administrators cannot erase held stock; fulfillment consumes only its own hold, once',async()=>{
  const last=await prepare(2);
  await assert.rejects(()=>adminCall(tx=>tx.query('update products set stock=0 where id=2')),{code:'23514'});
  const a=await prepare(1), b=await prepare(1);
  assert.equal((await apply(a)).decision,'applied'); await apply(a); assert.equal((await apply(b)).decision,'applied');
  assert.equal((await db.query('select stock from products where id=1')).rows[0].stock,92);
  assert.equal((await apply(last)).decision,'applied');
  assert.equal((await db.query('select stock from products where id=2')).rows[0].stock,0);
});
test('COD uses catalog EUR prices, writes the actual schema, consumes stock and queues each recipient once',async()=>{
  const attempt=randomUUID();
  const args=[attempt,hash('cod'),JSON.stringify([{id:1,quantity:4}]),'buyer@example.invalid','0899000000',JSON.stringify({full_name:'Synthetic Buyer',city:'Sofia',address:'Test',postal_code:'1000'})];
  const call=()=>service(async tx=>(await tx.query('select cod_create_order($1,$2,$3::jsonb,$4,$5,$6::jsonb) r',args)).rows[0].r);
  const a=await call(),b=await call();
  assert.equal(a.order.id,b.order.id); assert.equal(Number(a.order.total_amount),17.02);
  assert.equal(a.order.payment_method,'cod'); assert.equal(a.order.shipping_address.full_name,'Synthetic Buyer');
  assert.equal((await db.query('select stock from products where id=1')).rows[0].stock,88);
  assert.equal((await db.query('select id from notification_outbox where entity_id=$1',[a.order.id])).rows.length,3);
  args[1]=hash('changed'); await assert.rejects(call,/ATTEMPT_CONFLICT/);
  args[0]=randomUUID(); args[2]=JSON.stringify([{id:2,quantity:1}]); await assert.rejects(call,/PRODUCT_UNAVAILABLE|INSUFFICIENT_STOCK/);
});
test('delivery leases prevent competing sends; payload is immutable and stale ambiguous jobs require review',async()=>{
  const a=await approve(await application());
  const claim=()=>service(tx=>tx.query('select * from notification_claim($1,1)',[a.notification_id]));
  const job=(await claim()).rows[0]; assert.ok(job.lease_id); assert.equal((await claim()).rows.length,0);
  const prepare=payload=>service(async tx=>(await tx.query('select notification_prepare($1,$2,$3::jsonb) p',[job.id,job.lease_id,JSON.stringify(payload)])).rows[0].p);
  assert.deepEqual(await prepare({to:['original@example.invalid']}),{to:['original@example.invalid']});
  assert.deepEqual(await prepare({to:['changed@example.invalid']}),{to:['original@example.invalid']});
  await assert.rejects(()=>service(tx=>tx.query('select notification_finish($1,$2,true)',[job.id,randomUUID()])),/LEASE_LOST/);
  await service(tx=>tx.query('select notification_finish($1,$2,true)',[job.id,job.lease_id]));
  assert.equal((await claim()).rows.length,0);
  const old=await approve(await application());
  await db.query("update notification_outbox set first_attempt_at=now()-interval '21 hours' where id=$1",[old.notification_id]);
  assert.equal((await service(tx=>tx.query('select * from notification_claim($1,1)',[old.notification_id]))).rows.length,0);
  assert.equal((await db.query('select state from notification_outbox where id=$1',[old.notification_id])).rows[0].state,'review');
});
test('historical orders and retired invoice access are preserved',async()=>{
  assert.equal((await db.query("select id from orders where order_number='HISTORICAL-SYNTHETIC' and status='delivered' and total_amount=12")).rows.length,1);
  await denied(()=>anon(tx=>tx.query('select id from b2b_invoices')));
});

test('PostgreSQL concurrent connections: one approval, one email lease and one last-stock checkout',
  {skip: !process.env.TEST_DATABASE_URL && 'Requires the isolated PostgreSQL CI service, not single-connection PGlite'},async()=>{
    const id=await application(); const [a,b]=await Promise.all([approve(id),approve(id)]);
    assert.equal(a.company_id,b.company_id); assert.equal(a.notification_id,b.notification_id);
    assert.equal((await db.query('select id from notification_outbox where entity_id=$1',[id])).rows.length,1);
    const claims=await Promise.all([service(tx=>tx.query('select * from notification_claim($1,1)',[a.notification_id])),
      service(tx=>tx.query('select * from notification_claim($1,1)',[a.notification_id]))]);
    assert.equal(claims.reduce((n,r)=>n+r.rows.length,0),1);
    await db.exec("insert into products(id,name,price,category,stock,in_stock,visibility) values(3,'Last carton',4,'Test',4,true,'retail')");
    const attempts=await Promise.allSettled([prepare(3),prepare(3)]);
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
    assert.match(attempts.find(r=>r.status==='rejected').reason.message,/INSUFFICIENT_STOCK/);
  });

test('public application limit is enforced by the insert and does not reveal application counts',async()=>{
  const query="insert into b2b_applications(company_name,email,contact_first_name,contact_last_name,business_type,status,accept_terms,accept_privacy,confirm_accurate) values('Limit','limit@example.invalid','Test','Partner','retail','pending',true,true,true)";
  for(let i=0;i<5;i++) await anon(tx=>tx.query(query));
  await assert.rejects(()=>anon(tx=>tx.query(query)),{code:'23514'});
  assert.equal((await anon(tx=>tx.query("select check_b2b_application_limit('limit@example.invalid') n"))).rows[0].n,0);
  assert.equal((await adminCall(tx=>tx.query("select check_b2b_application_limit('limit@example.invalid') n"))).rows[0].n,5);
});
test('visitor game data is restricted to public leaderboard columns',async()=>{
  await denied(()=>anon(tx=>tx.query('select ip_address,promo_code from game_sessions')));
  await denied(()=>member(tx=>tx.query('select * from game_sessions')));
  await denied(()=>anon(tx=>tx.query("insert into game_sessions(score,player_name) values(999,'Forged')")));
  await anon(tx=>tx.query('select score,player_name,created_at from game_sessions'));
});
test('partner cannot create a public or oversized B2B document bucket',async()=>{
  await denied(()=>member(tx=>tx.query("insert into storage.buckets(id,public,file_size_limit,allowed_mime_types) values('forged',true,10485760,array['application/pdf'])")));
  await denied(()=>adminCall(tx=>tx.query("insert into storage.buckets(id,public,file_size_limit,allowed_mime_types) values('forged',true,10485761,array['application/pdf'])")));
});

test('PostgreSQL concurrent public applications cannot exceed the established five-application limit',{skip:!process.env.TEST_DATABASE_URL},async()=>{
  const q="insert into b2b_applications(company_name,email,contact_first_name,contact_last_name,business_type,status,accept_terms,accept_privacy,confirm_accurate) values('Concurrent','concurrent-limit@example.invalid','Test','Partner','retail','pending',true,true,true)";
  const outcomes=await Promise.allSettled(Array.from({length:6},()=>anon(tx=>tx.query(q))));
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,5);
  assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
  assert.equal((await db.query("select count(*)::int n from b2b_applications where email='concurrent-limit@example.invalid'")).rows[0].n,5);
});
