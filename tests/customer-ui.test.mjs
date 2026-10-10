// Optional compiled-app QA. Every browser request is fulfilled locally; nothing reaches production.
// Supply CUSTOMER_PLAYWRIGHT_MODULE_PATH and CUSTOMER_BROWSER_EXECUTABLE if not installed globally.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.CUSTOMER_PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.CUSTOMER_PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = 'http://127.0.0.1:4317';
const artifacts = process.env.CUSTOMER_TEST_ARTIFACTS;
const orderNumber = 'ORD-20261008-0123456789abcdef0123456789abcdef';
const token = 'a'.repeat(64);
const image = 'https://static.readdy.ai/offline-customer-product.svg';
const products = [
  { id: 17, name: 'Корейски рамен Samyang Buldak', slug: 'ramen-buldak', description: 'Пикантен корейски рамен с автентичен вкус.', price: 4.9, image, category: 'Нудъли и Рамен', in_stock: true, stock: 100, badge: '', rating: 4.8, reviews: 12 },
  { id: 18, name: 'Кимчи традиционно', slug: 'kimchi', description: 'Ферментирало кимчи.', price: 8.5, image, category: 'Продукти за готвене', in_stock: true, stock: 5, badge: '', rating: 4.7, reviews: 8 },
  { id: 19, name: 'Изчерпан десерт', slug: 'dessert', description: '', price: 2.5, image, category: 'Десерти', in_stock: true, stock: 0, badge: '', rating: 4.5, reviews: 5 },
  { id: 20, name: 'Корейско соджу', slug: 'soju', description: 'Алкохолна напитка.', price: 7.5, image, category: 'Алкохол', in_stock: true, stock: 20, badge: '', rating: 5, reviews: 1 },
];
const cart = (quantity = 3) => [{ ...products[0], quantity }];
const proof = { [`order-proof:${orderNumber}`]: token, [`order-cart:${orderNumber}`]: JSON.stringify([{ id: 17, quantity: 3 }]) };
const order = { order_number: orderNumber, status: 'processing', total_amount: 14.7, currency: 'EUR', customer_phone: '0899000000', created_at: '2026-10-08T09:00:00Z', payment_method: 'stripe', shipping_address: { full_name: 'Тест Клиент', address: 'Тестов адрес', city: 'Велико Търново', postal_code: '5000' }, items: [{ name: products[0].name, quantity: 3, price: 4.9 }], tracking_notes: 'Поръчката се подготвя за изпращане.' };
const browserOptions = { headless: true, executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE, args: process.env.CUSTOMER_BROWSER_SINGLE_PROCESS === '1' ? ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu'] : ['--no-sandbox'] };
before(async () => { if (artifacts) await mkdir(artifacts, { recursive: true }); });

async function setup(options = {}) {
  const browser = await chromium.launch(browserOptions);
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.addInitScript(options => {
    if (options.consent !== null) localStorage.setItem('cookieConsent', options.consent || 'declined');
    if (options.cart !== undefined) localStorage.setItem('cart', typeof options.cart === 'string' ? options.cart : JSON.stringify(options.cart));
    if (options.recent) localStorage.setItem('recently_viewed', options.recent);
    for (const [key, value] of Object.entries(options.session || {})) sessionStorage.setItem(key, value);
    window.__pixelCalls = [];
    window.fbq = (...args) => window.__pixelCalls.push(args);
    if (options.storageFailure) {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === sessionStorage && key.startsWith('kfood_checkout_attempt')) throw new DOMException('quota', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    }
  }, options);
  const requests = [], errors = [];
  const rows = structuredClone(products);
  let readFailure = options.readFailure;
  let creationFailure = options.creationFailure;
  let stateIndex = 0;
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.origin === base) {
      const file = url.pathname.startsWith('/assets/') ? url.pathname.slice(1) : 'index.html';
      if (file.includes('..')) return route.abort();
      return route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(new URL(`../dist/${file}`, import.meta.url)) });
    }
    if (url.hostname === 'checkout.stripe.com') return route.fulfill({ contentType: 'text/html', body: '<h1>Offline Stripe destination</h1>' });
    if (url.pathname.includes('/functions/v1/')) {
      const name = url.pathname.split('/').at(-1), body = req.postDataJSON(); requests.push({ name, body, method: req.method() });
      if (options.delay && ['create-checkout', 'checkout-status'].includes(name)) await new Promise(resolve => setTimeout(resolve, options.delay));
      if (name === 'create-checkout') return creationFailure ? reply({ error: 'Временен проблем с плащането.' }, 503) : reply({ url: options.redirect || 'https://checkout.stripe.com/c/pay/cs_test_offline', orderNumber });
      if (name === 'checkout-status') {
        if (body.email) return options.trackingFailure ? reply({ error: 'Не намерихме поръчка с тези данни.' }, options.trackingFailure) : reply({ order, paymentState: options.paymentState || 'paid' });
        const states = options.states || ['paid']; const paymentState = states[Math.min(stateIndex++, states.length - 1)];
        return reply({ orderNumber, paymentState, totalAmountMinor: options.invalidPaid ? 0 : 1470, currency: 'EUR', livemode: options.livemode === true });
      }
      return reply({ error: 'Offline endpoint not configured' }, 404);
    }
    if (url.pathname.includes('/rest/v1/')) {
      const table = url.pathname.split('/').at(-1), method = req.method(); requests.push({ table, method, body: req.postDataJSON(), url: url.href });
      if (options.delay && method !== 'GET') await new Promise(resolve => setTimeout(resolve, options.delay));
      if (readFailure && table === 'products') return reply({ code: '42501', message: 'denied' }, 403);
      if (method !== 'GET') return options.writeFailure ? reply({ code: '42501', message: 'denied' }, 403) : reply(null, 201);
      let data = table === 'products' ? rows : [];
      for (const field of ['id', 'slug', 'category']) {
        const filter = url.searchParams.get(field);
        if (filter?.startsWith('eq.')) data = data.filter(row => String(row[field]) === filter.slice(3));
        if (filter?.startsWith('neq.')) data = data.filter(row => String(row[field]) !== filter.slice(4));
        if (filter?.startsWith('in.(')) data = data.filter(row => filter.slice(4, -1).split(',').includes(String(row[field])));
      }
      if (url.searchParams.get('in_stock')) data = data.filter(row => row.in_stock);
      if (url.searchParams.get('stock') === 'gt.0') data = data.filter(row => row.stock > 0);
      return reply(req.headers()['accept']?.includes('vnd.pgrst.object') ? data[0] ?? null : data);
    }
    if (url.pathname.includes('/api/form/')) {
      requests.push({ name: 'newsletter', method: req.method(), body: req.postData() });
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
      return reply({}, options.writeFailure ? 503 : 200);
    }
    requests.push({ asset: url.href, method: req.method() });
    if (req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#fff7ed"/><rect x="95" y="75" width="210" height="350" rx="20" fill="#b91c1c"/><text x="200" y="240" text-anchor="middle" fill="white" font-size="28">K-FOOD</text></svg>' });
    if (url.pathname.endsWith('remixicon.css') && process.env.CUSTOMER_TEST_FONT_CSS) return route.fulfill({ contentType: 'text/css', body: await readFile(process.env.CUSTOMER_TEST_FONT_CSS, 'utf8') });
    return route.fulfill({ body: '', contentType: req.resourceType() === 'stylesheet' ? 'text/css' : 'text/plain' });
  });
  return { page, context, requests, errors, rows, close: () => browser.close(), recoverRead: () => { readFailure = false; }, recoverCreation: () => { creationFailure = false; } };
}
async function ready(page, path, heading) { await page.goto(base + path); if (heading) await page.getByRole('heading', { name: heading, exact: true }).waitFor(); }
for (const path of ['/product/ramen-buldak', '/product/17']) {
  test(`SEO product URL: ${path} resolves to one slug in canonical, OG, Offer and breadcrumb`, async () => {
    const qa = await setup();
    try {
      await ready(qa.page, path, products[0].name);
      await qa.page.waitForURL('**/product/ramen-buldak');
      const expected = 'https://k-foodvelikotarnovo.com/product/ramen-buldak';
      await qa.page.waitForFunction(url => document.querySelector('link[rel="canonical"]')?.href === url, expected);
      const metadata = await qa.page.evaluate(() => ({
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(element => element.href),
        og: document.querySelector('meta[property="og:url"]')?.content,
        graph: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(element => { const value = JSON.parse(element.textContent || '{}'); return value['@graph'] || [value]; }),
      }));
      assert.deepEqual(metadata.canonical, [expected]);
      assert.equal(metadata.og, expected);
      assert.equal(metadata.graph.find(value => value['@type'] === 'Product').offers.url, expected);
      assert.equal(metadata.graph.find(value => value['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, expected);
      assert.equal(qa.requests.some(request => request.method !== 'GET' && request.method !== undefined), false);
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  });
}
function visiblePay(page) { return page.getByRole('button', { name: /Към плащане/ }).filter({ visible: true }); }
async function contact(page) { await page.getByLabel('Имейл адрес').fill('buyer@example.invalid'); await page.getByLabel('Телефон', { exact: false }).fill('0899 123 456'); }
async function sameTick(locator) { await locator.evaluate(button => { button.click(); button.click(); }); }
async function waitEnabled(locator) { await locator.waitFor(); for (let n = 0; n < 100 && await locator.isDisabled(); n++) await locator.page().waitForTimeout(40); assert.equal(await locator.isEnabled(), true); }
const calls = (requests, name) => requests.filter(row => row.name === name);
async function shot(page, name) { if (artifacts) await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true }); }

for (const width of [390, 1440]) {
  test(`${width}px guest: catalog → product → cart → checkout → Stripe preserves the server contract`, async () => {
    const qa = await setup({ width }); const { page, requests, errors } = qa;
    try {
      await ready(page, '/products', 'Корейска Храна Онлайн');
      await page.locator('[data-product-shop]').getByRole('link', { name: products[0].name, exact: true }).click();
      await page.getByRole('heading', { name: products[0].name, exact: true }).waitFor();
      const increase = page.getByRole('button', { name: 'Увеличи количество' }).filter({ visible: true });
      await increase.click(); await increase.click();
      await page.getByRole('button', { name: /Добави в количката/ }).filter({ visible: true }).click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cart'))[0].quantity), 3);
      await page.getByRole('link', { name: 'Количка', exact: true }).filter({ visible: true }).click();
      const checkout = page.getByRole('button', { name: 'Поръчай и плати', exact: true }).filter({ visible: true });
      await waitEnabled(checkout); await shot(page, `cart-${width}`); await checkout.click();
      await page.getByRole('heading', { name: 'Завършване на поръчка', exact: true }).waitFor();
      assert.equal(await page.getByText('Поръчвате без регистрация.', { exact: false }).isVisible(), true);
      await contact(page); await waitEnabled(visiblePay(page)); await shot(page, `checkout-${width}`);
      await sameTick(visiblePay(page)); await page.waitForURL('https://checkout.stripe.com/**');
      const creates = calls(requests, 'create-checkout'); assert.equal(creates.length, 1);
      assert.deepEqual(creates[0].body.items, [{ id: 17, quantity: 3 }]); assert.equal(creates[0].body.expectedTotalMinor, 1470);
      assert.equal(creates[0].body.customerEmail, 'buyer@example.invalid'); assert.equal(creates[0].body.customerPhone, '0899123456');
      assert.match(creates[0].body.statusToken, /^[a-f0-9]{64}$/); assert.match(creates[0].body.attemptId, /^[a-f0-9-]{36}$/);
      assert.equal(requests.some(row => row.table === 'orders'), false);
      assert.equal(requests.some(row => /notification|send-|generate-product/.test(row.name || '')), false);
      assert.deepEqual(errors, []);
    } finally { await qa.close(); }
  });
}

test('home/category/search: existing links resolve and URL search survives a reload', async () => {
  const qa = await setup(); const { page } = qa;
  try {
    await ready(page, '/'); await page.getByRole('link', { name: 'Категории', exact: true }).filter({ visible: true }).first().click();
    await page.getByRole('heading', { name: 'Категории Корейска Храна', exact: true }).waitFor();
    const links = await page.locator('a[href^="/category/"]').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    assert(links.includes('/category/noodles')); assert.equal(links.some(href => /\/category\/\d/.test(href)), false);
    await page.locator('a[href="/category/noodles"]').first().click(); await page.getByRole('link', { name: products[0].name, exact: true }).first().waitFor();
    await ready(page, '/products?search=кимчи', 'Корейска Храна Онлайн');
    await page.getByRole('link', { name: 'Кимчи традиционно', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: products[0].name, exact: true }).count(), 0);
    await page.reload(); assert.equal(await page.getByRole('textbox', { name: 'Търси продукт' }).inputValue(), 'кимчи');
    await page.getByRole('button', { name: 'Изчисти търсенето', exact: true }).first().click();
    await page.getByRole('link', { name: products[0].name, exact: true }).waitFor();
    await shot(page, 'catalog-desktop');
  } finally { await qa.close(); }
});

test('catalog: denied reads show a retry instead of a false empty store and recover', async () => {
  const qa = await setup({ readFailure: true });
  try {
    await ready(qa.page, '/products'); await qa.page.getByRole('alert').waitFor();
    assert.equal(await qa.page.getByText('Няма намерени продукти', { exact: true }).count(), 0);
    qa.recoverRead(); await qa.page.getByRole('button', { name: 'Опитай отново', exact: true }).click();
    await qa.page.getByRole('link', { name: products[0].name, exact: true }).waitFor(); assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('drafts: corrupt cart/recently viewed storage cannot crash guest pages; zero stock stays disabled', async () => {
  const qa = await setup({ cart: '{bad', recent: '[{"id":17,"price":"bad"}]' });
  try {
    await ready(qa.page, '/cart', 'Количката е празна');
    await ready(qa.page, '/products', 'Корейска Храна Онлайн');
    const card = qa.page.locator('[data-product-shop] > div').filter({ has: qa.page.getByRole('link', { name: 'Изчерпан десерт', exact: true }) });
    assert.equal(await card.getByRole('button', { name: 'Добави в количката', exact: true }).isDisabled(), true);
    await ready(qa.page, '/'); await qa.page.getByRole('heading', { name: 'Топ продукти', exact: true }).waitFor(); assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('checkout: invalid contacts, refreshed price and changed stock stop creation before redirect', async () => {
  const qa = await setup({ cart: cart() }); const { page, rows, requests } = qa;
  try {
    await ready(page, '/checkout', 'Завършване на поръчка'); await waitEnabled(visiblePay(page));
    await visiblePay(page).click(); assert.equal(await page.getByLabel('Имейл адрес').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.getByLabel('Имейл адрес').evaluate(node => node === document.activeElement), true);
    assert.equal(calls(requests, 'create-checkout').length, 0);
    await contact(page); rows[0].price = 5.2; await visiblePay(page).click();
    await page.getByRole('alert').filter({ hasText: 'Цените са обновени' }).waitFor(); assert.equal(calls(requests, 'create-checkout').length, 0);
    rows[0].stock = 2; await visiblePay(page).click();
    await page.getByRole('alert').filter({ hasText: /наличност/ }).waitFor(); assert.equal(calls(requests, 'create-checkout').length, 0);
  } finally { await qa.close(); }
});

test('checkout: a failed request retries the same attempt; unsafe redirect does not navigate', async () => {
  const qa = await setup({ cart: cart(), creationFailure: true, redirect: 'https://evil.invalid/pay', delay: 150 }); const { page, requests } = qa;
  try {
    await ready(page, '/checkout', 'Завършване на поръчка'); await contact(page); await waitEnabled(visiblePay(page));
    await sameTick(visiblePay(page)); await page.getByRole('alert').filter({ hasText: /Временен проблем/ }).waitFor();
    assert.equal(calls(requests, 'create-checkout').length, 1);
    qa.recoverCreation(); await visiblePay(page).click(); await page.getByRole('alert').filter({ hasText: /линк|адрес/i }).waitFor();
    const creates = calls(requests, 'create-checkout'); assert.equal(creates.length, 2);
    assert.equal(creates[0].body.attemptId, creates[1].body.attemptId); assert.equal(creates[0].body.statusToken, creates[1].body.statusToken);
    assert.equal(new URL(page.url()).pathname, '/checkout');
  } finally { await qa.close(); }
});

test('checkout: unavailable proof storage prevents a payment request; below-minimum orders remain blocked', async () => {
  const qa = await setup({ cart: cart(), storageFailure: true });
  try {
    await ready(qa.page, '/checkout', 'Завършване на поръчка'); await contact(qa.page); await waitEnabled(visiblePay(qa.page));
    await visiblePay(qa.page).click(); await qa.page.getByRole('alert').filter({ hasText: /съхранението/ }).waitFor();
    assert.equal(calls(qa.requests, 'create-checkout').length, 0);
  } finally { await qa.close(); }
  const minimum = await setup({ cart: cart(1) });
  try { await ready(minimum.page, '/checkout', 'Завършване на поръчка'); assert.equal(await visiblePay(minimum.page).isDisabled(), true); }
  finally { await minimum.close(); }
});

test('success: waits for server payment, clears only its basket and excludes sandbox purchases', async () => {
  const qa = await setup({ cart: cart(), session: proof, states: ['awaiting_payment', 'paid'], consent: 'accepted' });
  try {
    await ready(qa.page, `/order-success?orderNumber=${orderNumber}&session_id=cs_test_sensitive`, 'Проверяваме плащането');
    assert.equal(await qa.page.evaluate(() => JSON.parse(localStorage.getItem('cart')).length), 1);
    await qa.page.getByRole('heading', { name: 'Плащането е потвърдено!', exact: true }).waitFor();
    assert.equal(await qa.page.evaluate(() => JSON.parse(localStorage.getItem('cart')).length), 0);
    assert.equal(new URL(qa.page.url()).searchParams.has('session_id'), false);
    assert.equal(await qa.page.evaluate(() => window.__pixelCalls.some(row => row[1] === 'Purchase')), false);
    assert.equal(await qa.page.getByText('Това е тестово плащане в Stripe.', { exact: true }).isVisible(), true);
    await qa.page.getByRole('link', { name: 'Проследи поръчката', exact: true }).click();
    assert.equal(await qa.page.getByLabel('Номер на поръчка', { exact: true }).inputValue(), orderNumber);
    assert.equal(new URL(qa.page.url()).searchParams.has('email'), false);
  } finally { await qa.close(); }
});

test('success: an older paid order keeps a newer basket and only a confirmed live purchase is counted', async () => {
  const qa = await setup({ cart: cart(4), session: proof, consent: 'accepted', livemode: true });
  try {
    await ready(qa.page, `/order-success?orderNumber=${orderNumber}`, 'Плащането е потвърдено!');
    assert.equal(await qa.page.evaluate(() => JSON.parse(localStorage.getItem('cart'))[0].quantity), 4);
    assert.equal(await qa.page.evaluate(() => window.__pixelCalls.filter(row => row[1] === 'Purchase').length), 1);
  } finally { await qa.close(); }
});

for (const [state, title] of [['failed', 'Плащането не е завършено'], ['review', 'Поръчката се проверява от екипа']]) {
  test(`success: ${state} never clears the basket or reports a completed payment`, async () => {
    const qa = await setup({ cart: cart(), session: proof, states: [state] });
    try {
      await ready(qa.page, `/order-success?orderNumber=${orderNumber}`, title);
      assert.equal(await qa.page.evaluate(() => JSON.parse(localStorage.getItem('cart')).length), 1);
      assert.equal(await qa.page.getByRole('heading', { name: 'Плащането е потвърдено!', exact: true }).count(), 0);
    } finally { await qa.close(); }
  });
}

test('success: missing proof provides guest tracking without claiming paid status', async () => {
  const qa = await setup({ cart: cart() });
  try {
    await ready(qa.page, `/order-success?orderNumber=${orderNumber}`, 'Проверете статуса на поръчката');
    assert.equal(calls(qa.requests, 'checkout-status').length, 0);
    assert.equal(await qa.page.getByRole('link', { name: 'Проследи поръчката', exact: true }).isVisible(), true);
  } finally { await qa.close(); }
});

test('tracking: guest credentials go only to the server, old email links are cleaned, delivery and payment are separate', async () => {
  const qa = await setup({ width: 390 });
  try {
    await ready(qa.page, `/track-order?order=${orderNumber.toUpperCase()}&email=buyer%40example.invalid`, 'Проследяване на поръчка');
    await qa.page.getByRole('heading', { name: 'Обработва се', exact: true }).waitFor();
    assert.equal(new URL(qa.page.url()).searchParams.has('email'), false);
    assert.equal(qa.requests.some(row => row.table === 'orders'), false);
    assert.deepEqual(calls(qa.requests, 'checkout-status')[0].body, { orderNumber: orderNumber.toUpperCase(), email: 'buyer@example.invalid' });
    assert.equal(await qa.page.getByText('Плащането е потвърдено', { exact: true }).isVisible(), true);
    assert.equal(await qa.page.locator('li[aria-current="step"]').textContent().then(text => text.includes('Подготвя се')), true);
    await shot(qa.page, 'tracking-mobile');
  } finally { await qa.close(); }
});

test('tracking: a slow result is discarded after editing credentials; errors preserve the form', async () => {
  const qa = await setup({ delay: 500, trackingFailure: 404 });
  try {
    await ready(qa.page, '/track-order', 'Проследяване на поръчка');
    await qa.page.getByLabel('Номер на поръчка', { exact: true }).fill(orderNumber);
    await qa.page.getByLabel('Имейл от поръчката', { exact: true }).fill('wrong@example.invalid');
    await sameTick(qa.page.getByRole('button', { name: 'Проследи поръчка', exact: true }));
    await qa.page.getByLabel('Имейл от поръчката', { exact: true }).fill('new@example.invalid');
    await qa.page.waitForTimeout(650); assert.equal(await qa.page.getByRole('alert').count(), 0);
    await qa.page.getByRole('button', { name: 'Проследи поръчка', exact: true }).click();
    await qa.page.getByRole('alert').waitFor(); assert.equal(await qa.page.getByLabel('Имейл от поръчката', { exact: true }).inputValue(), 'new@example.invalid');
    assert.equal(calls(qa.requests, 'checkout-status').length, 2);
  } finally { await qa.close(); }
});

test('tracking: a confirmed delivery stage with unknown payment never becomes a paid badge', async () => {
  const qa = await setup({ paymentState: 'unknown' });
  try {
    await ready(qa.page, `/track-order?order=${orderNumber}&email=buyer%40example.invalid`, 'Проследяване на поръчка');
    await qa.page.getByRole('heading', { name: 'Обработва се', exact: true }).waitFor();
    assert.equal(await qa.page.getByText('Плащането е потвърдено', { exact: true }).count(), 0);
    assert.equal(await qa.page.getByText(/Този екран още не потвърждава/).isVisible(), true);
  } finally { await qa.close(); }
});

test('mobile: filters and quick view support keyboard focus, Escape and scrolling', async () => {
  const qa = await setup({ width: 390 });
  try {
    await ready(qa.page, '/products', 'Корейска Храна Онлайн');
    assert.equal(await qa.page.getByRole('dialog').count(), 0);
    const filter = qa.page.getByRole('button', { name: 'Филтри', exact: true }); await filter.click();
    await qa.page.getByRole('dialog', { name: 'Филтри', exact: true }).waitFor(); await qa.page.keyboard.press('Escape');
    assert.equal(await filter.evaluate(node => node === document.activeElement), true);
    const quick = qa.page.getByRole('button', { name: `Бърз преглед на ${products[0].name}`, exact: true }); await quick.click();
    const dialog = qa.page.getByRole('dialog', { name: products[0].name, exact: true }); await dialog.waitFor();
    assert.equal(await qa.page.evaluate(() => document.body.style.touchAction), '');
    await dialog.getByRole('button', { name: /Добави/ }).scrollIntoViewIfNeeded(); await shot(qa.page, 'quick-view-mobile');
    await qa.page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert.equal(await quick.evaluate(node => node === document.activeElement), true);
    assert.equal(await qa.page.evaluate(() => document.body.style.overflow), '');
  } finally { await qa.close(); }
});

test('age gate: direct alcohol product and home add cannot bypass the existing confirmation', async () => {
  const qa = await setup();
  try {
    await ready(qa.page, '/'); await qa.page.getByRole('heading', { name: 'Топ продукти', exact: true }).waitFor();
    const card = qa.page.locator('[data-product-shop] > div').filter({ has: qa.page.getByRole('heading', { name: 'Корейско соджу', exact: true }) });
    await card.getByRole('button', { name: 'Добави в количката', exact: true }).click();
    await qa.page.getByRole('dialog').waitFor(); assert.equal(new URL(qa.page.url()).pathname, '/product/soju');
    assert.equal(await qa.page.evaluate(() => JSON.parse(localStorage.getItem('cart')).length), 0);
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('newsletter/reviews: a rejected request retains the draft and same-tick submits once', async () => {
  const qa = await setup({ writeFailure: true, delay: 200 });
  try {
    await ready(qa.page, '/'); await qa.page.getByRole('textbox', { name: 'Имейл за бюлетина', exact: true }).fill('buyer@example.invalid');
    await sameTick(qa.page.getByRole('button', { name: 'Абонирай се', exact: true })); await qa.page.getByRole('alert').waitFor();
    assert.equal(calls(qa.requests, 'newsletter').length, 1); assert.equal(calls(qa.requests, 'newsletter')[0].body, 'email=buyer%40example.invalid');
    assert.equal(await qa.page.getByRole('textbox', { name: 'Имейл за бюлетина', exact: true }).inputValue(), 'buyer@example.invalid');
    await ready(qa.page, '/leave-review', 'Остави ревю'); await qa.page.getByRole('button', { name: '5 звезди', exact: true }).click();
    await qa.page.getByLabel('Твоето име').fill('Тест Клиент'); await qa.page.getByLabel('Твоят отзив').fill('Запазена чернова');
    await sameTick(qa.page.getByRole('button', { name: 'Изпрати ревюто', exact: true })); await qa.page.getByRole('alert').waitFor();
    const writes = qa.requests.filter(row => row.table === 'reviews' && row.method === 'POST'); assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].body, { name: 'Тест Клиент', rating: 5, text: 'Запазена чернова', product_name: null });
    assert.equal(await qa.page.getByLabel('Твоят отзив').inputValue(), 'Запазена чернова');
  } finally { await qa.close(); }
});

test('consent: opening privacy grants no consent and declined browsing sends no marketing event', async () => {
  const qa = await setup({ width: 320, consent: null });
  try {
    await ready(qa.page, '/'); const dialog = qa.page.getByRole('dialog', { name: 'Използваме бисквитки', exact: true }); await dialog.waitFor();
    await dialog.getByRole('link', { name: /поверителност/ }).click();
    assert.equal(await qa.page.evaluate(() => localStorage.getItem('cookieConsent')), null);
    assert.equal(new URL(qa.page.url()).pathname, '/privacy');
    assert.equal(await qa.page.evaluate(() => window.__pixelCalls.length), 0);
    assert.equal(qa.requests.some(row => row.asset && /facebook\.com|facebook\.net/.test(row.asset)), false);
  } finally { await qa.close(); }
});

for (const width of [320, 390, 1440]) {
  test(`${width}px layout: customer screens fit the viewport and functional text/controls stay readable`, async () => {
    const qa = await setup({ width, cart: cart(), session: proof });
    try {
      for (const path of ['/products', '/category/noodles', '/product/ramen-buldak', '/cart', '/checkout', '/track-order', `/order-success?orderNumber=${orderNumber}`, '/leave-review']) {
        await ready(qa.page, path); await qa.page.locator('h1').waitFor(); await qa.page.waitForTimeout(120);
        const issues = await qa.page.evaluate(() => {
          const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
          const inputs = [...document.querySelectorAll('input:not([aria-hidden="true"]), textarea, select')].filter(visible);
          const buttons = [...document.querySelectorAll('.customer-shell button')].filter(visible);
          const nav = document.querySelector('nav[aria-label="Бърза навигация"]');
          return { overflow: document.documentElement.scrollWidth > innerWidth, inputSize: inputs.some(element => parseFloat(getComputedStyle(element).fontSize) < (innerWidth < 768 ? 16 : 12)), smallButton: buttons.some(element => element.getBoundingClientRect().height < 43 || element.getBoundingClientRect().width < 43), transparentNavigation: !!(nav && visible(nav) && getComputedStyle(nav).backgroundColor === 'rgba(0, 0, 0, 0)') };
        });
        assert.deepEqual(issues, { overflow: false, inputSize: false, smallButton: false, transparentNavigation: false }, path);
      }
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  });
}
