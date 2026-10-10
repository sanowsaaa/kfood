// Logged-in B2B frontend QA against the compiled app. ALL network requests are
// intercepted: these tests never create real accounts, orders, payments or emails.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.B2B_PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.B2B_PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = 'http://127.0.0.1:4317';
const artifacts = process.env.B2B_TEST_ARTIFACTS;
const env = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '');
const project = (process.env.VITE_PUBLIC_SUPABASE_URL || env.match(/VITE_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/)?.[1] || 'https://quqlovoiwgqfmgjumpgd.supabase.co').split('//')[1].split('.')[0];
const company = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', company_name: 'Тестов B2B партньор', email: 'partner@example.invalid', phone: '0899123456', city: 'София', address: 'Тестов адрес 12', postal_code: '1000', business_type: 'restaurant', status: 'active', created_at: '2026-01-01T00:00:00Z', credit_limit: 0 };
const img = 'https://static.readdy.ai/offline-b2b-product.svg';
const common = { description: 'Описание на продукта за локална проверка.', image: img, category: 'Нудъли и Рамен', badge: '', rating: 4.8, reviews: 12, in_stock: true, stock: 1200, moq: 1, moq_unit: 'кашон' };
const products = [
  { ...common, id: 17, name: 'Рамен без текстов адрес', slug: null, sku: 'KR-017', price: 2, wholesale_price: 7, carton_price: 7, pieces_per_carton: 12 },
  { ...common, id: 18, name: 'Кимчи традиционно', slug: 'kimchi', sku: 'KR-018', category: 'Продукти за готвене', price: 8, wholesale_price: 5, carton_price: 48, pieces_per_carton: 0 },
  { ...common, id: 19, name: 'Рамен пикантен', slug: 'ramen', sku: 'KR-019', price: 3, wholesale_price: 24, carton_price: 24, pieces_per_carton: 12 },
];
const orderNumber = 'B2B-20261009-0123456789abcdef0123456789abcdef';
const order = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', order_number: orderNumber, b2b_company_id: company.id, total_amount: 7, status: 'confirmed', created_at: '2026-10-09T12:00:00Z', items: [{ id: 17, name: products[0].name, price: 0.58, quantity: 12, pieces_per_carton: 12, carton_price: 7, line_total_minor: 700, image: img, sku: 'KR-017' }], admin_discount_percent: null, discount_notes: null };
const documents = [{ id: 'doc-1', title: 'Тестова ценова листа', description: 'Локален тестов документ', file_type: 'pdf', category: 'price_list', created_at: '2026-10-09T12:00:00Z', storage_path: 'company/test.pdf', file_url: '', visibility: 'company', company_id: company.id }];
const basket = () => [{ product: products[0], quantity: 12 }];

