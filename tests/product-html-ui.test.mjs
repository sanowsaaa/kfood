// Compiled-app QA. All network traffic is intercepted; no order or email is sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createProductHtmlHandler, PILOT_PRODUCTS } from '../server/product-html.mjs';
import { renderProduct, renderMissing } from '../.seo-pilot/server/entry.mjs';

const { chromium } = await import(process.env.CUSTOMER_PLAYWRIGHT_MODULE_PATH
  ? pathToFileURL(process.env.CUSTOMER_PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const base = 'http://127.0.0.1:4317';
const product = { ...PILOT_PRODUCTS[0], name: 'HTML пилот — корейски рамен',
  description: 'Публичен първи абзац за рамен.\n\nВтори абзац с идея за сервиране.',
  price: 3.30, image: 'https://res.cloudinary.com/kfood-test/image/upload/ramen.webp',
  category: 'Нудъли и Рамен', badge: '', rating: 0, reviews: 0, in_stock: true, stock: 12,
  visibility: 'retail', weight: '130 г', volume: null, seo_title: 'HTML пилот рамен | K-FOOD',
  seo_description: 'Индивидуално описание на рамен в HTML.' };

async function setup(options = {}) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE,
    args: process.env.CUSTOMER_BROWSER_SINGLE_PROCESS === '1'
      ? ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu'] : ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: 900 },
    serviceWorkers: 'block', javaScriptEnabled: options.javascript !== false, reducedMotion: 'reduce' });
  await context.addInitScript(cart => {
    localStorage.setItem('cookieConsent', 'declined');
    if (cart) localStorage.setItem('cart', JSON.stringify(cart));
  }, options.cart);
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  const handle = createProductHtmlHandler({ template, supabaseUrl: 'https://fixture.supabase.co',
    publicKey: 'sb_publishable_offline', renderProduct, renderMissing,
    fetcher: async () => Response.json([product]) });
  const rows = structuredClone(options.rows || [product]);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    requests.push({ method: req.method(), url: url.href });
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.origin === base) {
      if (req.isNavigationRequest()) {
        const response = await handle(new Request(url, { method: req.method() }));
        if (response) return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
      }
      const file = url.pathname.startsWith('/assets/') || ['/seo-product-bridge.js', '/service-worker.js'].includes(url.pathname)
        ? url.pathname.slice(1) : 'index.html';
      if (file.includes('..')) return route.abort();
      return route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html',
        body: await readFile(new URL(`../dist/${file}`, import.meta.url)) });
    }
    if (url.pathname.includes('/rest/v1/products')) {
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
      if (options.readError) return reply({ message: 'Offline upstream failure' }, 503);
      let data = rows;
      for (const field of ['id', 'slug', 'visibility', 'category']) {
        const filter = url.searchParams.get(field);
        if (filter?.startsWith('eq.')) data = data.filter(row => String(row[field]) === filter.slice(3));
        if (filter?.startsWith('neq.')) data = data.filter(row => String(row[field]) !== filter.slice(4));
        if (filter?.startsWith('in.(')) data = data.filter(row => filter.slice(4, -1).split(',').includes(String(row[field])));
      }
      if (url.searchParams.has('limit')) data = data.slice(0, Number(url.searchParams.get('limit')));
      return reply(req.headers()['accept']?.includes('vnd.pgrst.object') ? data[0] || null : data);
    }
    if (req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#ff208a"/></svg>' });
    if (req.resourceType() === 'stylesheet') return route.fulfill({ contentType: 'text/css', body: '' });
    return reply({});
  });
  return { page, errors, requests, close: () => browser.close() };
}

for (const width of [1440, 390]) {
  test(`HTML content, metadata and description remain readable without JavaScript at ${width}px`, async () => {
    const qa = await setup({ width, javascript: false });
    try {
      await qa.page.goto(`${base}/product/${product.slug}`);
      assert.ok(await qa.page.getByRole('heading', { level: 1, name: product.name, exact: true }).isVisible());
      assert.equal(await qa.page.title(), product.seo_title);
      assert.equal(await qa.page.locator('link[rel="canonical"]').count(), 1);
      assert.equal(await qa.page.locator('#root').textContent(), '');
      assert.equal(await qa.page.locator('#loading-screen').count(), 0);
      assert.ok(await qa.page.getByText('Публичен първи абзац за рамен.', { exact: true }).isVisible());
      assert.ok(qa.requests.every(request => request.method === 'GET'));
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  });
  test(`the original app takes over and preserves the existing basket at ${width}px`, async () => {
    const cart = [{ id: 103, name: 'Запазен продукт', price: 2.30, image: product.image, quantity: 2, category: 'Десерти' }];
    const qa = await setup({ width, cart, delay: 75 });
    try {
      await qa.page.goto(`${base}/product/${product.slug}`);
      await qa.page.locator('#root [data-public-product-state="ready"]').waitFor();
      await qa.page.waitForFunction(() => !document.getElementById('kfood-product-html') && !document.getElementById('root').hidden);
      assert.equal(await qa.page.getByRole('heading', { level: 1, name: product.name, exact: true }).count(), 1);
      await qa.page.getByRole('button', { name: 'Добави в количката', exact: true }).filter({ visible: true }).click();
      await qa.page.waitForFunction(id => JSON.parse(localStorage.getItem('cart') || '[]').some(item => item.id === id), product.id);
      const saved = await qa.page.evaluate(() => JSON.parse(localStorage.getItem('cart')));
      assert.equal(saved.find(item => item.id === 103).quantity, 2);
      assert.equal(saved.find(item => item.id === product.id).quantity, 1);
      assert.ok(qa.requests.every(request => request.method === 'GET'));
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  });
}

test('a product hidden after the HTML read is removed when the public app rechecks it', async () => {
  const qa = await setup({ rows: [], delay: 100 });
  try {
    await qa.page.goto(`${base}/product/${product.slug}`);
    await qa.page.getByRole('heading', { name: 'Продуктът не е намерен', exact: true }).waitFor();
    await qa.page.waitForFunction(() => !document.getElementById('kfood-product-html') && !document.getElementById('root').hidden);
    await qa.page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === 'noindex, follow');
    assert.equal(await qa.page.getByRole('heading', { name: product.name, exact: true }).count(), 0);
    assert.equal(await qa.page.locator('script[data-seo-managed]').evaluateAll(nodes => nodes.some(node => node.textContent.includes('"@type":"Product"'))), false);
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('a failed public refresh replaces the preview with the existing retry interface', async () => {
  const qa = await setup({ readError: true, delay: 75 });
  try {
    await qa.page.goto(`${base}/product/${product.slug}`);
    await qa.page.getByRole('button', { name: /Опитай|Опитайте/ }).waitFor();
    await qa.page.waitForFunction(() => !document.getElementById('kfood-product-html') && !document.getElementById('root').hidden);
    assert.equal(await qa.page.getByRole('heading', { name: product.name, exact: true }).count(), 0);
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});
