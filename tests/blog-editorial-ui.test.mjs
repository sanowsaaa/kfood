// Optional QA against the compiled application. All traffic is intercepted locally.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadEditorial } from '../scripts/blogEditorial.mjs';

const { chromium } = await import(process.env.BLOG_PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.BLOG_PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const editorial = await loadEditorial();
const posts = editorial.posts.map(({ post }) => ({ ...post, views: 12, updated_at: '2026-10-11T21:00:00Z' }));
const selectedIds = process.env.BLOG_TEST_IDS?.split(',').map(Number);
const layoutPosts = selectedIds ? posts.filter(post => selectedIds.includes(post.id)) : posts;
const base = 'http://127.0.0.1:4317';
const assets = process.env.BLOG_TEST_ASSET_MAP ? JSON.parse(await readFile(process.env.BLOG_TEST_ASSET_MAP, 'utf8')) : {};
const artifacts = process.env.BLOG_TEST_ARTIFACTS;
function gate() { let release; const waiting = new Promise(resolve => { release = resolve; }); return { waiting, release }; }
async function setup(options = {}) {
  const browser = await chromium.launch({
    executablePath: process.env.BLOG_BROWSER_EXECUTABLE, headless: true,
    args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu'],
  });
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', ...(options.userAgent ? { userAgent: options.userAgent } : {}) });
  await context.addInitScript(options => {
    if (location.origin !== 'http://127.0.0.1:4317') return;
    localStorage.setItem('cookieConsent', 'declined');
    if (options.skipViews) for (let id = 1; id <= 32; id++) sessionStorage.setItem(`viewed_post_${id}`, '1');
    if (options.storageFailure) {
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (this === sessionStorage && key.startsWith('viewed_post_')) throw new DOMException('Storage disabled', 'SecurityError');
        return original.call(this, key);
      };
    }
  }, { skipViews: options.skipViews, storageFailure: options.storageFailure });
  const requests = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (url.origin === base) {
      const file = url.pathname.startsWith('/assets/') ? url.pathname.slice(1) : 'index.html';
      if (file.includes('..')) return route.abort();
      return route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.webp') ? 'image/webp' : 'text/html', body: await readFile(new URL(`../dist/${file}`, import.meta.url)) });
    }
    if (url.pathname.includes('/functions/v1/')) {
      const name = url.pathname.split('/').at(-1);
      requests.push({ name, method: request.method(), body: request.postDataJSON() });
      assert.equal(name, 'sitemap-blog', 'No order, payment or email endpoint may be invoked');
      if (options.counterGate) await options.counterGate.waiting;
      try { return await reply({ success: true }); } catch { return; }
    }
    if (url.pathname.includes('/rest/v1/')) {
      requests.push({ table: url.pathname.split('/').at(-1), method: request.method(), query: url.search });
      assert.equal(request.method(), 'GET', 'Article viewing may not write tables');
      let data = url.pathname.endsWith('/blog_posts') ? posts : [];
      const slug = url.searchParams.get('slug');
      if (slug?.startsWith('eq.')) {
        data = data.filter(post => post.slug === slug.slice(3));
        if (options.primaryGate && data[0]?.id === options.primaryGateId) await options.primaryGate.waiting;
      } else if (url.searchParams.has('category')) {
        const category = url.searchParams.get('category').slice(3);
        const id = Number(url.searchParams.get('id')?.slice(4));
        data = posts.filter(post => post.category === category && post.id !== id).slice(0, 3);
        if (options.relatedGate && (!options.relatedGateId || options.relatedGateId === id)) await options.relatedGate.waiting;
      }
      try { return await reply(request.headers().accept?.includes('vnd.pgrst.object') ? data[0] ?? null : data); } catch { return; }
    }
    if (assets[url.href]) return route.fulfill({ body: await readFile(assets[url.href].path), contentType: assets[url.href].type });
    if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#ffe2ef"/></svg>' });
    return route.fulfill({ body: '', contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'text/plain' });
  });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  return { browser, context, page, requests, errors };
}

