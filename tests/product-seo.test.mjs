import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { absoluteSiteUrl } from '../src/utils/urls.ts';
import { productSitemap, fetchSitemapProducts, refreshProductSitemap } from '../scripts/productSitemap.ts';

let db, pool, beforeRows;
const migration = await readFile(new URL('../supabase/migrations/20261010060218_product_slugs_and_seo.sql', import.meta.url), 'utf8');
before(async () => {
  if (process.env.TEST_DATABASE_URL) {
    const url = new URL(process.env.TEST_DATABASE_URL);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/kfood_test') throw Error('Requires a disposable loopback kfood_test database');
    pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
    const client = await pool.connect();
    db = { exec: q => client.query(q), query: (q, p) => client.query(q, p), close: async () => { client.release(); await pool.end(); } };
    await db.exec('drop schema public cascade; create schema public;');
  } else db = new PGlite();
  await db.exec(`do $$ begin
    if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  end $$;
  create table public.products(id serial primary key, name text not null, slug text unique,
    price numeric not null default 4.50, wholesale_price numeric default 3, stock integer default 40,
    visibility text default 'retail', created_at timestamptz default now(), updated_at timestamptz default now());
  alter table public.products enable row level security;
  create policy public_read on public.products for select using(true);
  create policy admin_write on public.products for all to authenticated using(current_setting('test.is_admin',true)='yes') with check(current_setting('test.is_admin',true)='yes');
  grant usage on schema public to anon,authenticated,service_role;
  grant select on public.products to anon;
  grant all on public.products to authenticated,service_role;
  grant usage on sequence public.products_id_seq to authenticated,service_role;
  insert into public.products(name,slug) values
    ('Соджу старо име','jinro-soju'),('Рамен Buldak 140 г',null),('Рамен Buldak 140 г',null),
    ('Алое Кинг – Златно киви 500 мл',null),('Café × 24',null);`);
  beforeRows = (await db.query('select * from public.products order by id')).rows;
  await db.exec(`begin; ${migration} commit;`);
});
after(async () => { await db?.close(); });

