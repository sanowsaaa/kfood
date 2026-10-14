import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database, migrate, asRole, admin, partner, stranger, company } from './helpers/prelaunch-db.mjs';

let db;
const anon = fn => asRole(db, 'anon', null, fn);
const member = fn => asRole(db, 'authenticated', partner, fn);
const outsider = fn => asRole(db, 'authenticated', stranger, fn);
const staff = fn => asRole(db, 'authenticated', admin, fn);
const denied = fn => assert.rejects(fn, { code: '42501' });
async function staffPatch(id,changes) {
  const version=(await db.query('select edit_version from products where id=$1',[id])).rows[0].edit_version;
  return staff(tx=>tx.query('select id from admin_update_product($1,$2,$3::jsonb)',[id,version,JSON.stringify(changes)]));
}
before(async () => {
  db = await database();
  await migrate(db);
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    alter table storage.buckets enable row level security;`);
  for (const file of ['20261011165307_security_reliability.sql', '20261011165407_launch_compatibility.sql', '20261012104200_b2b_catalog_privacy.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.exec(`update products set slug='retail-noodles' where id=1;
    insert into products(id,name,slug,price,category,visibility,wholesale_price,carton_price,moq,pieces_per_carton,cost_price)
    values (30,'Synthetic wholesale only','private-carton',9,'Test','wholesale',6,72,1,12,2);
    insert into b2b_pricing_tiers(name) values ('Synthetic partner tier');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261014134245_catalog_channels_and_admin_concurrency.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261014134432_finalize_catalog_admin_writes.sql',import.meta.url),'utf8'));
});
after(async () => { await db?.close(); });

test('guests can read retail products but cannot resolve a wholesale ID or slug', async () => {
  assert.equal((await anon(tx => tx.query('select id,slug,price from products where id=1'))).rows.length, 1);
  for (const [field, value] of [['id', 30], ['slug', 'private-carton']]) {
    assert.deepEqual((await anon(tx => tx.query(`select id,name,slug,price from products where ${field}=$1`, [value]))).rows, []);
  }
  assert.deepEqual((await anon(tx => tx.query('select distinct visibility from products'))).rows, [{ visibility: 'retail' }]);
});

test('B2B fields are denied on retail rows too, for guests and authenticated nonpartners', async () => {
  for (const field of ['wholesale_price', 'carton_price', 'moq', 'moq_unit', 'pieces_per_carton', 'cost_price']) {
    await denied(() => anon(tx => tx.query(`select ${field} from products where id=1`)));
    await denied(() => outsider(tx => tx.query(`select ${field} from products where id=1`)));
  }
  await denied(() => anon(tx => tx.query('select * from products')));
});

test('anonymous and nonpartner callers cannot use the checked catalog', async () => {
  await denied(() => anon(tx => tx.query('select * from b2b_catalog()')));
  await denied(() => outsider(tx => tx.query('select * from b2b_catalog()')));
  await denied(() => outsider(async tx => {
    await tx.query("select set_config('request.jwt.claim.email','staff@example.invalid',true)");
    return tx.query('select * from b2b_catalog()');
  }));
  assert.deepEqual((await outsider(tx => tx.query('select id from products where id=30'))).rows, []);
});

test('approved partners get the existing catalog, exact prices and stable ID/slug filters, without costs', async () => {
  const rows = (await member(tx => tx.query('select * from b2b_catalog() order by id'))).rows;
  assert.deepEqual(rows.map(row => row.id), [1, 2, 30]);
  assert.ok(rows.every(row => !('cost_price' in row)));
  const wholesale = (await member(tx => tx.query("select * from b2b_catalog() where slug='private-carton'"))).rows[0];
  assert.equal(Number(wholesale.wholesale_price), 6);
  assert.equal(Number(wholesale.carton_price), 72);
  assert.equal(wholesale.pieces_per_carton, 12);
  assert.equal((await member(tx => tx.query('select id from b2b_catalog() where id=30'))).rows.length, 1);
  await denied(() => member(tx => tx.query('select wholesale_price from products')));
  await assert.rejects(() => member(tx => tx.query('select cost_price from b2b_catalog()')), { code: '42703' });
});

test('pending approval, suspension and an unconfirmed email each revoke catalog access immediately', async () => {
  for (const status of ['pending', 'suspended']) {
    await db.query('update b2b_companies set status=$1 where id=$2', [status, company]);
    await denied(() => member(tx => tx.query('select * from b2b_catalog()')));
  }
  await db.query("update b2b_companies set status='active' where id=$1", [company]);
  await db.query('update auth.users set email_confirmed_at=null where id=$1', [partner]);
  await denied(() => member(tx => tx.query('select * from b2b_catalog()')));
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [partner]);
  assert.equal((await member(tx => tx.query('select id from b2b_catalog()'))).rows.length, 3);
});

test('a different company owner and a deleted Auth user cannot reuse approval', async () => {
  await db.query('update b2b_companies set user_id=$1 where id=$2', [stranger, company]);
  await denied(() => member(tx => tx.query('select * from b2b_catalog()')));
  await db.query('update b2b_companies set user_id=$1 where id=$2', [partner, company]);
  await db.query('delete from auth.users where id=$1', [partner]);
  await denied(() => member(tx => tx.query('select * from b2b_catalog()')));
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'partner@example.invalid',now())", [partner]);
  await db.query('update b2b_companies set user_id=$1 where id=$2', [partner, company]);
});

test('pricing tiers are private, while existing approved-partner and administrator reads work', async () => {
  await denied(() => anon(tx => tx.query('select * from b2b_pricing_tiers')));
  assert.deepEqual((await outsider(tx => tx.query('select * from b2b_pricing_tiers'))).rows, []);
  assert.equal((await member(tx => tx.query('select * from b2b_pricing_tiers'))).rows.length, 1);
  assert.equal((await staff(tx => tx.query('select * from b2b_pricing_tiers'))).rows.length, 1);
});

test('administrator product editing, visibility changes and deletion retain their existing permissions', async () => {
  assert.equal((await staff(tx => tx.query('select cost_price from admin_products() where id=30'))).rows.length, 1);
  assert.equal((await staff(tx => tx.query('select id from products where id=30'))).rows.length, 1);
  assert.equal((await staffPatch(30,{wholesale_price:7,cost_price:3})).rows.length, 1);
  await staffPatch(30,{visibility:'retail'});
  assert.equal((await anon(tx => tx.query('select id from products where id=30'))).rows.length, 1);
  await staffPatch(30,{visibility:'wholesale'});
  assert.equal((await anon(tx => tx.query('select id from products where id=30'))).rows.length, 0);
  await denied(() => member(tx => tx.query('select * from admin_products()')));
  const version=(await db.query('select edit_version from products where id=30')).rows[0].edit_version;
  assert.equal((await staff(tx => tx.query('select * from admin_delete_product(30,$1)',[version]))).rows.length, 1);
});

test('the exposed wrapper uses invoker privileges; privileged helpers are outside the Data API', async () => {
  const functions = (await db.query(`select n.nspname,p.proname,p.prosecdef,p.proconfig from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where p.proname in ('b2b_catalog','b2b_catalog_rows','can_read_b2b_catalog')`)).rows;
  assert.equal(functions.find(fn => fn.proname === 'b2b_catalog').prosecdef, false);
  assert.ok(functions.filter(fn => fn.prosecdef).every(fn => fn.nspname === 'private' && fn.proconfig.includes('search_path=""')));
});