for (const width of [320, 390, 1440]) {
  test(`all ${layoutPosts.length} articles have readable complete titles, scoped typography and correct SEO at ${width}px`, async () => {
    const f = await setup({ width, skipViews: true });
    try {
      for (const post of layoutPosts) {
        await f.page.goto(`${base}/blog/${post.slug}`);
        await f.page.locator('.kfood-article').waitFor();
        assert.equal(await f.page.locator('h1').count(), 1, post.slug);
        assert.equal(await f.page.locator('h1').innerText(), post.title);
        const result = await f.page.evaluate(() => {
          const article = document.querySelector('.kfood-article'), h1 = document.querySelector('h1');
          const hero = h1.parentElement.parentElement.getBoundingClientRect(), title = h1.getBoundingClientRect();
          const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(el => {
            const value = JSON.parse(el.textContent); return value['@graph'] || [value];
          }).find(item => item['@type'] === 'Article');
          const paragraphs = article.querySelectorAll('p'), style = getComputedStyle(article);
          return {
            canonical: document.querySelector('link[rel="canonical"]').href,
            description: document.querySelector('meta[name="description"]').content,
            schema: jsonld, paragraphs: paragraphs.length, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight),
            overflow: document.documentElement.scrollWidth > innerWidth || article.scrollWidth > article.clientWidth + 1,
            titleVisible: title.top >= hero.top - 1 && title.bottom <= hero.bottom + 1,
            unsafe: article.querySelectorAll('script,iframe,form,svg').length,
            linksUnderlined: [...article.querySelectorAll('a')].every(a => getComputedStyle(a).textDecorationLine.includes('underline')),
            tableFits: [...article.querySelectorAll('table')].every(table => table.getBoundingClientRect().width <= article.getBoundingClientRect().width + 1),
          };
        });
        assert.equal(result.canonical, `https://k-foodvelikotarnovo.com/blog/${post.slug}`);
        assert.equal(result.description, post.excerpt);
        assert.equal(result.schema.headline, post.title);
        assert.equal(result.schema.wordCount, post.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length);
        assert.equal(result.schema.dateModified, new Date(post.updated_at).toISOString());
        assert.ok(result.paragraphs >= 8);
        assert.ok(result.fontSize >= 17 && result.lineHeight >= 30);
        assert.equal(result.overflow, false, post.slug);
        assert.equal(result.titleVisible, true, post.slug);
        assert.equal(result.linksUnderlined, true);
        assert.equal(result.tableFits, true);
        assert.equal(result.unsafe, 0);
        if (artifacts && [12, 24, 27].includes(post.id) && [390, 1440].includes(width)) {
          await mkdir(artifacts, { recursive: true });
          await f.page.evaluate(() => document.fonts.ready);
          await f.page.screenshot({ path: `${artifacts}/article-${post.id}-${width}.png`, fullPage: true });
        }
      }
      assert.deepEqual(f.errors, []);
      assert.equal(f.requests.some(request => request.name), false);
    } finally { await f.browser.close(); }
  });
}

test('an unresolved counter and related query never block the full article; counter contract and once-per-session behavior survive', async () => {
  const counterGate = gate(), relatedGate = gate();
  const f = await setup({ counterGate, relatedGate });
  try {
    const post = posts[8];
    await f.page.goto(`${base}/blog/${post.slug}`);
    await f.page.locator('.kfood-article').waitFor();
    assert.equal(await f.page.locator('h1').innerText(), post.title);
    assert.equal(await f.page.getByText('Зареждане...', { exact: true }).count(), 0);
    await f.page.waitForFunction(() => sessionStorage.getItem('viewed_post_9') === '1');
    assert.deepEqual(f.requests.filter(request => request.name).map(request => request.body), [{ action: 'increment_view', post_id: 9 }]);
    counterGate.release(); relatedGate.release();
    await f.page.reload();
    await f.page.locator('.kfood-article').waitFor();
    assert.equal(f.requests.filter(request => request.name).length, 1);
    assert.deepEqual(f.errors, []);
  } finally { counterGate.release(); relatedGate.release(); await f.browser.close(); }
});

test('late primary and related responses from a previous route cannot replace the current article', async () => {
  const primaryGate = gate(), relatedGate = gate();
  const f = await setup({ skipViews: true, primaryGate, primaryGateId: 1, relatedGate, relatedGateId: 9 });
  try {
    await f.page.goto(`${base}/blog/${posts[0].slug}`);
    await f.page.locator('a[href="/blog"]').first().click();
    await f.page.locator(`a[href="/blog/${posts[8].slug}"]`).first().click();
    await f.page.locator('.kfood-article').waitFor();
    primaryGate.release();
    assert.equal(await f.page.locator('h1').innerText(), posts[8].title);
    await f.page.locator(`.kfood-article a[href$="/blog/${posts[14].slug}"]`).first().click();
    await f.page.getByRole('heading', { level: 1, name: posts[14].title, exact: true }).waitFor();
    relatedGate.release();
    assert.equal(await f.page.locator('h1').innerText(), posts[14].title);
    assert.equal(await f.page.locator('link[rel="canonical"]').getAttribute('href'), `https://k-foodvelikotarnovo.com/blog/${posts[14].slug}`);
    await f.page.getByRole('heading', { name: 'Подобни статии', exact: true }).waitFor();
    const related = f.page.getByRole('heading', { name: 'Подобни статии', exact: true }).locator('..');
    assert.deepEqual(await related.locator('h4').allTextContents(), posts.filter(post => post.category === posts[14].category && post.id !== posts[14].id).slice(0, 3).map(post => post.title));
    assert.deepEqual(f.errors, []);
  } finally { primaryGate.release(); relatedGate.release(); await f.browser.close(); }
});

test('restricted session storage and the Google inspection crawler can still read articles without incrementing views', async () => {
  for (const options of [{ storageFailure: true }, { userAgent: 'Google-InspectionTool/1.0' }]) {
    const f = await setup(options);
    try {
      await f.page.goto(`${base}/blog/${posts[23].slug}`);
      await f.page.locator('.kfood-article').waitFor();
      assert.equal(await f.page.locator('h1').innerText(), posts[23].title);
      assert.equal(f.requests.some(request => request.name), false);
      assert.deepEqual(f.errors, []);
    } finally { await f.browser.close(); }
  }
});
