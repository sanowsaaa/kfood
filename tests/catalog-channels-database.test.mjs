import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { database, migrate, asRole, admin, partner, stranger, company } from './helpers/prelaunch-db.mjs';

let db, baseline, baselineFunctions, compatibilityChecked=false;
const staff=fn=>asRole(db,'authenticated',admin,fn);
const member=fn=>asRole(db,'authenticated',partner,fn);
const guest=fn=>asRole(db,'anon',null,fn);
const service=fn=>asRole(db,'service_role',null,fn);
const hash=s=>createHash('sha256').update(s).digest('hex');
const denied=fn=>assert.rejects(fn,{code:'42501'});
const product=async id=>(await db.query('select * from products where id=$1',[id])).rows[0];
async function patch(id,changes,version) {
  const token=version ?? (await product(id)).edit_version;
  return (await staff(tx=>tx.query('select * from admin_update_product($1,$2,$3::jsonb)',[id,token,JSON.stringify(changes)]))).rows[0];
}
async function request({id=1,quantity=1,attempt=randomUUID()}={}) {
  return (await service(tx=>tx.query('select b2b_create_request($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9) r',
    [partner,company,attempt,hash('request'),JSON.stringify([{id,quantity}]),'partner@example.invalid','0899000000',
      JSON.stringify({full_name:'Synthetic partner',city:'Sofia',address:'Test'}),'']))).rows[0].r;
}
async function quote(id=1,quantity=4) {
  return (await service(tx=>tx.query('select checkout_prepare($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9) r',
    [randomUUID(),hash('request'),hash('token'),JSON.stringify([{id,quantity}]),'buyer@example.invalid','0899000000',400*quantity,false,'https://example.invalid']))).rows[0].r;
}
async function paid(p,event=randomUUID()) {
  return (await service(tx=>tx.query('select checkout_apply_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16) r',
    [event,'checkout.session.completed','cs_test_'+p.order_id,p.order_id,p.attempt_id,p.order_number,false,p.total_minor,'eur','complete','paid',null,null,'succeeded',0,false]))).rows[0].r;
}

