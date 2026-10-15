import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProductHtmlHandler, checkedPublicProduct, HTML_PRODUCT_FIELDS, PILOT_PRODUCTS } from '../server/product-html.mjs';
import { renderProduct, renderMissing } from '../.seo-pilot/server/entry.mjs';

const template = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const target = PILOT_PRODUCTS[0];
const row = { ...target, name: 'Тестов корейски рамен', description: 'Първи абзац за конкретния продукт.\n\nВтори абзац с идея за сервиране.',
  price: 3.30, image: 'https://res.cloudinary.com/kfood-test/image/upload/ramen.webp', category: 'Нудъли и Рамен',
  badge: '', in_stock: true, stock: 12, visibility: 'retail', weight: '130 г', volume: null,
  seo_title: 'Индивидуален тестов рамен | K-FOOD', seo_description: 'Точно описание на тестовия рамен.' };
const request = (path = `/product/${target.slug}`, options) => new Request(`https://k-foodvelikotarnovo.com${path}`, options);
const schema = html => [...html.matchAll(/<script type="application\/ld\+json" data-seo-managed="true">([\s\S]*?)<\/script>/g)]
  .flatMap(match => JSON.parse(match[1])['@graph'] || []);
function setup(fetcher = async () => Response.json([row]), overrides = {}) {
  return createProductHtmlHandler({ template, supabaseUrl: 'https://fixture.supabase.co', publicKey: 'sb_publishable_offline',
    renderProduct, renderMissing, fetcher, ...overrides });
}

test('compiled React renders content, unique metadata and a matching Product/Offer before JavaScript', async () => {
  const response = await setup()(request()); const html = await response.text();
  assert.equal(response.status, 200); assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, follow');
  assert.match(html, /<title>Индивидуален тестов рамен \| K-FOOD<\/title>/);
  assert.match(html, /<h1[^>]*>Тестов корейски рамен<\/h1>/);
  assert.match(html, /Първи абзац за конкретния продукт\./); assert.match(html, /Втори абзац с идея за сервиране\./);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes(`href="https://k-foodvelikotarnovo.com/product/${target.slug}"`));
  const products = schema(html).filter(x => x['@type'] === 'Product'); assert.equal(products.length, 1);
  assert.equal(products[0].name, row.name); assert.equal(products[0].image, row.image); assert.equal(products[0].description, row.description);
  assert.equal(products[0].offers.price, '3.30'); assert.equal(products[0].offers.priceCurrency, 'EUR');
  assert.equal(products[0].offers.availability, 'https://schema.org/InStock');
  assert.equal(products[0].aggregateRating, undefined); assert.equal(products[0].brand, undefined);
  assert.ok(!html.includes('id="loading-screen"')); assert.ok(html.includes('id="root"'));
  assert.ok(html.includes('/seo-product-bridge.js')); assert.match(html, /5% от €50/);
});

test('fresh reads prevent old HTML after price, stock, publication and upstream availability change', async () => {
  let current = [structuredClone(row)]; let fail = false;
  const handler = setup(async (_url, options) => { assert.equal(options.cache, 'no-store'); return fail ? new Response('private upstream diagnostic', { status: 503 }) : Response.json(current); });
  assert.equal(schema(await (await handler(request())).text())[0].offers.price, '3.30');
  current[0].price = 4.12; current[0].stock = 0;
  const changed = await handler(request()); const html = await changed.text();
  assert.equal(schema(html)[0].offers.price, '4.12'); assert.equal(schema(html)[0].offers.availability, 'https://schema.org/OutOfStock');
  assert.match(changed.headers.get('Cache-Control'), /no-store/); assert.equal(changed.headers.get('CDN-Cache-Control'), 'no-store');
  current = [];
  const hidden = await handler(request()); const hiddenHtml = await hidden.text();
  assert.equal(hidden.status, 200); assert.match(hidden.headers.get('X-Robots-Tag'), /noindex/);
  assert.ok(!hiddenHtml.includes(row.name)); assert.equal(schema(hiddenHtml).length, 0); assert.ok(hiddenHtml.includes('Продуктът не е намерен'));
  fail = true;
  const unavailable = await handler(request()); assert.equal(unavailable.status, 503); assert.equal(unavailable.headers.get('Retry-After'), '60');
  const failed = await unavailable.text(); assert.ok(!failed.includes(row.name)); assert.ok(!failed.includes('private upstream diagnostic'));
  assert.equal(schema(failed).length, 0); assert.match(failed, /Временно не успяхме/);
});

