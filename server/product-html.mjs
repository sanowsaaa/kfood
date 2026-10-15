import { productSEO } from '../src/utils/productSEO.ts';
import { productAvailable } from '../src/utils/customer.ts';

export const PILOT_PRODUCTS = Object.freeze([
  { id: 28, slug: 'buldak-nudli-lyuto-pile' },
  { id: 48, slug: 'samyang-lyut-sos-buldak-karbonara-200-g' },
  { id: 103, slug: 'shokoladova-biskvitka-pepero-32-gr' },
  { id: 243, slug: 'pepero-snezhen-badem-32-g-x-40' },
  { id: 470, slug: 'ramen-buldak-chasha-karbonara-80-g-x-6' },
]);
export const HTML_PRODUCT_FIELDS = 'id,name,description,price,image,category,badge,rating,reviews,in_stock,stock,slug,weight,volume,visibility,seo_title,seo_description';
const SITE_URL = 'https://k-foodvelikotarnovo.com';
const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX = 'noindex, follow';
const text = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const headers = robots => ({
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0',
  'CDN-Cache-Control': 'no-store', 'Surrogate-Control': 'no-store',
  'X-Robots-Tag': robots, 'X-Content-Type-Options': 'nosniff', 'X-Kfood-Product-HTML': 'pilot-v1',
});

function publicCredential(key) {
  if (typeof key !== 'string') throw Error('An anonymous/publishable key is required');
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (key.split('.').length === 3 && payload.role === 'anon') return true;
  } catch { /* Never accept a server secret as a public credential. */ }
  throw Error('Only a publishable key or legacy anon JWT may read the HTML catalog');
}

export function checkedPublicProduct(row, expected) {
  if (!row || row.id !== expected.id || row.slug !== expected.slug || row.visibility !== 'retail') throw Error('Product identity or publication mismatch');
  if (typeof row.name !== 'string' || !row.name.trim() || typeof row.description !== 'string'
    || typeof row.category !== 'string' || typeof row.in_stock !== 'boolean'
    || typeof row.price !== 'number' || !Number.isFinite(row.price) || row.price < 0
    || Math.abs(row.price * 100 - Math.round(row.price * 100)) > 1e-7
    || !Number.isSafeInteger(row.stock) || row.stock < 0
    || typeof row.rating !== 'number' || !Number.isFinite(row.rating) || row.rating < 0 || row.rating > 5
    || !Number.isSafeInteger(row.reviews) || row.reviews < 0) throw Error('Invalid public product');
  const image = new URL(row.image);
  if (image.protocol !== 'https:' || image.username || image.password || image.searchParams.has('token')
    || !['static.readdy.ai', 'readdy.ai', 'res.cloudinary.com'].includes(image.hostname)
      && !image.hostname.endsWith('.supabase.co')) throw Error('Invalid public product image');
  for (const key of ['badge', 'weight', 'volume', 'seo_title', 'seo_description']) {
    if (row[key] != null && typeof row[key] !== 'string') throw Error('Invalid public product text');
  }
  // Project explicitly even if the upstream accidentally returns extra fields.
  const allowed = Object.fromEntries(HTML_PRODUCT_FIELDS.split(',').map(key => [key, row[key]]));
  return { ...allowed, in_stock: productAvailable(row) };
}

