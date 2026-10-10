import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { absoluteSiteUrl, DEFAULT_SITE_URL } from '../src/utils/urls.ts';

interface SitemapPost { id: number; slug: string; created_at?: string; updated_at?: string }
interface SourceOptions { supabaseUrl?: string; anonKey?: string; siteUrl?: string }

export function blogSitemap(posts: SitemapPost[], siteUrl = DEFAULT_SITE_URL): string {
  if (!posts.length || posts.length > 49_999) throw new Error('Invalid blog sitemap size');
  const ids = new Set<number>(), slugs = new Set<string>();
  const urls = posts.map(post => {
    if (!Number.isSafeInteger(post.id) || post.id < 1 || ids.has(post.id)
      || typeof post.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) {
      throw new Error('Blog sitemap requires complete, unique slugs');
    }
    ids.add(post.id); slugs.add(post.slug);
    const date = post.updated_at || post.created_at;
    const parsed = date ? new Date(date) : null;
    const lastmod = parsed && Number.isFinite(parsed.getTime()) ? `\n    <lastmod>${parsed.toISOString().slice(0, 10)}</lastmod>` : '';
    return `  <url>\n    <loc>${absoluteSiteUrl(`/blog/${post.slug}`, siteUrl)}</loc>${lastmod}\n  </url>`;
  });
  // Omit an invented lastmod for the index. Article dates come from the records.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${absoluteSiteUrl('/blog', siteUrl)}</loc>\n  </url>\n${urls.join('\n')}\n</urlset>\n`;
}

export async function fetchSitemapPosts(options: SourceOptions, fetcher: typeof fetch = fetch): Promise<SitemapPost[]> {
  if (!options.supabaseUrl || !options.anonKey) throw new Error('Public Supabase configuration unavailable');
  const posts: SitemapPost[] = [];
  const signal = AbortSignal.timeout(15_000);
  let expectedTotal: number | null = null;
  for (let offset = 0; offset < 50_000;) {
    const url = new URL('/rest/v1/blog_posts', options.supabaseUrl);
    url.search = new URLSearchParams({ select: 'id,slug,updated_at,created_at', published: 'eq.true', order: 'id.asc', limit: '1000', offset: String(offset) }).toString();
    const response = await fetcher(url, {
      headers: { apikey: options.anonKey, Authorization: `Bearer ${options.anonKey}`, Accept: 'application/json', Prefer: 'count=exact' }, signal,
    });
    if (!response.ok) throw new Error(`Blog inventory HTTP ${response.status}`);
    const page: unknown = await response.json();
    if (!Array.isArray(page)) throw new Error('Invalid blog inventory');
    const match = response.headers.get('content-range')?.match(/\/(\d+)$/);
    if (!match) throw new Error('Blog inventory is missing its total count');
    const total = Number(match[1]);
    if (total > 49_999 || (expectedTotal !== null && expectedTotal !== total)) throw new Error('Blog inventory count is invalid or changed');
    expectedTotal = total;
    posts.push(...page as SitemapPost[]);
    if (posts.length === expectedTotal) return posts;
    if (!page.length || posts.length > expectedTotal) throw new Error('Truncated blog inventory');
    offset += page.length;
  }
  throw new Error('Blog inventory exceeds one sitemap');
}

export async function refreshBlogSitemap(options: SourceOptions, destination: string, warn: (message: string) => void, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const posts = await fetchSitemapPosts(options, fetcher);
    await writeFile(destination, blogSitemap(posts, options.siteUrl || DEFAULT_SITE_URL), 'utf8');
    return true;
  } catch (error) {
    warn(`[blog-sitemap] Kept the checked-in sitemap: ${error instanceof Error ? error.message : 'inventory unavailable'}`);
    return false;
  }
}

export function blogSitemapPlugin(options: SourceOptions): Plugin {
  let outputDirectory = '';
  return {
    name: 'kfood-blog-sitemap', apply: 'build',
    configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir); },
    async closeBundle() {
      await refreshBlogSitemap(options, resolve(outputDirectory, 'sitemap-blog.xml'), message => this.warn(message));
    },
  };
}
