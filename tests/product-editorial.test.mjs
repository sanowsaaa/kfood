import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { productEditorialSql, validateProductEditorial } from '../scripts/productEditorial.mjs';
import { productSEO, productDescriptionParagraphs } from '../src/utils/productSEO.ts';
import { productSitemap } from '../scripts/productSitemap.ts';

const migrations = new URL('../supabase/migrations/',import.meta.url);
const metadataMigrations = (await readdir(migrations)).filter(name=>name.endsWith('_product_editorial_metadata.sql'));
assert.equal(metadataMigrations.length,1);
const migration = await readFile(new URL(metadataMigrations[0],migrations),'utf8');
const example = (id,visibility='retail') => ({id,name:`Тестов продукт ${id}`,slug:`test-product-${id}`,visibility,
  expected_description:id===1?null:'Original description',
  description:`Тестов продукт ${id} с описание на конкретната му употреба. Текстът е предназначен за продуктовата страница и не задава цени, наличности, каталожни номера или публикация.\n\nИдея за сервиране според вида на продукта.`,
  seo_title:`Тестов продукт ${id} | K-FOOD`,seo_description:`Описание на тестов продукт ${id} с точна идентичност и конкретно предназначение.`});
const editorial = {project:'quqlovoiwgqfmgjumpgd',products:[example(1),example(2,'wholesale'),example(3,'hidden')]};
const getRows = async db => (await db.query('select * from products order by id')).rows;
const protectedFields = row => Object.fromEntries(Object.entries(row).filter(([key])=>!['description','seo_title','seo_description','updated_at','edit_version'].includes(key)));

