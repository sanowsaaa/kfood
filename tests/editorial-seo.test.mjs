import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { blogSitemap, fetchSitemapPosts, refreshBlogSitemap } from '../scripts/blogSitemap.ts';

const options = { supabaseUrl: 'https://example.supabase.co', anonKey: 'offline-public-key' };
const posts = [
  { id: 1, slug: 'ramen-guide', created_at: '2026-01-01T12:00:00Z', updated_at: '2026-10-10T06:00:00Z' },
  { id: 2, slug: 'kimchi', created_at: '2026-09-01T00:00:00Z' },
  { id: 3, slug: 'korean-culture', created_at: 'invalid-date' },
];
const response = (body, range, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...(range ? { 'content-range': range } : {}) } });

test('blog sitemap uses article edit dates, includes each slug and omits invented dates', () => {
  const xml = blogSitemap(posts);
  assert.equal((xml.match(/<loc>/g) || []).length, 4);
  assert.match(xml, /\/blog\/ramen-guide<\/loc>\s*<lastmod>2026-10-10/);
  assert.match(xml, /\/blog\/kimchi<\/loc>\s*<lastmod>2026-09-01/);
  assert.doesNotMatch(xml, /invalid-date/);
  assert.match(xml, /\/blog<\/loc>\s*<\/url>/);
  for (const bad of [[], [...posts, posts[0]], [{ id: 1, slug: '../cart' }], [{ id: 1, slug: 'article?email=private' }]]) {
    assert.throws(() => blogSitemap(bad));
  }
});

test('published blog inventory follows server page caps and uses only anonymous read requests', async () => {
  const calls = [];
  const result = await fetchSitemapPosts(options, async (url, init) => {
    calls.push({ url, init });
    const offset = Number(url.searchParams.get('offset'));
    return response(posts.slice(offset, offset + 2), offset === 0 ? '0-1/3' : '2-2/3');
  });
  assert.deepEqual(result, posts);
  assert.deepEqual(calls.map(call => call.url.searchParams.get('offset')), ['0', '2']);
  for (const { url, init } of calls) {
    assert.equal(url.searchParams.get('published'), 'eq.true');
    assert.equal(url.searchParams.get('select'), 'id,slug,updated_at,created_at');
    assert.equal(init.method, undefined);
    assert.equal(init.headers.apikey, 'offline-public-key');
    assert.ok(init.signal instanceof AbortSignal);
  }
});

test('incomplete, changing, failed or uncounted blog inventories are rejected', async () => {
  await assert.rejects(fetchSitemapPosts(options, async () => response([], '0-0/3')), /Truncated/);
  await assert.rejects(fetchSitemapPosts(options, async () => response(posts)), /total count/);
  await assert.rejects(fetchSitemapPosts(options, async () => response({}, '0-0/3')), /Invalid/);
  await assert.rejects(fetchSitemapPosts(options, async () => response({}, null, 503)), /503/);
  await assert.rejects(fetchSitemapPosts(options, async url => Number(url.searchParams.get('offset')) === 0
    ? response(posts.slice(0, 1), '0-0/3') : response(posts.slice(1), '1-2/4')), /changed/);
});

test('blog build refresh retains the published fallback on failure and writes a complete success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kfood-blog-sitemap-'));
  const destination = join(directory, 'sitemap-blog.xml'), warnings = [];
  try {
    await writeFile(destination, 'known complete fallback');
    assert.equal(await refreshBlogSitemap(options, destination, message => warnings.push(message), async () => response({}, null, 503)), false);
    assert.equal(await readFile(destination, 'utf8'), 'known complete fallback');
    assert.match(warnings[0], /Kept the checked-in sitemap/);
    assert.equal(await refreshBlogSitemap(options, destination, message => warnings.push(message), async () => response(posts, '0-2/3')), true);
    assert.equal(await readFile(destination, 'utf8'), blogSitemap(posts));
  } finally { await rm(directory, { recursive: true }); }
});

test('page sitemap uses the actual cosmetics route and omits private utility pages', async () => {
  const xml = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  assert.match(xml, /\/category\/cosmetics<\/loc>/);
  assert.doesNotMatch(xml, /koreiska-kozmetika|\/track-order|\/leave-review|<lastmod>/);
  const index = await readFile(new URL('../public/sitemap-index.xml', import.meta.url), 'utf8');
  assert.match(index, /\/sitemap-blog.xml/);
  assert.doesNotMatch(index, /functions\/v1/);
});