async function setup(options = {}) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.B2B_BROWSER_EXECUTABLE, args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true });
  const profile = { ...company, ...options.company };
  const user = { id: profile.user_id, email: profile.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp })).toString('base64url') + '.offline-test';
  await context.addInitScript(({ project, profile, user, token, exp, options }) => {
    if (sessionStorage.getItem('offline-b2b-seeded')) return;
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('slugGenDone1', 'true');
    localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'offline-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }));
    if (options.cart !== undefined) {
      localStorage.setItem('b2b_cart_owner', options.cartOwner || profile.id);
      localStorage.setItem('b2b_cart', typeof options.cart === 'string' ? options.cart : JSON.stringify(options.cart));
    }
    sessionStorage.setItem('offline-b2b-seeded', 'true');
  }, { project, profile, user, token, exp, options });
  if (options.storageFailure) await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('b2b_')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const page = await context.newPage(); page.setDefaultTimeout(4000);
  const requests = [], errors = [], rows = structuredClone(options.products || products);
  let failedRead = options.failedRead, failedCreate = options.failedCreate, failedDownload = options.failedDownload, failedProfile = options.failedProfile;
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
    if (url.origin === base) {
      const file = url.pathname.startsWith('/assets/') ? url.pathname.slice(1) : 'index.html';
      if (file.includes('..')) return route.abort();
      return route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(new URL(`../dist/${file}`, import.meta.url)) });
    }
    if (url.pathname.includes('/auth/v1/')) return reply(user);
    if (url.pathname.includes('/functions/v1/')) {
      const name = url.pathname.split('/').at(-1), body = request.postDataJSON(); requests.push({ name, body });
      if (name === 'b2b-auth' && body.mode === 'profile') return failedProfile ? reply({ success: false, error: 'Offline profile unavailable' }, 503) : reply({ success: true, company: profile });
      if (name === 'create-b2b-checkout') {
        if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        if (failedCreate) return reply({ error: 'Временна грешка. Опитайте отново.' }, 503);
        return reply(options.malformedSuccess ? { success: true } : { success: true, order_number: orderNumber, email_sent: options.emailSent !== false });
      }
      return reply({ error: 'Unconfigured offline endpoint' }, 404);
    }
    if (url.pathname.includes('/rest/v1/')) {
      const table = url.pathname.split('/').at(-1); requests.push({ table, url: url.href, method: request.method() });
      if (request.method() !== 'GET') return reply({ error: 'Unexpected browser write' }, 403);
      if (options.readDelay) await new Promise(resolve => setTimeout(resolve, options.readDelay));
      if (failedRead === table || failedRead === true) return reply({ message: 'offline read failure', code: '42501' }, 403);
      let data = table === 'products' ? [...rows] : table === 'orders' ? structuredClone(options.orders || [order]) : table === 'b2b_documents' ? structuredClone(documents) : [];
      for (const field of ['id', 'slug', 'b2b_company_id']) {
        const filter = url.searchParams.get(field);
        if (filter?.startsWith('eq.')) data = data.filter(row => String(row[field]) === filter.slice(3));
      }
      const count = data.length;
      if (url.searchParams.has('limit')) data = data.slice(0, Number(url.searchParams.get('limit')));
      const single = request.headers()['accept']?.includes('vnd.pgrst.object');
      if (single && !data.length) return reply({ code: 'PGRST116', details: 'The result contains 0 rows' }, 406);
      return reply(single ? data[0] : data, 200, { 'content-range': `0-${Math.max(0, data.length - 1)}/${count}`, 'access-control-expose-headers': 'content-range' });
    }
    if (url.pathname.includes('/storage/v1/')) {
      requests.push({ storage: url.pathname, method: request.method() });
      if (failedDownload) return reply({ message: 'Unavailable', statusCode: '503' }, 503);
      return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%Offline document\n%%EOF' });
    }
    if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#fff7ed"/><rect x="95" y="75" width="210" height="350" rx="20" fill="#b91c1c"/><text x="200" y="240" text-anchor="middle" fill="white" font-size="28">K-FOOD</text></svg>' });
    if (url.pathname.endsWith('remixicon.css') && process.env.B2B_TEST_FONT_CSS) return route.fulfill({ contentType: 'text/css', body: await readFile(process.env.B2B_TEST_FONT_CSS) });
    return route.fulfill({ body: '', contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'text/plain' });
  });
  return { page, requests, errors, rows, close: () => browser.close(), recoverRead: () => { failedRead = false; }, recoverCreate: () => { failedCreate = false; }, recoverDownload: () => { failedDownload = false; }, recoverProfile: () => { failedProfile = false; } };
}
async function open(page, path, heading) { await page.goto(base + path); if (heading) await page.getByRole('heading', { name: heading, exact: true }).waitFor(); }
async function shot(page, name) { if (artifacts) { await mkdir(artifacts, { recursive: true }); await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true }); } }
async function savedCart(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('b2b_cart') || '[]')); }
const creates = qa => qa.requests.filter(r => r.name === 'create-b2b-checkout');
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Horizontal overflow at ${page.url()}`); }

test('profile read: temporary failure offers retry and preserves the saved company cart', async () => {
  const qa = await setup({ cart: basket(), failedProfile: true });
  try {
    await open(qa.page, '/b2b/cart'); await qa.page.getByRole('alert').filter({ hasText: 'фирмения профил' }).waitFor();
    assert.equal((await savedCart(qa.page)).length, 1);
    qa.recoverProfile(); await qa.page.getByRole('button', { name: 'Опитай отново', exact: true }).click();
    await qa.page.getByRole('heading', { name: 'Количка', exact: true }).waitFor();
    assert.deepEqual((await savedCart(qa.page)).map(x => [x.product.id, x.quantity]), [[17, 12]]);
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('product links: numeric fallback opens a product without a slug', async () => {
  const qa = await setup();
  try {
    await open(qa.page, '/b2b/products', 'Продуктов каталог');
    await qa.page.getByRole('link', { name: products[0].name, exact: true }).click();
    await qa.page.getByRole('heading', { name: products[0].name, exact: true }).waitFor();
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('dashboard: a failed read offers retry instead of false empty data', async () => {
  const qa = await setup({ failedRead: 'orders' });
  try {
    await open(qa.page, '/b2b/dashboard'); await qa.page.getByRole('alert').waitFor();
    assert.equal(await qa.page.getByText('Все още нямате поръчки', { exact: true }).count(), 0);
    qa.recoverRead(); await qa.page.getByRole('button', { name: 'Опитай отново', exact: true }).click();
    await qa.page.getByText('#' + orderNumber, { exact: true }).waitFor();
  } finally { await qa.close(); }
});

test('quick order: unresolved bulk lines stay visible and do not add a wrong product', async () => {
  const qa = await setup();
  try {
    await open(qa.page, '/b2b/quick-order', 'Бързо поръчване');
    await qa.page.locator('textarea').fill('KR-017,2\nUNKNOWN,4\n,2\nKR-018,-3\nРамен,1');
    await qa.page.getByRole('button', { name: 'Обработи', exact: true }).click();
    assert.match(await qa.page.locator('textarea').inputValue(), /UNKNOWN/);
    await qa.page.getByRole('alert').waitFor();
    assert.deepEqual((await savedCart(qa.page)).map(x => [x.product.id, x.quantity]), [[17, 24]]);
  } finally { await qa.close(); }
});

test('cart: notes survive checkout → back to cart', async () => {
  const qa = await setup({ cart: basket() });
  try {
    await open(qa.page, '/b2b/cart', 'Количка');
    await qa.page.locator('textarea').fill('Доставка след 14 часа.');
    await qa.page.getByRole('button', { name: 'Продължи към поръчка', exact: true }).click();
    await qa.page.getByRole('heading', { name: 'Завършване на поръчка', exact: true }).waitFor();
    assert.equal(await qa.page.locator('textarea').inputValue(), 'Доставка след 14 часа.');
    await qa.page.goBack(); await qa.page.getByRole('heading', { name: 'Количка', exact: true }).waitFor();
    assert.equal(await qa.page.locator('textarea').inputValue(), 'Доставка след 14 часа.');
  } finally { await qa.close(); }
});

test('piece price: stale carton price does not disagree with the cart', async () => {
  const qa = await setup();
  try { await open(qa.page, '/b2b/product/kimchi', products[1].name); assert.equal(await qa.page.getByText('€5.00', { exact: true }).isVisible(), true); }
  finally { await qa.close(); }
});

test('390px orders: long order numbers fit and the stored line total is shown', async () => {
  const qa = await setup({ width: 390 });
  try {
    await open(qa.page, '/b2b/orders', 'История на поръчките');
    await qa.page.getByRole('button', { name: new RegExp(orderNumber) }).click();
    await noOverflow(qa.page);
    assert.equal(await qa.page.getByText('€6.96', { exact: true }).count(), 0);
    await shot(qa.page, 'orders-390');
  } finally { await qa.close(); }
});

for (const width of [390, 768, 1440]) {
  test(`${width}px: every logged-in B2B screen renders, with working navigation and no clipped controls`, async () => {
    const qa = await setup({ width, cart: basket(), company: { company_name: 'Тестова компания за корейски хранителни продукти ЕООД', email: 'very.long.partner.contact@example.invalid' } });
    try {
      for (const [path, heading, name] of [
        ['/b2b/dashboard', null, 'dashboard'], ['/b2b/products', 'Продуктов каталог', 'catalog'],
        ['/b2b/product/17', products[0].name, 'product'], ['/b2b/quick-order', 'Бързо поръчване', 'quick-order'],
        ['/b2b/cart', 'Количка', 'cart'], ['/b2b/checkout', 'Завършване на поръчка', 'checkout'],
        ['/b2b/orders', 'История на поръчките', 'orders'], ['/b2b/documents', 'Документи', 'documents'],
      ]) {
        await open(qa.page, path, heading);
        if (name === 'dashboard') await qa.page.getByText('#' + orderNumber, { exact: true }).waitFor();
        if (name === 'catalog') await qa.page.getByRole('link', { name: products[0].name, exact: true }).waitFor();
        if (name === 'orders') await qa.page.getByRole('button', { name: new RegExp(orderNumber) }).click();
        if (name === 'documents') await qa.page.getByRole('heading', { name: documents[0].title }).waitFor();
        if (name === 'quick-order') await qa.page.getByRole('textbox', { name: 'Търси продукт за бърза поръчка' }).fill('Рамен');
        await noOverflow(qa.page);
        const outside = await qa.page.locator('button, input, textarea, select, h1').evaluateAll(nodes => nodes.filter(node => {
          const r = node.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        }).map(node => node.textContent || node.getAttribute('aria-label')));
        assert.deepEqual(outside, [], `${path}: controls outside viewport`);
        await shot(qa.page, `${name}-${width}`);
      }
      if (width < 1024) {
        const menu = qa.page.getByRole('button', { name: 'Меню', exact: true });
        await menu.click(); assert.equal(await menu.getAttribute('aria-expanded'), 'true');
        await menu.click(); assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        await menu.click(); await qa.page.keyboard.press('Escape'); assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        await menu.click(); await qa.page.locator('#b2b-mobile-menu').getByRole('link', { name: 'Продукти', exact: true }).click();
      } else await qa.page.locator('header').getByRole('link', { name: 'Продукти', exact: true }).click();
      await qa.page.getByRole('heading', { name: 'Продуктов каталог', exact: true }).waitFor();
      assert.deepEqual(qa.errors, []);
      assert.equal(creates(qa).length, 0);
    } finally { await qa.close(); }
  });
}

for (const width of [390, 1440]) {
  test(`${width}px: dashboard → product → cart → checkout submits once, with unchanged order/email contract`, async () => {
    const qa = await setup({ width, delay: 150, emailSent: false });
    try {
      const { page } = qa;
      await open(page, '/b2b/dashboard');
      await page.getByRole('link', { name: new RegExp(products[0].name) }).click();
      await page.getByRole('heading', { name: products[0].name, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Увеличи количество', exact: true }).click();
      await page.getByRole('button', { name: 'Към количката', exact: true }).click();
      await page.getByRole('heading', { name: 'Количка', exact: true }).waitFor();
      assert.deepEqual((await savedCart(page)).map(x => [x.product.id, x.quantity]), [[17, 24]]);
      await page.getByRole('textbox', { name: 'Бележки към поръчката' }).fill('Доставка след 14 часа.');
      await page.getByRole('button', { name: 'Продължи към поръчка', exact: true }).click();
      await page.getByRole('heading', { name: 'Завършване на поръчка', exact: true }).waitFor();
      const submit = page.getByRole('button', { name: 'Изпрати поръчка', exact: true });
      await submit.click(); assert.equal(creates(qa).length, 0);
      assert.equal(await page.getByLabel('Име и фамилия', { exact: false }).evaluate(node => node === document.activeElement), true);
      await page.getByLabel('Име и фамилия', { exact: false }).fill('Тест Партньор');
      await submit.evaluate(node => { node.click(); node.click(); });
      await page.getByRole('heading', { name: 'Поръчката е изпратена!', exact: true }).waitFor();
      assert.equal(creates(qa).length, 1);
      const body = creates(qa)[0].body;
      assert.deepEqual(body.items.map(({ id, quantity }) => ({ id, quantity })), [{ id: 17, quantity: 24 }]);
      assert.equal(body.b2b_company_id, company.id); assert.equal(body.customer_email, company.email);
      assert.equal(body.shipping_address.notes, 'Доставка след 14 часа.');
      assert.match(body.attemptId, /^[0-9a-f-]{36}$/);
      assert.deepEqual(await savedCart(page), []);
      await page.getByText('Имейл известието е забавено', { exact: false }).waitFor();
      assert.equal(qa.requests.some(r => r.name && /send-|notification|stripe/.test(r.name)), false);
      assert.equal(qa.requests.some(r => r.table && r.method !== 'GET'), false);
      assert.deepEqual(qa.errors, []);
      await noOverflow(page); await shot(page, `success-${width}`);
    } finally { await qa.close(); }
  });
}

test('catalog: search, category, empty search and reload work', async () => {
  const qa = await setup();
  try {
    await open(qa.page, '/b2b/products', 'Продуктов каталог');
    await qa.page.getByRole('combobox', { name: 'Категория', exact: true }).selectOption('Продукти за готвене');
    await qa.page.getByRole('link', { name: products[1].name, exact: true }).waitFor();
    assert.equal(await qa.page.getByRole('link', { name: products[0].name, exact: true }).count(), 0);
    await qa.page.getByRole('textbox', { name: 'Търси продукт', exact: true }).fill('UNKNOWN');
    await qa.page.getByText('Няма намерени продукти', { exact: true }).waitFor();
    await qa.page.reload(); await qa.page.getByRole('link', { name: products[0].name, exact: true }).waitFor();
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

for (const [path, table] of [['/b2b/products', 'products'], ['/b2b/product/kimchi', 'products'], ['/b2b/quick-order', 'products'], ['/b2b/orders', 'orders'], ['/b2b/documents', 'b2b_documents']]) {
  test(`${path}: failed data loads retry without a false empty/missing result`, async () => {
    const qa = await setup({ failedRead: table });
    try {
      await open(qa.page, path); await qa.page.getByRole('alert').waitFor();
      for (const text of ['Няма налични продукти', 'Продуктът не е намерен', 'Все още нямате поръчки', 'Няма налични документи']) assert.equal(await qa.page.getByText(text, { exact: true }).count(), 0);
      qa.recoverRead(); await qa.page.getByRole('button', { name: 'Опитай отново', exact: true }).click();
      await qa.page.getByRole('alert').waitFor({ state: 'hidden' });
      if (path.includes('/product/')) await qa.page.getByRole('heading', { name: products[1].name, exact: true }).waitFor();
      if (table === 'orders') await qa.page.getByText('#' + orderNumber, { exact: true }).waitFor();
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  });
}

test('product navigation: missing next product never retains the previous product', async () => {
  const qa = await setup();
  try {
    await open(qa.page, '/b2b/product/kimchi', products[1].name);
    await qa.page.evaluate(() => { history.pushState({}, '', '/b2b/product/18-missing'); dispatchEvent(new PopStateEvent('popstate')); });
    await qa.page.getByRole('heading', { name: 'Продуктът не е намерен', exact: true }).waitFor();
    assert.equal(await qa.page.getByRole('heading', { name: products[1].name, exact: true }).count(), 0);
    assert.equal(qa.requests.some(r => r.table === 'products' && new URL(r.url).searchParams.get('id') === 'eq.18'), false);
  } finally { await qa.close(); }
});

test('dashboard: count includes orders beyond the ten-row preview and status is translated', async () => {
  const qa = await setup({ orders: Array.from({ length: 12 }, (_, i) => ({ ...order, id: `order-${i}`, order_number: `${orderNumber}-${i}` })) });
  try {
    await open(qa.page, '/b2b/dashboard'); await qa.page.getByText('12', { exact: true }).waitFor();
    assert.equal(await qa.page.getByText('Потвърдена', { exact: true }).count(), 5);
    assert.equal(qa.requests.filter(r => r.table === 'orders').every(r => new URL(r.url).searchParams.get('b2b_company_id') === `eq.${company.id}`), true);
  } finally { await qa.close(); }
});

test('quantity: negative/fractional/over-limit input preserves the cart; fast additions stay whole', async () => {
  const qa = await setup({ cart: basket() });
  try {
    await open(qa.page, '/b2b/cart', 'Количка');
    for (const invalid of ['-2', '1.5', '9999']) {
      await qa.page.getByRole('spinbutton', { name: `Количество за ${products[0].name}` }).fill(invalid);
      await qa.page.getByRole('alert').waitFor(); assert.equal((await savedCart(qa.page))[0].quantity, 12);
    }
    await qa.page.getByRole('button', { name: `Увеличи ${products[0].name}` }).evaluate(node => { node.click(); node.click(); });
    assert.equal((await savedCart(qa.page))[0].quantity, 36);
    await qa.page.getByRole('button', { name: `Премахни ${products[0].name}` }).click();
    await qa.page.getByRole('heading', { name: 'Количката е празна', exact: true }).waitFor();
  } finally { await qa.close(); }
});

test('saved carts: malformed products, half cartons, duplicates and another company cannot crash or leak', async () => {
  for (const options of [
    { cart: [{ product: { ...products[1], wholesale_price: 'oops' }, quantity: 1 }, ...basket(), ...basket(), { product: products[2], quantity: 5 }] },
    { cart: basket(), cartOwner: 'some-other-company' },
  ]) {
    const qa = await setup(options);
    try {
      await open(qa.page, '/b2b/cart'); await qa.page.getByRole('heading', { name: options.cartOwner ? 'Количката е празна' : 'Количка', exact: true }).waitFor();
      assert.deepEqual((await savedCart(qa.page)).map(x => [x.product.id, x.quantity]), options.cartOwner ? [] : [[17, 12]]);
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  }
});

test('checkout: retry preserves the draft and request ID; incomplete success cannot clear the basket', async () => {
  for (const malformedSuccess of [false, true]) {
    const qa = await setup({ cart: basket(), failedCreate: !malformedSuccess, malformedSuccess });
    try {
      await open(qa.page, '/b2b/checkout', 'Завършване на поръчка');
      await qa.page.getByLabel('Име и фамилия', { exact: false }).fill('Тест Партньор');
      const submit = qa.page.getByRole('button', { name: 'Изпрати поръчка', exact: true });
      await submit.click(); await qa.page.getByRole('alert').waitFor();
      assert.equal((await savedCart(qa.page)).length, 1);
      if (!malformedSuccess) {
        qa.recoverCreate(); await submit.click(); await qa.page.getByRole('heading', { name: 'Поръчката е изпратена!', exact: true }).waitFor();
        assert.equal(creates(qa)[0].body.attemptId, creates(qa)[1].body.attemptId);
      }
      assert.deepEqual(qa.errors, []);
    } finally { await qa.close(); }
  }
});

test('storage failures: portal stays usable and an unpersisted request is never submitted', async () => {
  const qa = await setup({ cart: basket(), storageFailure: true });
  try {
    await open(qa.page, '/b2b/cart', 'Количка');
    await qa.page.getByRole('status').filter({ hasText: 'Браузърът не запазва' }).waitFor();
    await qa.page.getByRole('button', { name: 'Продължи към поръчка', exact: true }).click();
    await qa.page.getByLabel('Име и фамилия', { exact: false }).fill('Тест Партньор');
    await qa.page.getByRole('button', { name: 'Изпрати поръчка', exact: true }).click();
    await qa.page.getByRole('alert').waitFor(); assert.equal(creates(qa).length, 0); assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});

test('documents: failed download is visible, recovery downloads the scoped document', async () => {
  const qa = await setup({ failedDownload: true });
  try {
    await open(qa.page, '/b2b/documents', 'Документи');
    const document = qa.page.getByRole('button', { name: new RegExp(documents[0].title) });
    await document.click(); await qa.page.getByRole('alert').filter({ hasText: 'не може да се изтегли' }).waitFor();
    qa.recoverDownload(); const download = qa.page.waitForEvent('download'); await document.click();
    assert.equal((await download).suggestedFilename(), 'Тестова ценова листа.pdf');
    assert.equal(qa.requests.filter(r => r.table === 'b2b_documents').every(r => new URL(r.url).searchParams.get('or').includes(company.id)), true);
    assert.deepEqual(qa.errors, []);
  } finally { await qa.close(); }
});