test('administrator cookies, authorization and query secrets are never forwarded or serialized', async () => {
  const calls = [];
  const handler = setup(async (url, options) => { calls.push({ url: new URL(url), options }); return Response.json([{ ...row,
    wholesale_price: 1.23, carton_price: 29.52, cost_price: 0.88, sku: 'DO-NOT-SERIALIZE-SKU', company_email: 'private-company@example.invalid' }]); });
  const html = await (await handler(request(`/product/${target.slug}?email=secret-email@example.invalid&token=private-proof`,
    { headers: { Authorization: 'Bearer signed-in-admin-secret', Cookie: 'private-session-cookie', 'User-Agent': 'Googlebot' } }))).text();
  assert.equal(calls.length, 1); const { url, options } = calls[0];
  assert.equal(url.searchParams.get('select'), HTML_PRODUCT_FIELDS); assert.equal(url.searchParams.get('visibility'), 'eq.retail');
  assert.equal(url.searchParams.get('id'), `eq.${target.id}`); assert.equal(url.searchParams.get('slug'), `eq.${target.slug}`);
  assert.deepEqual(options.headers, { apikey: 'sb_publishable_offline', Accept: 'application/json' });
  for (const value of ['signed-in-admin-secret', 'private-session-cookie', 'secret-email', 'private-proof', 'DO-NOT-SERIALIZE-SKU', 'private-company', 'wholesale_price', 'carton_price', 'cost_price']) assert.ok(!html.includes(value), value);
});

test('the bounded allowlist excludes private, unknown and write routes while numeric URLs use the product canonical', async () => {
  let calls = 0;
  const handler = setup(async () => { calls++; return Response.json([row]); });
  for (const path of ['/b2b', '/b2b/products', `/b2b/product/${target.id}`, '/admin', '/cart', '/checkout', '/track-order',
    '/product/unlisted-product', `/product/${target.slug}/extra`, `/product/${target.slug}/`, `/product/${target.slug}%2fanything`]) assert.equal(await handler(request(path)), null, path);
  assert.equal(await handler(request(`/product/${target.slug}`, { method: 'POST', body: 'unchanged' })), null); assert.equal(calls, 0);
  const numeric = await handler(request(`/product/${target.id}`)); const html = await numeric.text();
  assert.ok(html.includes(`rel="canonical" href="https://k-foodvelikotarnovo.com/product/${target.slug}"`));
  const head = await handler(request(undefined, { method: 'HEAD' })); assert.equal(await head.text(), ''); assert.equal(head.headers.get('Set-Cookie'), null);
});

test('server secrets are rejected and a legacy anonymous key never inherits the caller session', async () => {
  const jwt = role => ['header', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');
  for (const key of ['sb_secret_private', jwt('service_role'), jwt('authenticated'), 'not-a-public-credential']) assert.throws(() => setup(undefined, { publicKey: key }), /Only a publishable key/);
  let sent; const key = jwt('anon');
  await setup(async (_u, o) => { sent = o.headers; return Response.json([row]); }, { publicKey: key })(request());
  assert.equal(sent.Authorization, `Bearer ${key}`);
  assert.throws(() => setup(undefined, { products: [...PILOT_PRODUCTS, { id: 999, slug: 'sixth' }] }), /five-product/);
});

test('catalog strings are escaped in HTML and JSON-LD; bad identity, private rows and unsafe images fail closed', async () => {
  const malicious = { ...row, name: '</h1><script>window.bad=1</script>', seo_title: '</title><script>window.bad=2</script>',
    seo_description: '" /><script>window.bad=3</script>', description: '</script><script>window.bad=4</script>' };
  const html = await (await setup(async () => Response.json([malicious]))(request())).text();
  assert.ok(!/<script>window\.bad=/.test(html)); assert.match(html, /&lt;script&gt;window.bad=1/);
  assert.equal(schema(html)[0].name, malicious.name); assert.equal(schema(html)[0].description, malicious.description); assert.ok(html.includes('\\u003c/script>'));
  for (const change of [{ image: 'javascript:alert(1)' }, { image: 'https://static.readdy.ai/photo?token=private' },
    { visibility: 'wholesale' }, { visibility: 'hidden' }, { id: 9999 }, { price: 3.305 }, { stock: -1 }, { category: 'Алкохол' }]) {
    const body = await (await setup(async () => Response.json([{ ...row, ...change }]))(request())).text(); assert.equal(schema(body).length, 0); assert.ok(!body.includes(row.name));
  }
});

test('indexing is explicit and crawler requests receive the same product metadata as other visitors', async () => {
  const handler = setup(undefined, { indexable: true });
  const user = await handler(request()); const bot = await handler(request(undefined, { headers: { 'User-Agent': 'Googlebot' } }));
  assert.match(user.headers.get('X-Robots-Tag'), /^index,/); assert.equal(user.headers.get('Vary'), null);
  assert.deepEqual(schema(await user.text()), schema(await bot.text()));
});

test('projection discards unrequested business columns', () => {
  const projected = checkedPublicProduct({ ...row, wholesale_price: 1.20, cost_price: 0.40, sku: 'private-fixture' }, target);
  assert.equal(projected.wholesale_price, undefined); assert.equal(projected.sku, undefined); assert.equal(projected.cost_price, undefined); assert.equal(projected.price, row.price);
});

test('source timeout returns a retryable failure without an old offer', async () => {
  const handler = setup((_url, options) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(Response.json([row])), 1000);
    options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal.reason); }, { once: true });
  }), { timeoutMs: 5 });
  const response = await handler(request()); assert.equal(response.status, 503); assert.equal(response.headers.get('Retry-After'), '60');
  const html = await response.text(); assert.ok(!html.includes(row.name)); assert.equal(schema(html).length, 0);
});
