import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { absoluteSiteUrl, DEFAULT_SITE_URL } from '../src/utils/urls.ts';

export interface SitemapProduct {
  id: number;
  slug: string;
  updated_at?: string | null;
  created_at?: string | null;
}
interface SourceOptions { supabaseUrl?: string; anonKey?: string; siteUrl?: string }
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function productSitemap(products: SitemapProduct[], siteUrl = DEFAULT_SITE_URL): string {
  if (!products.length || products.length > 50_000) throw new Error('Invalid product sitemap size');
  const ids = new Set<number>(), slugs = new Set<string>();
  const urls = products.map(product => {
    if (!Number.isSafeInteger(product.id) || product.id < 1 || ids.has(product.id)
      || typeof product.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(product.slug)
      || /^\d+$/.test(product.slug) || slugs.has(product.slug)) {
      throw new Error('Product sitemap requires complete, unique slugs');
    }
    ids.add(product.id); slugs.add(product.slug);
    const date = product.updated_at || product.created_at;
    const parsed = date ? new Date(date) : null;
    const lastmod = parsed && Number.isFinite(parsed.getTime()) ? `\n    <lastmod>${parsed.toISOString().slice(0, 10)}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(absoluteSiteUrl(`/product/${product.slug}`, siteUrl))}</loc>${lastmod}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function fetchSitemapProducts(options: SourceOptions, fetcher: typeof fetch = fetch): Promise<SitemapProduct[]> {
  if (!options.supabaseUrl || !options.anonKey) throw new Error('Public Supabase configuration unavailable');
  const products: SitemapProduct[] = [];
  const pageSize = 1000;
  const signal = AbortSignal.timeout(15_000);
  let expectedTotal: number | null = null;
  for (let offset = 0; offset <= 50_000;) {
    const url = new URL('/rest/v1/products', options.supabaseUrl);
    url.search = new URLSearchParams({ select: 'id,slug,updated_at,created_at', order: 'id.asc', limit: String(pageSize), offset: String(offset) }).toString();
    const response = await fetcher(url, {
      headers: { apikey: options.anonKey, Authorization: `Bearer ${options.anonKey}`, Accept: 'application/json', Prefer: 'count=exact' }, signal,
    });
    if (!response.ok) throw new Error(`Product inventory HTTP ${response.status}`);
    const page: unknown = await response.json();
    if (!Array.isArray(page)) throw new Error('Invalid product inventory');
    const totalMatch = response.headers.get('content-range')?.match(/\/(\d+)$/);
    if (totalMatch) {
      const total = Number(totalMatch[1]);
      if (expectedTotal !== null && expectedTotal !== total) throw new Error('Product inventory changed during pagination');
      if (total > 50_000) throw new Error('Product inventory exceeds one sitemap');
      expectedTotal = total;
    }
    products.push(...page as SitemapProduct[]);
    if (expectedTotal !== null && products.length === expectedTotal) return products;
    if (expectedTotal !== null && products.length > expectedTotal) throw new Error('Invalid product inventory count');
    if (!page.length) {
      if (expectedTotal !== null) throw new Error('Truncated product inventory');
      return products;
    }
    // The server may cap its page size below our requested limit.
    offset += page.length;
  }
  throw new Error('Product inventory exceeds one sitemap');
}

export async function refreshProductSitemap(options: SourceOptions, destination: string, warn: (message: string) => void, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const products = await fetchSitemapProducts(options, fetcher);
    const xml = productSitemap(products, options.siteUrl || DEFAULT_SITE_URL);
    await writeFile(destination, xml, 'utf8');
    return true;
  } catch (error) {
    warn(`[product-sitemap] Kept the checked-in sitemap: ${error instanceof Error ? error.message : 'inventory unavailable'}`);
    return false;
  }
}

export function productSitemapPlugin(options: SourceOptions): Plugin {
  let outputDirectory = '';
  return {
    name: 'kfood-product-sitemap', apply: 'build',
    configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir); },
    async closeBundle() {
      await refreshProductSitemap(options, resolve(outputDirectory, 'sitemap-products.xml'), message => this.warn(message));
    },
  };
}
