// Offline compiled-app checks. Every request is intercepted; no production traffic or emails.
// Supply ADMIN_PLAYWRIGHT_MODULE_PATH and, if needed, ADMIN_BROWSER_EXECUTABLE.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.ADMIN_PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.ADMIN_PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = process.env.ADMIN_TEST_URL || 'http://127.0.0.1:4317';
const artifacts = process.env.ADMIN_TEST_ARTIFACTS;
const env = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '');
const project = (process.env.VITE_PUBLIC_SUPABASE_URL || env.match(/^VITE_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)?.[1] || 'https://quqlovoiwgqfmgjumpgd.supabase.co').split('//')[1].split('.')[0];
const date = '2026-10-08T09:00:00Z';
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'admin@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: date };
const company = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', company_name: 'Тестов B2B партньор', email: 'partner@example.invalid', phone: '0000000000', city: 'София', business_type: 'restaurant', status: 'active', created_at: date, global_discount: 5, credit_limit: 1000, pricing_tier_id: null, internal_notes: 'Запазена бележка', user_id: user.id };
const application = { ...company, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', company_name: 'Нова кандидатура', status: 'pending', contact_first_name: 'Тест', contact_last_name: 'Партньор', contact_email: 'contact@example.invalid', accept_terms: true, accept_privacy: true, confirm_accurate: true };
const product = { id: 17, name: 'Корейски рамен', description: 'Тестов продукт', price: 4.9, price_euro: 4.9, wholesale_price: 3.5, carton_price: 42, image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%2310342f"/%3E%3Ctext x="50" y="56" text-anchor="middle" fill="%23fff" font-size="18"%3EK-FOOD%3C/text%3E%3C/svg%3E', category: 'Нудъли и Рамен', badge: '', rating: 4.5, reviews: 2, in_stock: true, stock: 100, sku: 'RAMEN-17', cost_price: 2, moq: 1, moq_unit: 'бр.', pieces_per_carton: 12 };
const order = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', order_number: 'B2B-TEST-001', customer_email: 'partner@example.invalid', customer_phone: '0000000000', status: 'pending_review', total_amount: 42, original_total_amount: 42, currency: 'eur', b2b_company_id: company.id, is_b2b_order: true, payment_method: 'b2b_request', items: [{ ...product, quantity: 12, price: 3.5 }], shipping_address: { full_name: 'Тест Партньор', address: 'Тестов адрес', city: 'София' }, tracking_notes: '', admin_discount_percent: 0, discount_notes: '', created_at: date };
const post = { id: 21, title: 'Запазена статия', slug: 'saved-post', excerpt: 'Тестово резюме', content: '<p>Запазено съдържание</p>', cover_image: '', author: 'Редактор', category: 'Корейска храна', tags: ['ramen'], published: true, views: 25, read_time: 5, created_at: date };
const review = { id: 'review-1', name: 'Тестов клиент', rating: 5, text: 'Тестов отзив', product_name: 'Корейски рамен', is_approved: false, created_at: date };
const browserOptions = { headless: true, executablePath: process.env.ADMIN_BROWSER_EXECUTABLE, args: process.env.ADMIN_BROWSER_SINGLE_PROCESS === '1' ? ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu'] : ['--no-sandbox'] };
before(async () => { if (artifacts) await mkdir(artifacts, { recursive: true }); });

async function setup(options = {}) {
  const browser = await chromium.launch(browserOptions);
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.offline-test`;
  await context.addInitScript(({ project, token, user }) => {
    localStorage.setItem('slugGenDone', '1'); localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'offline-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
  }, { project, token, user });
  const requests = []; const errors = [];
  const rows = { products: [structuredClone(product)], orders: [structuredClone(order)], blog_posts: [structuredClone(post)], reviews: [structuredClone(review)], b2b_companies: [structuredClone(company)], b2b_applications: [structuredClone(application)], b2b_pricing_tiers: [], b2b_company_contacts: [], b2b_company_addresses: [], b2b_order_rules: [], b2b_payment_rules: [], b2b_documents: [], b2b_notifications: [] };
  let authFailure = options.authFailure;
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin === base) {
      // Serve the compiled app through the interception channel, without a live network server.
      const isAsset = url.pathname.startsWith('/assets/');
      const file = isAsset ? url.pathname.slice(1) : 'index.html';
      if (file.includes('..')) return route.abort();
      const contentType = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
      return route.fulfill({ contentType, body: await readFile(new URL(`../dist/${file}`, import.meta.url)) });
    }
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.includes('/functions/v1/')) {
      const name = url.pathname.split('/').at(-1); const body = request.postDataJSON();
      requests.push({ name, body, method: request.method() });
      if (options.delay && ['approve-b2b', 'review-b2b-order', 'create-b2b-checkout'].includes(name)) await new Promise(resolve => setTimeout(resolve, options.delay));
      if (name === 'check-user') return reply(authFailure ? { error: 'temporarily unavailable' } : { isAdmin: true }, authFailure || 200);
      if (name === 'b2b-auth') return reply({ success: true, company: null });
      if (name === 'approve-b2b') { rows.b2b_applications[0].status = 'approved'; return reply({ success: true, email_sent: options.emailSent !== false }); }
      if (name === 'review-b2b-order') { rows.orders[0].status = body.action === 'approve' ? 'approved' : 'cancelled'; return reply({ success: true, message: 'Операцията е потвърдена.' }); }
      if (name === 'create-b2b-checkout' && body.mode === 'resend_notification') return reply({ success: true, email_sent: true });
      return reply({ error: 'offline endpoint unavailable' }, 404);
    }
    if (url.pathname.includes('/auth/v1/user')) return reply(user);
    if (url.pathname.includes('/rest/v1/')) {
      const table = url.pathname.split('/').at(-1); const method = request.method();
      if (options.slowPendingRead && table === 'reviews' && url.searchParams.get('is_approved') === 'eq.false' && method === 'GET') await new Promise(resolve => setTimeout(resolve, 800));
      const body = request.postDataJSON(); requests.push({ table, method, body, url: url.href });
      if (method !== 'GET' && options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
      if (options.readFailure === table && method === 'GET') return reply({ code: '42501', message: 'denied' }, 403);
      if (options.writeFailure && method !== 'GET') return reply({ code: 'PGRST116', message: '0 rows' }, 406);
      let data = rows[table] || [];
      const id = url.searchParams.get('id')?.replace('eq.', '');
      if (id) data = data.filter(row => String(row.id) === id);
      const status = url.searchParams.get('status')?.replace('eq.', '');
      if (status) data = data.filter(row => row.status === status);
      const approved = url.searchParams.get('is_approved');
      if (approved) data = data.filter(row => row.is_approved === (approved === 'eq.true'));
      if (method === 'PATCH') { data.forEach(row => Object.assign(row, body)); }
      if (method === 'POST') { data = (Array.isArray(body) ? body : [body]).map(row => ({ ...row, id: 'new-test-id' })); rows[table].push(...data); }
      if (method === 'DELETE') rows[table] = rows[table].filter(row => !data.includes(row));
      return reply(request.headers()['accept']?.includes('vnd.pgrst.object') ? data[0] ?? null : data);
    }
    if (url.pathname.includes('/storage/v1/')) return reply({ error: 'Bucket not found' }, 400);
    if (url.pathname.endsWith('remixicon.css') && process.env.ADMIN_TEST_FONT_CSS) return route.fulfill({ contentType: 'text/css', body: await readFile(process.env.ADMIN_TEST_FONT_CSS, 'utf8') });
    if (url.pathname.endsWith('remixicon.woff2') && process.env.ADMIN_TEST_FONT_WOFF2) return route.fulfill({ contentType: 'font/woff2', body: await readFile(process.env.ADMIN_TEST_FONT_WOFF2) });
    // All other remote traffic, including pixels and third-party assets, stays offline.
    return route.fulfill({ status: 200, body: '', contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'text/plain' });
  });
  return { page, context: { close: () => browser.close() }, requests, errors, rows, recoverAuth: () => { authFailure = null; } };
}
async function ready(page, path) { await page.goto(base + path); await page.locator('nav[aria-label="Административни раздели"]').waitFor(); await page.waitForTimeout(120); }
async function sameTickDoubleClick(locator) { await locator.evaluate(button => { button.click(); button.click(); }); }
function writes(requests, table) { return requests.filter(request => request.table === table && request.method !== 'GET'); }

for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'}: every existing admin screen renders with one active navigation section`, async () => {
    const { page, context, errors } = await setup({ mobile });
    try {
      for (const [path, name] of [['/admin', 'products'], ['/admin/orders', 'orders'], ['/admin/b2b', 'partners'], [`/admin/b2b/companies/${company.id}`, 'company'], ['/admin/b2b/documents', 'documents'], ['/admin/blog', 'blog'], ['/admin/reviews', 'reviews']]) {
        await ready(page, path);
        await page.locator('#admin-content').waitFor();
        assert.equal(await page.locator('nav [aria-current="page"]').count(), 1, path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        assert.equal(overflow, false, `${path} overflows the viewport`);
        if (artifacts) await page.screenshot({ path: `${artifacts}/${name}-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('auth: a 503 displays retry without redirecting and recovers on demand', async () => {
  const { page, context, recoverAuth } = await setup({ authFailure: 503 });
  try {
    await page.goto(base + '/admin');
    await page.getByRole('heading', { name: 'Не успяхме да проверим достъпа' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/admin');
    recoverAuth(); await page.getByRole('button', { name: 'Опитай отново', exact: true }).click();
    await page.getByRole('heading', { name: 'Управление на продукти' }).waitFor();
  } finally { await context.close(); }
});

test('products: zero affected rows preserve the form and never report success', async () => {
  const { page, context, requests } = await setup({ writeFailure: true });
  try {
    await ready(page, '/admin'); await page.getByTitle('Редактирай').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="text"]').first().fill('Запазен чернови продукт');
    await dialog.getByRole('button', { name: 'Запази промените' }).click();
    await dialog.getByRole('alert').waitFor();
    assert.equal(await dialog.locator('input[type="text"]').first().inputValue(), 'Запазен чернови продукт');
    assert.equal(writes(requests, 'products').length, 1);
    assert.equal(await page.getByText('Промените са запазени.', { exact: true }).count(), 0);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  } finally { await context.close(); }
});

test('products: same-tick double clicks submit once and cannot close a pending dialog', async () => {
  const { page, context, requests } = await setup({ delay: 500 });
  try {
    await ready(page, '/admin'); await page.getByTitle('Редактирай').first().click();
    const dialog = page.getByRole('dialog');
    await sameTickDoubleClick(dialog.getByRole('button', { name: 'Запази промените' }));
    await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 1);
    await page.getByText('Промените са запазени.', { exact: true }).waitFor();
    assert.equal(writes(requests, 'products').length, 1);
  } finally { await context.close(); }
});

test('blog: opening an existing post retains its body, author and tags; failed writes retain the draft', async () => {
  const { page, context, requests } = await setup({ writeFailure: true });
  try {
    await ready(page, '/admin/blog'); await page.getByTitle('Редактирай').first().click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('textarea').last().inputValue(), post.content);
    assert.equal(await dialog.getByText('#ramen', { exact: true }).count(), 1);
    await dialog.getByRole('button', { name: 'Обнови', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    const payload = writes(requests, 'blog_posts')[0].body;
    assert.equal(payload.author, 'Редактор');
    assert.deepEqual(payload.tags, ['ramen']);
    assert.equal(payload.content, post.content);
    assert.equal(await dialog.locator('textarea').last().inputValue(), post.content);
  } finally { await context.close(); }
});

test('reviews: a denied update retains the review and displays an error instead of approval', async () => {
  const { page, context } = await setup({ writeFailure: true });
  try {
    await ready(page, '/admin/reviews'); await page.getByRole('button', { name: 'Одобри', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByText('Тестов отзив', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Ревюто е одобрено.', { exact: true }).count(), 0);
  } finally { await context.close(); }
});

test('B2B: the administrator approves once with the existing email payload and reports an unconfirmed email separately', async () => {
  const { page, context, requests } = await setup({ delay: 500, emailSent: false });
  try {
    await ready(page, '/admin/b2b'); await page.getByRole('button', { name: /Нова кандидатура/ }).click();
    await page.locator('textarea').fill('Съществуваща бележка');
    await sameTickDoubleClick(page.getByRole('button', { name: 'Одобри', exact: true }));
    await page.getByText(/Кандидатурата е одобрена, но изпращането/).waitFor();
    const calls = requests.filter(request => request.name === 'approve-b2b');
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body, { application_id: application.id, review_notes: 'Съществуваща бележка' });
  } finally { await context.close(); }
});

test('B2B orders: review and manual notification retain their exact existing contracts and submit once', async () => {
  const { page, context, requests } = await setup({ delay: 500 });
  try {
    await ready(page, '/admin/orders'); await page.getByText(order.order_number, { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await sameTickDoubleClick(dialog.getByRole('button', { name: 'Повтори известието до магазина' }));
    await dialog.getByText(/Известието до магазина е прието/).waitFor();
    const notifications = requests.filter(request => request.name === 'create-b2b-checkout');
    assert.equal(notifications.length, 1); assert.deepEqual(notifications[0].body, { mode: 'resend_notification', order_id: order.id });
    await sameTickDoubleClick(dialog.getByRole('button', { name: /Одобри с отстъпка/ }));
    await dialog.getByText('Операцията е потвърдена.', { exact: true }).waitFor();
    const reviews = requests.filter(request => request.name === 'review-b2b-order');
    assert.equal(reviews.length, 1); assert.deepEqual(reviews[0].body, { order_id: order.id, action: 'approve', discount_percent: 0, discount_notes: '' });
  } finally { await context.close(); }
});

test('company: saving notes cannot overwrite owner/account fields from the fetched row', async () => {
  const { page, context, requests } = await setup();
  try {
    await ready(page, `/admin/b2b/companies/${company.id}`);
    const card = page.locator('div.bg-white').filter({ has: page.getByRole('heading', { name: 'Вътрешни бележки', exact: true }) }).last();
    await card.locator('button').first().click();
    await card.locator('textarea').fill('Нова вътрешна бележка');
    await card.getByRole('button', { name: 'Запази', exact: true }).click();
    await page.getByText('Промените са запазени.', { exact: true }).waitFor();
    assert.deepEqual(writes(requests, 'b2b_companies')[0].body, { internal_notes: 'Нова вътрешна бележка' });
  } finally { await context.close(); }
});

test('parallel B2B reads: a failed rule query shows a retry and disables incomplete actions', async () => {
  const { page, context } = await setup({ readFailure: 'b2b_payment_rules' });
  try {
    await ready(page, '/admin/b2b'); await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Обнови', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Правила за плащане', exact: true }).isVisible(), false);
  } finally { await context.close(); }
});


test('documents: an upload rejection retains title and file and does not insert metadata', async () => {
  const { page, context, requests } = await setup();
  try {
    await ready(page, '/admin/b2b/documents');
    await page.locator('input').first().fill('Запазен документ');
    await page.locator('input[type="file"]').setInputFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 offline test') });
    await page.getByRole('button', { name: /Качи документа|Качи документ/ }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('input').first().inputValue(), 'Запазен документ');
    assert.equal(await page.locator('input[type="file"]').evaluate(input => input.files[0].name), 'test.pdf');
    assert.equal(writes(requests, 'b2b_documents').length, 0);
  } finally { await context.close(); }
});

test('auth: signing out invalidates admin access within the same browser session', async () => {
  const { page, context, requests, errors } = await setup();
  try {
    await ready(page, '/admin');
    await page.getByRole('button', { name: 'Изход', exact: true }).click();
    await page.waitForURL(base + '/login');
    await page.getByRole('heading', { name: /Вход|Влез|Админ/ }).first().waitFor();
    await page.evaluate(() => window.REACT_APP_NAVIGATE('/admin'));
    await page.waitForTimeout(200);
    await page.waitForURL(base + '/login');
    assert.equal(await page.locator('nav[aria-label="Административни раздели"]').count(), 0);
  } catch (error) {
    console.error('Sign-out diagnostics', { errors, url: page.url(), storagePresent: await page.evaluate(project => !!localStorage.getItem(`sb-${project}-auth-token`), project), body: (await page.locator('body').innerText()).slice(0, 300), calls: requests.map(request => request.name || request.table) });
    throw error;
  } finally { await context.close(); }
});

test('reviews: a late pending response cannot replace the newer approved filter', async () => {
  const { page, context } = await setup({ slowPendingRead: true });
  try {
    await ready(page, '/admin/reviews');
    await page.getByRole('button', { name: 'Одобрени', exact: true }).click();
    await page.getByText('Няма ревюта в тази категория', { exact: true }).waitFor();
    await page.waitForTimeout(1000);
    assert.equal(await page.getByText('Тестов отзив', { exact: true }).count(), 0);
  } finally { await context.close(); }
});


test('auth: every administrator route rejects a denied role before reading administrator data', async () => {
  const { page, context, requests } = await setup({ authFailure: 403 });
  try {
    for (const path of ['/admin', '/admin/orders', '/admin/b2b', `/admin/b2b/companies/${company.id}`, '/admin/b2b/documents', '/admin/blog', '/admin/reviews']) {
      await page.goto(base + path);
      await page.waitForURL(base + '/login');
      assert.equal(await page.locator('nav[aria-label="Административни раздели"]').count(), 0);
    }
    assert.equal(requests.filter(request => request.table).length, 0);
  } finally { await context.close(); }
});