function head(template, { title, description, canonical, image, robots, schema }) {
  let html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|keywords|robots|googlebot|bingbot|og:(?:title|description|type|url|image(?::(?:alt|width|height))?)|twitter:(?:card|title|description|image(?::alt)?))["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*data-seo-managed[^>]*>[\s\S]*?<\/script>/gi, '');
  const meta = (name, value, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${text(value)}" />`;
  const tags = [
    `<title>${text(title)}</title>`, meta('description', description),
    ...['robots', 'googlebot', 'bingbot'].map(name => meta(name, robots)),
    `<link rel="canonical" href="${text(canonical)}" />`,
    meta('og:title', title, true), meta('og:description', description, true),
    meta('og:type', image ? 'product' : 'website', true), meta('og:url', canonical, true),
    ...(image ? [meta('og:image', image, true), meta('og:image:alt', title, true)] : []),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', title), meta('twitter:description', description),
    ...(image ? [meta('twitter:image', image), meta('twitter:image:alt', title)] : []),
    ...(schema ? [`<script type="application/ld+json" data-seo-managed="true">${json(schema)}</script>`] : []),
  ].join('\n');
  if (!/<\/head>/i.test(html) || !/<div\s+id=["']root["']\s*><\/div>/i.test(html)) throw Error('Unsupported app template');
  return html.replace(/<\/head>/i, `${tags}\n</head>`);
}

function document(template, metadata, markup) {
  let html = head(template, metadata);
  // The original loading overlay would hide all content with JS disabled.
  html = html.replace(/<div id="loading-screen"[\s\S]*?<\/div>\s*<\/div>/, '');
  const body = `<div id="kfood-product-html" class="customer-shell customer-root">${markup}</div>`;
  return html.replace(/<div\s+id=["']root["']\s*><\/div>/i,
    `${body}<div id="root"></div><script src="/seo-product-bridge.js" defer></script>`);
}

export function createProductHtmlHandler({ template, supabaseUrl, publicKey, renderProduct, renderMissing,
  products = PILOT_PRODUCTS, indexable = false, fetcher = fetch, timeoutMs = 10000 }) {
  const legacy = publicCredential(publicKey);
  const api = new URL(supabaseUrl);
  if (api.protocol !== 'https:' || api.username || api.password || !api.hostname.endsWith('.supabase.co')) throw Error('An HTTPS Supabase project URL is required');
  if (!Array.isArray(products) || !products.length || products.length > 5
    || new Set(products.map(p => p.id)).size !== products.length
    || new Set(products.map(p => p.slug)).size !== products.length
    || products.some(p => !Number.isSafeInteger(p.id) || p.id < 1 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) || /^\d+$/.test(p.slug))) throw Error('Invalid five-product pilot scope');
  const scope = new Map(products.flatMap(p => [[`/product/${p.slug}`, p], [`/product/${p.id}`, p]]));
  const keyHeaders = { apikey: publicKey, Accept: 'application/json', ...(legacy ? { Authorization: `Bearer ${publicKey}` } : {}) };
  return async request => {
    const expected = scope.get(new URL(request.url).pathname);
    if (!expected || !['GET', 'HEAD'].includes(request.method)) return null;
    const canonical = `${SITE_URL}/product/${expected.slug}`;
    const noProduct = (failure = false) => {
      const metadata = { title: failure ? 'Временно недостъпен продукт | K-FOOD' : 'Продуктът не е намерен | K-FOOD',
        description: failure ? 'Опитай отново след малко.' : 'Разгледай публичния каталог на K-FOOD.', canonical, robots: NOINDEX };
      // Confirmed missing/hidden products retain the host-compatible 200/noindex.
      return new Response(request.method === 'HEAD' ? null : document(template, metadata, renderMissing(failure)), {
        status: failure ? 503 : 200, headers: { ...headers(NOINDEX), ...(failure ? { 'Retry-After': '60' } : {}) },
      });
    };
    try {
      const url = new URL('/rest/v1/products', api);
      url.search = new URLSearchParams({ select: HTML_PRODUCT_FIELDS, id: `eq.${expected.id}`, slug: `eq.${expected.slug}`, visibility: 'eq.retail', limit: '2' }).toString();
      // No incoming cookies, authorization, user agents, private sessions or cache.
      const response = await fetcher(url, { headers: keyHeaders, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', redirect: 'error' });
      if (!response.ok) return noProduct(true);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length > 1) return noProduct(true);
      if (!rows.length) return noProduct();
      const product = checkedPublicProduct(rows[0], expected);
      if (product.category === 'Алкохол') return noProduct(true);
      const { markup, schema } = renderProduct(product);
      const metadata = { ...productSEO(product), canonical, image: product.image, robots: indexable ? INDEX : NOINDEX, schema };
      return new Response(request.method === 'HEAD' ? null : document(template, metadata, markup), { status: 200, headers: headers(metadata.robots) });
    } catch { return noProduct(true); }
  };
}