async function fixture() {
  const db=new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema private;
    create table products(id integer primary key,name text,slug text,visibility text,description text,
      price numeric,price_euro numeric,wholesale_price numeric,carton_price numeric,cost_price numeric,
      sku text,ean text,stock integer,in_stock boolean,b2b_enabled boolean,moq integer,pieces_per_carton integer,
      image text,category text,weight text,volume text,created_at timestamptz,updated_at timestamptz,
      edit_version bigint default 4, future_protected_field jsonb default '{"keep":"exact"}');
    grant usage on schema public to anon,authenticated;
    grant select(id,name,description,slug,visibility) on products to anon,authenticated;
    alter table products enable row level security;
    create policy public_retail on products for select to anon,authenticated using(visibility='retail');
    create function private.stamp() returns trigger language plpgsql as $$begin new.edit_version:=old.edit_version+1;new.updated_at:=clock_timestamp();return new;end$$;
    create trigger stamp before update on products for each row execute function private.stamp();`);
  for (const p of [...editorial.products,example(9)]) await db.query(`insert into products(id,name,slug,visibility,description,
    price,price_euro,wholesale_price,carton_price,cost_price,sku,ean,stock,in_stock,b2b_enabled,moq,pieces_per_carton,
    image,category,weight,volume,created_at,updated_at) values($1,$2,$3,$4,$5,3.30,3.30,2.17,26.04,1.06,
    '0012345','08801234567890',28,true,true,3,12,'https://example.test/photo.webp','Keep category','Keep weight','Keep volume',now(),now())`,
    [p.id,p.name,p.slug,p.visibility,p.expected_description]);
  const original=await getRows(db);
  await db.exec(migration);
  return {db,original};
}

test('SEO migration is additive, preserves values and keeps private rows and cost columns inaccessible',async()=>{
  const {db,original}=await fixture();
  try {
    const rows=await getRows(db);
    assert.deepEqual(rows.map(protectedFields),original.map(protectedFields));
    assert.equal(rows.every(p=>p.seo_title===null&&p.seo_description===null),true);
    await db.exec(productEditorialSql(editorial));
    await db.exec('set role anon');
    const visible=(await db.query('select id,seo_title,seo_description from products order by id')).rows;
    assert.deepEqual(visible.map(p=>p.id),[1,9]);assert.equal(visible[0].seo_title,editorial.products[0].seo_title);
    await assert.rejects(db.query('select cost_price from products'),/permission denied/);
    await assert.rejects(db.query("update products set seo_title='Unauthorized' where id=1"),/permission denied/);
  }finally{await db.close();}
});

test('all descriptions update together; every price, SKU/EAN, B2B flag and unknown field survives apply and rollback',async()=>{
  const {db}=await fixture();
  try {
    // A live admin/checkout change after research is preserved, never restored.
    await db.exec("update products set price=4.12,stock=21,sku='001-NEW',ean='0001112223334' where id=2");
    const before=await getRows(db);
    await db.exec(productEditorialSql(editorial));
    const after=await getRows(db);
    assert.deepEqual(after.map(protectedFields),before.map(protectedFields));
    for(let i=0;i<3;i++)assert.equal(after[i].description,editorial.products[i].description);
    assert.deepEqual(after[3],before[3]);
    await db.exec("update products set wholesale_price=1.99,stock=19 where id=1");
    const beforeRollback=await getRows(db);
    await db.exec(productEditorialSql(editorial,'rollback'));
    const reverted=await getRows(db);
    assert.deepEqual(reverted.map(protectedFields),beforeRollback.map(protectedFields));
    assert.equal(reverted[0].description,null);assert.equal(reverted[1].description,'Original description');
    assert.equal(reverted[0].seo_title,null);assert.equal(reverted[0].stock,19);
  }finally{await db.close();}
});

test('concurrent name, description, publication or removal changes each abort the whole batch',async()=>{
  const {db}=await fixture();
  try {
    for(const statement of ["update products set name='Admin edit' where id=2", "update products set description='Admin edit' where id=3",
      "update products set visibility='wholesale' where id=1",'delete from products where id=2']){
      await db.exec('begin');await db.exec(statement);const before=await getRows(db);
      await assert.rejects(db.exec(productEditorialSql(editorial)),/edited after the snapshot/);
      await db.exec('rollback');
      assert.ok(before.length>=3);
      assert.equal((await getRows(db))[0].seo_title,null);
    }
  }finally{await db.close();}
});

test('a trigger changing any protected value aborts all writes; content rollback refuses newer admin edits',async()=>{
  const {db}=await fixture();
  try {
    const before=await getRows(db);
    await db.exec(`create function private.bad_price() returns trigger language plpgsql as $$begin if new.id=2 then new.price:=new.price+1;end if;return new;end$$;
      create trigger bad_price before update on products for each row execute function private.bad_price();`);
    await assert.rejects(db.exec(productEditorialSql(editorial)),/Protected product field changed/);
    assert.deepEqual(await getRows(db),before);
    await db.exec('drop trigger bad_price on products');await db.exec(productEditorialSql(editorial));
    await assert.rejects(db.exec(productEditorialSql(editorial)),/edited after the snapshot/);
    await db.exec("update products set description='Newer admin content' where id=1");
    const changed=await getRows(db);
    await assert.rejects(db.exec(productEditorialSql(editorial,'rollback')),/edited after the snapshot/);
    assert.deepEqual(await getRows(db),changed);
  }finally{await db.close();}
});

test('admin content edits clear obsolete metadata, while price, SKU and stock changes retain it',async()=>{
  const {db}=await fixture();
  try {
    await db.exec(productEditorialSql(editorial));
    await db.exec("update products set price=4.20,sku='NEW',stock=20 where id=1");
    assert.equal((await getRows(db))[0].seo_title,editorial.products[0].seo_title);
    await db.exec("update products set description='New admin description' where id=1");
    const row=(await getRows(db))[0];assert.equal(row.seo_title,null);assert.equal(row.seo_description,null);
    assert.equal(row.price,'4.20');
    await db.exec("update products set name='New name' where id=2");
    assert.equal((await getRows(db))[1].seo_title,null);
  }finally{await db.close();}
});

test('plain text validation rejects missing identities, duplicates, HTML and SQL delimiter collisions',()=>{
  for(const change of [p=>{p.products.push(p.products[0]);},p=>{p.products[0].slug='bad/slug';},p=>{p.products[0].description='<script>Bad</script>';},
    p=>{p.products[0].seo_title='a'.repeat(161);},p=>{p.products[0].price=99;p.products[0].description+=' $kfood_product_payload_20261015$';}]){
    const p=structuredClone(editorial);change(p);assert.throws(()=>productEditorialSql(p));
  }
  assert.equal(validateProductEditorial(editorial),editorial);
  // Supplied unrelated properties cannot become assignments.
  const p=structuredClone(editorial);p.products[0].price=99;p.products[0].sku='Override';
  const sql=productEditorialSql(p);assert.doesNotMatch(sql,/set price|set sku|"Override"/i);
});

test('metadata has useful fallbacks without stale price/stock or fabricated origin; paragraphs remain plain text',()=>{
  assert.deepEqual(productSEO({name:'Продукт',description:'Актуално описание',price:9.99}),{title:'Продукт | K-FOOD',description:'Актуално описание'});
  assert.deepEqual(productSEO({name:'Продукт',description:'Body',seo_title:'Specific title',seo_description:'Specific snippet'}),{title:'Specific title',description:'Specific snippet'});
  const fallback=productSEO({name:'Name',description:'<p>Useful **text**.</p> '.repeat(40)});
  assert.ok(fallback.description.length<=160);assert.doesNotMatch(fallback.description,/<|\*\*/);
  assert.deepEqual(productDescriptionParagraphs('First paragraph\n\nSecond paragraph'),['First paragraph','Second paragraph']);
  assert.deepEqual(productDescriptionParagraphs(null),[]);
});

test('image sitemap lists public image URLs, escapes XML and rejects signed or unsafe URLs',()=>{
  const xml=productSitemap([{id:1,slug:'real-product',image:'https://images.example.test/a.webp?x=1&y=2'}]);
  assert.match(xml,/xmlns:image=/);assert.match(xml,/<image:loc>https:\/\/images.example.test\/a.webp\?x=1&amp;y=2<\/image:loc>/);
  for(const image of ['javascript:alert(1)','http://example.test/a.png','https://example.test/a.png?token=secret','https://user:pass@example.test/a.png'])
    assert.throws(()=>productSitemap([{id:1,slug:'real-product',image}]));
});