test('backfill preserves existing URLs, prices, stock and visibility; identical names get distinct addresses', async () => {
  const rows = (await db.query('select * from public.products order by id')).rows;
  assert.equal(rows[0].slug, 'jinro-soju');
  assert.equal(rows[1].slug, 'ramen-buldak-140-g');
  assert.equal(rows[2].slug, 'ramen-buldak-140-g-3');
  assert.equal(rows[3].slug, 'aloe-king-zlatno-kivi-500-ml');
  assert.equal(rows[4].slug, 'cafe-x-24');
  const business = ({ slug, updated_at, ...row }) => row;
  assert.deepEqual(rows.map(business), beforeRows.map(business));
});
test('admin creation without slug works and renaming/empty slug cannot accidentally change its URL', async () => {
  await db.exec("begin; set local role authenticated; set local test.is_admin='yes';");
  try {
    const row = (await db.query("insert into public.products(name) values('Ягода и йогурт 60 г') returning id,slug")).rows[0];
    assert.equal(row.slug,'yagoda-i-yogurt-60-g');
    const edited = (await db.query("update public.products set name='Ново име',slug='',price=8 where id=$1 returning slug,price",[row.id])).rows[0];
    assert.equal(edited.slug,row.slug); assert.equal(Number(edited.price),8);
  } finally { await db.exec('rollback'); }
});
test('multi-row inserts allocate unique slugs, including a collision with an existing ID suffix', async () => {
  await db.exec('begin');
  try {
    await db.query("insert into public.products(id,name,slug) values(3001,'Reserved','kimchi-3002')");
    await db.query("insert into public.products(id,name) values(3000,'Кимчи'),(3002,'Кимчи')");
    const rows = (await db.query('select id,slug from public.products where id>=3000 order by id')).rows;
    assert.deepEqual(rows.map(row=>row.slug),['kimchi','kimchi-3002','kimchi-3002-2']);
  } finally { await db.exec('rollback'); }
});
test('invalid explicit/numeric slugs are rejected and anonymous callers do not gain write access', async () => {
  for (const slug of ['123','Wrong URL','bad/slug','-broken']) {
    await assert.rejects(db.query('insert into public.products(name,slug) values($1,$2)',['Product',slug]),/INVALID_PRODUCT_SLUG/);
  }
  await db.exec('begin; set local role anon;');
  try { await assert.rejects(db.query("insert into public.products(name) values('Forbidden')"),/permission denied/); }
  finally { await db.exec('rollback'); }
  const funcs = (await db.query("select proname,prosecdef,proconfig from pg_proc where proname in ('product_slug_base','ensure_product_slug') order by proname")).rows;
  assert.equal(funcs.length,2); assert.equal(funcs.every(row=>row.prosecdef===false),true);
});
test('concurrent PostgreSQL inserts of the same name both succeed with unique URLs', {skip: !process.env.TEST_DATABASE_URL}, async () => {
  const results = await Promise.all([pool.query("insert into public.products(name) values('Concurrent кимчи') returning slug"),pool.query("insert into public.products(name) values('Concurrent кимчи') returning slug")]);
  assert.equal(new Set(results.map(result=>result.rows[0].slug)).size,2);
});
test('relative and absolute canonical inputs produce the same single-domain URL', () => {
  const expected = 'https://k-foodvelikotarnovo.com/product/ramen-buldak-140-g';
  assert.equal(absoluteSiteUrl('/product/ramen-buldak-140-g'),expected);
  assert.equal(absoluteSiteUrl(expected),expected);
  assert.equal(absoluteSiteUrl('/product/ramen-buldak-140-g','https://k-foodvelikotarnovo.com/'),expected);
});
test('sitemap includes every product exactly once and refuses partial/duplicate inventories', async () => {
  const rows = (await db.query('select id,slug,created_at,updated_at from public.products order by id')).rows;
  const xml = productSitemap(rows);
  assert.equal((xml.match(/<loc>/g)||[]).length,rows.length);
  for (const row of rows) assert.ok(xml.includes(`/product/${row.slug}</loc>`));
  for (const bad of [[],[...rows,rows[0]],[{id:1,slug:null}],[{id:1,slug:'123'}]]) assert.throws(()=>productSitemap(bad));
  assert.equal(productSitemap([{id:1,slug:'valid',updated_at:'invalid'}]).includes('<lastmod>'),false);
});
test('inventory fetching follows pagination and uses public fields only', async () => {
  const first = Array.from({length:1000},(_,i)=>({id:i+1,slug:`product-${i+1}`}));
  const calls=[];
  const fetcher = async (url,options) => {
    calls.push({url:new URL(url),options});
    return Response.json(calls.length===1 ? first : [{id:1001,slug:'last-product'}],{headers:{'Content-Range':calls.length===1?'0-999/1001':'1000-1000/1001'}});
  };
  const rows = await fetchSitemapProducts({supabaseUrl:'https://example.supabase.co',anonKey:'public-test-key'},fetcher);
  assert.equal(rows.length,1001); assert.equal(calls[1].url.searchParams.get('offset'),'1000');
  assert.equal(calls[0].url.searchParams.get('select'),'id,slug,updated_at,created_at');
  assert.equal(calls[0].options.headers.apikey,'public-test-key');
  assert.ok(productSitemap(rows).includes('/product/last-product'));
});
test('a lower API row limit cannot silently truncate the sitemap inventory', async () => {
  const offsets=[];
  const fetcher=async url=>{
    const offset=Number(new URL(url).searchParams.get('offset'));offsets.push(offset);
    const all=[{id:1,slug:'first'},{id:2,slug:'second'},{id:3,slug:'third'}];
    return Response.json(all.slice(offset,offset+2),{headers:{'Content-Range':`${offset}-${Math.min(offset+1,2)}/3`}});
  };
  const rows=await fetchSitemapProducts({supabaseUrl:'https://example.supabase.co',anonKey:'public-test-key'},fetcher);
  assert.equal(rows.length,3);assert.deepEqual(offsets,[0,2]);
});
test('a network failure or incomplete inventory retains the last good sitemap; a complete response updates it', async () => {
  const directory=await mkdtemp(join(tmpdir(),'kfood-sitemap-')),destination=join(directory,'sitemap-products.xml'),warnings=[];
  const good=productSitemap([{id:1,slug:'saved-product'}]); await writeFile(destination,good);
  const opts={supabaseUrl:'https://example.supabase.co',anonKey:'public-test-key'};
  try {
    for (const fetcher of [async()=>{throw Error('offline');},async()=>Response.json([{id:2,slug:null}]),async()=>new Response('error',{status:503})]) {
      assert.equal(await refreshProductSitemap(opts,destination,message=>warnings.push(message),fetcher),false);
      assert.equal(await readFile(destination,'utf8'),good);
    }
    assert.equal(await refreshProductSitemap(opts,destination,message=>warnings.push(message),async()=>Response.json([{id:2,slug:'new-product'}],{headers:{'Content-Range':'0-0/1'}})),true);
    assert.ok((await readFile(destination,'utf8')).includes('/product/new-product'));
    assert.equal(warnings.length,3);
  } finally {await rm(directory,{recursive:true,force:true});}
});