before(async()=>{
  db=await database(); await migrate(db);
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    alter table storage.buckets enable row level security;`);
  for(const file of ['20261011165307_security_reliability.sql','20261011165407_launch_compatibility.sql','20261012104200_b2b_catalog_privacy.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  }
  await db.exec(`insert into products(id,name,price,category,stock,in_stock,visibility,wholesale_price,carton_price,pieces_per_carton,sku,slug)
    values(30,'Synthetic private carton',2,'Test',100,true,'wholesale',19.99,19.99,12,'CARTON','private-carton');
    select setval('products_id_seq',30);`);
  baseline=(await db.query('select to_jsonb(p) r from products p order by id')).rows.map(x=>x.r);
  baselineFunctions=(await db.query("select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')")).rows;
  await db.exec(await readFile(new URL('../supabase/migrations/20261014134245_catalog_channels_and_admin_concurrency.sql',import.meta.url),'utf8'));
  await assert.rejects(staff(async tx=>{
    await tx.query("update products set description='Legacy editor',stock=100 where id=1 returning id");
    await tx.query("insert into products(name,price,category) values('Legacy Add',4,'Test') returning id");
    compatibilityChecked=true;
    throw new Error('ROLLBACK_COMPATIBILITY_PROBE');
  }),/ROLLBACK_COMPATIBILITY_PROBE/);
  // During the compatible phase a legacy nullable visibility must still fail closed.
  await assert.rejects(db.transaction(async tx=>{
    await tx.query('update products set visibility=null where id=1');
    await tx.query('select b2b_create_request($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9)',
      [partner,company,randomUUID(),hash('null-visibility'),JSON.stringify([{id:1,quantity:1}]),
        'partner@example.invalid','0899000000',JSON.stringify({city:'Sofia',address:'Test'}),'']);
  }),/PRODUCT_UNAVAILABLE/);

  await db.exec(await readFile(new URL('../supabase/migrations/20261014201050_finalize_catalog_admin_writes.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261015073731_product_editorial_metadata.sql',import.meta.url),'utf8'));
});
after(async()=>{await db?.close();});

test('migration preserves every original value and the actual retail and B2B catalogs',async()=>{
  const rows=(await db.query('select to_jsonb(p) r from products p order by id')).rows.map(x=>x.r);
  assert.deepEqual(rows.map(({b2b_enabled,edit_version,seo_title,seo_description,...old})=>old),baseline);
  assert.ok(rows.every(p=>p.b2b_enabled && Number(p.edit_version)===0));
  assert.deepEqual((await guest(tx=>tx.query('select id from products order by id'))).rows.map(p=>p.id),[1,2]);
  assert.deepEqual((await member(tx=>tx.query('select id from b2b_catalog() order by id'))).rows.map(p=>p.id),[1,2,30]);
});

test('phase 1 accepts the currently published administrator UI; payment and notification SQL remain unchanged',async()=>{
  assert.equal(compatibilityChecked,true);
  for(const original of baselineFunctions.filter(f=>!f.signature.includes('b2b_catalog_rows')&&!f.signature.includes('b2b_create_request'))) {
    const current=(await db.query('select pg_get_functiondef($1::regprocedure) definition',[original.signature])).rows[0].definition;
    assert.equal(current,original.definition,original.signature);
  }
});

test('all four states are enforced by guest reads, partner catalog and the B2B request server',async()=>{
  const original=await product(1);
  for(const [visibility,b2b_enabled,retail] of [
    ['retail',true,true],['retail',false,true],['wholesale',true,false],['hidden',false,false],
  ]) {
    await patch(1,{visibility,b2b_enabled});
    assert.equal((await guest(tx=>tx.query('select id from products where id=1'))).rows.length,retail?1:0);
    assert.equal((await member(tx=>tx.query('select id from b2b_catalog() where id=1'))).rows.length,b2b_enabled?1:0);
    if(b2b_enabled)assert.equal((await request()).order.is_b2b_order,true);
    else await assert.rejects(request(),/PRODUCT_UNAVAILABLE/);
  }
  const current=await product(1);
  for(const key of ['price','price_euro','wholesale_price','carton_price','stock','sku','slug','moq','pieces_per_carton'])assert.equal(current[key],original[key]);
  await patch(1,{visibility:'retail',b2b_enabled:true});
});

test('a disabled product already in a B2B cart is rejected, while an existing request retry keeps its frozen quote',async()=>{
  const attempt=randomUUID(); const saved=await request({id:30,quantity:24,attempt});
  assert.equal(Number(saved.order.total_amount),39.98);
  await patch(30,{visibility:'hidden',b2b_enabled:false});
  await assert.rejects(request({id:30,quantity:24}),/PRODUCT_UNAVAILABLE/);
  const retry=await request({id:30,quantity:24,attempt});
  assert.equal(retry.order.id,saved.order.id);
  assert.deepEqual(retry.notification_snapshot,saved.notification_snapshot);
  assert.equal((await product(30)).stock,100);
  await patch(30,{visibility:'wholesale',b2b_enabled:true});
});

test('guests, nonpartners and approved partners cannot use admin writes or read internal publication/revision columns',async()=>{
  for(const [role,actor] of [['anon',null],['authenticated',stranger],['authenticated',partner]]) {
    await denied(()=>asRole(db,role,actor,tx=>tx.query("select * from admin_update_product(1,0,'{\"stock\":999}')")));
    await denied(()=>asRole(db,role,actor,tx=>tx.query('select * from admin_delete_product(1,0)')));
    for(const column of ['b2b_enabled','edit_version','wholesale_price','cost_price']) {
      await denied(()=>asRole(db,role,actor,tx=>tx.query('select '+column+' from products')));
    }
  }
  await denied(()=>guest(tx=>tx.query('select * from b2b_catalog()')));
  await denied(()=>asRole(db,'authenticated',stranger,tx=>tx.query('select * from b2b_catalog()')));
  const row=(await staff(tx=>tx.query('select * from admin_products() where id=1'))).rows[0];
  assert.equal(row.b2b_enabled,true); assert.ok(Number(row.edit_version)>0);
});

test('old full-form PATCH, DELETE and column UPDATE cannot bypass the checked administrator API',async()=>{
  const before=await product(1);
  for(const role of ['anon','authenticated']) {
    const permissions=(await db.query("select has_table_privilege($1,'products','UPDATE') upd,has_table_privilege($1,'products','DELETE') del,has_table_privilege($1,'products','TRUNCATE') trunc,has_any_column_privilege($1,'products','UPDATE') col",[role])).rows[0];
    assert.deepEqual(permissions,{upd:false,del:false,trunc:false,col:false});
  }
  await denied(()=>staff(tx=>tx.query("update products set stock=999,description='Stale form' where id=1")));
  await denied(()=>staff(tx=>tx.query('delete from products where id=1')));
  assert.deepEqual(await product(1),before);
});

test('a real checkout stock consumption invalidates an open editor and cannot be reset to its old quantity',async()=>{
  const opened=await product(1); const p=await quote(); const event=randomUUID();
  await paid(p,event); await paid(p,event);
  const consumed=await product(1);
  assert.equal(consumed.stock,opened.stock-4);
  assert.ok(Number(consumed.edit_version)>Number(opened.edit_version));
  await assert.rejects(patch(1,{description:'Late edit',stock:opened.stock},opened.edit_version),{code:'PT409'});
  assert.equal((await product(1)).stock,consumed.stock);
  const edited=await patch(1,{description:'Fresh description'},consumed.edit_version);
  assert.equal(edited.stock,consumed.stock);
  assert.equal((await db.query('select count(*)::int n from checkout_outbox where order_id=$1',[p.order_id])).rows[0].n,1);
});

test('simultaneous administrator edits accept one revision and reject the stale competing write',async()=>{
  const opened=await product(1);
  const results=await Promise.allSettled([
    patch(1,{description:'First'},opened.edit_version),patch(1,{description:'Second'},opened.edit_version),
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.find(x=>x.status==='rejected').reason.code,'PT409');
});

test('stock holds still protect explicit quantity edits and deletion; patch failures are atomic',async()=>{
  await quote(2,3); const opened=await product(2);
  await assert.rejects(patch(2,{stock:2,description:'Must roll back'}),{code:'23514'});
  assert.deepEqual(await product(2),opened);
  await assert.rejects(staff(tx=>tx.query('select * from admin_delete_product($1,$2)',[2,opened.edit_version])),{code:'23514'});
  for(const changes of [{id:999},{edit_version:0},{slug:'bad'},{updated_at:'2000-01-01'},null,{},
    {price:-1},{stock:-1},{moq:0},{visibility:'restaurant'},{visibility:'hidden',b2b_enabled:true}]) {
    await assert.rejects(patch(2,changes));
  }
  assert.deepEqual(await product(2),opened);
});

test('new products start unpublished with no invented inventory and can be published to each channel explicitly',async()=>{
  const row=(await staff(tx=>tx.query("insert into products(name,price,category,image,sku) values('Synthetic new',4,'Test','https://example.invalid/p.jpg','NEW') returning id,visibility,stock,in_stock"))).rows[0];
  assert.equal(row.visibility,'hidden'); assert.equal(row.stock,0); assert.equal(row.in_stock,false);
  assert.equal((await product(row.id)).b2b_enabled,false);
  assert.equal((await guest(tx=>tx.query('select id from products where id=$1',[row.id]))).rows.length,0);
  await patch(row.id,{visibility:'retail',b2b_enabled:false,stock:10,in_stock:true});
  assert.equal((await guest(tx=>tx.query('select id from products where id=$1',[row.id]))).rows.length,1);
  assert.equal((await member(tx=>tx.query('select id from b2b_catalog() where id=$1',[row.id]))).rows.length,0);
  await patch(row.id,{b2b_enabled:true});
  assert.equal((await member(tx=>tx.query('select id from b2b_catalog() where id=$1',[row.id]))).rows.length,1);
  const opened=await product(row.id);
  await patch(row.id,{description:'Changed'});
  await assert.rejects(staff(tx=>tx.query('select * from admin_delete_product($1,$2)',[row.id,opened.edit_version])),{code:'PT409'});
  const current=await product(row.id);
  assert.deepEqual((await staff(tx=>tx.query('select * from admin_delete_product($1,$2)',[row.id,current.edit_version]))).rows,[{id:row.id}]);
});

test('retail-only COD still consumes stock and queues recipients once after B2B is disabled',async()=>{
  await patch(1,{visibility:'retail',b2b_enabled:false});
  const before=await product(1); const attempt=randomUUID();
  const args=[attempt,hash('cod'),JSON.stringify([{id:1,quantity:4}]),'buyer@example.invalid','0899000000',JSON.stringify({full_name:'Synthetic Buyer',city:'Sofia',address:'Test',postal_code:'1000'})];
  const create=async()=>(await service(tx=>tx.query('select cod_create_order($1,$2,$3::jsonb,$4,$5,$6::jsonb) r',args))).rows[0].r;
  const a=await create(),b=await create(); assert.equal(a.order.id,b.order.id);
  assert.equal(a.order.is_b2b_order,false); assert.equal(a.order.payment_method,'cod');
  assert.equal((await product(1)).stock,before.stock-4);
  assert.equal((await db.query('select count(*)::int n from notification_outbox where entity_id=$1',[a.order.id])).rows[0].n,3);
  assert.ok(Number((await product(1)).edit_version)>Number(before.edit_version));
});

test('editorial metadata survives actual checkout stock consumption and remains private for B2B products',async()=>{
  await db.query("update products set description='New retail description',seo_title='New retail title',seo_description='New retail snippet' where id=1");
  await db.query("update products set description='Private partner description',seo_title='Private partner title',seo_description='Private partner snippet' where id=30");
  const before=await product(1);
  const p=await quote(1,4);await paid(p);
  const after=await product(1);
  assert.equal(after.stock,before.stock-4);
  assert.equal(after.seo_title,before.seo_title);assert.equal(after.seo_description,before.seo_description);
  for(const key of ['price','price_euro','wholesale_price','carton_price','cost_price','sku','slug'])assert.deepEqual(after[key],before[key],key);
  assert.equal((await member(tx=>tx.query('select description from b2b_catalog() where id=30'))).rows[0].description,'Private partner description');
  assert.deepEqual((await guest(tx=>tx.query('select description,seo_title from products where id=30'))).rows,[]);
  const b2b=await request({id:30,quantity:24});assert.equal(Number(b2b.order.total_amount),39.98);
  await patch(1,{description:'Later administrator description'});
  const edited=await product(1);assert.equal(edited.seo_title,null);assert.equal(edited.seo_description,null);
  assert.equal(edited.price,after.price);assert.equal(edited.stock,after.stock);
});

test('a pending card quote stays valid after unpublishing without opening a new public checkout',async()=>{
  await patch(1,{visibility:'retail',b2b_enabled:true}); const p=await quote(1,4); const before=await product(1);
  await patch(1,{visibility:'hidden',b2b_enabled:false});
  await assert.rejects(quote(1,4),/PRODUCT_UNAVAILABLE/);
  await paid(p); assert.equal((await product(1)).stock,before.stock-4);
  const order=(await db.query('select is_b2b_order,payment_method from orders where id=$1',[p.order_id])).rows[0];
  assert.equal(order.is_b2b_order,false); assert.equal(order.payment_method,'stripe');
  assert.equal((await db.query('select state from checkout_payments where order_id=$1',[p.order_id])).rows[0].state,'paid');
});

test('the targeted rollback restores legacy admin writes without rolling back orders, paid stock or queued notifications',async()=>{
  const before={};
  for(const table of ['orders','products','checkout_payments','checkout_stock_holds','checkout_outbox','notification_outbox']) {
    before[table]=(await db.query('select to_jsonb(t) r from '+table+' t')).rows;
  }
  await db.exec(await readFile(new URL('../ops/catalog-channels/rollback.sql',import.meta.url),'utf8'));
  for(const table of Object.keys(before)) assert.deepEqual((await db.query('select to_jsonb(t) r from '+table+' t')).rows,before[table]);
  assert.equal((await db.query("select has_table_privilege('authenticated','products','UPDATE') allowed")).rows[0].allowed,true);
  await staff(tx=>tx.query("update products set description='Legacy editor works' where id=1"));
  assert.equal((await product(1)).description,'Legacy editor works');
  await denied(()=>guest(tx=>tx.query('select * from b2b_catalog()')));
  await denied(()=>member(tx=>tx.query('select * from admin_products()')));
});
