// A readiness signal for supporting renderers; it never gates UI or fetches data.
type Gate = { hadFlag: boolean; previous: unknown };
declare global {
  interface Window {
    prerenderReady?: unknown;
    __kfoodProductPrerender?: Gate;
  }
}
export interface ProductSnapshot {
  pathname: string;
  state?: string | null;
  productId?: string | null;
  heading: string;
  title: string;
  description: string;
  canonical: string[];
  ogTitle: string;
  ogUrl: string;
  robots: string;
  products: unknown[];
}
const productPath = (path: string) => /^\/product\/[^/]+\/?$/.test(path);
const normalized = (path: string) => path.replace(/\/$/, '');
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function productSnapshotReady(snapshot: ProductSnapshot): boolean {
  if (!productPath(snapshot.pathname) || !['ready', 'missing'].includes(snapshot.state || '')
    || !snapshot.heading.trim() || !snapshot.title.trim() || !snapshot.description.trim()
    || snapshot.canonical.length !== 1 || snapshot.ogTitle !== snapshot.title
    || snapshot.ogUrl !== snapshot.canonical[0]) return false;
  let canonicalPath: string;
  try { canonicalPath = normalized(new URL(snapshot.canonical[0]).pathname); } catch { return false; }
  if (snapshot.state === 'missing') return canonicalPath === normalized(snapshot.pathname)
    && snapshot.robots.split(/[\s,]+/).includes('noindex') && snapshot.products.length === 0;
  if (snapshot.products.length !== 1 || !record(snapshot.products[0])) return false;
  const product = snapshot.products[0];
  if (typeof product.name !== 'string' || product.name.trim() !== snapshot.heading.trim()
    || !record(product.offers) || product.offers.url !== snapshot.canonical[0]) return false;
  const segment = normalized(snapshot.pathname).split('/').at(-1)!;
  return /^\d+$/.test(segment)
    ? segment === snapshot.productId && productPath(canonicalPath)
    : canonicalPath === normalized(snapshot.pathname);
}

function restore() {
  const gate = window.__kfoodProductPrerender;
  if (!gate) return;
  if (gate.hadFlag) window.prerenderReady = gate.previous;
  else delete window.prerenderReady;
  delete window.__kfoodProductPrerender;
}

export function beginProductPrerender(pathname: string) {
  if (!productPath(pathname)) { restore(); return; }
  window.__kfoodProductPrerender ||= {
    hadFlag: Object.prototype.hasOwnProperty.call(window, 'prerenderReady'), previous: window.prerenderReady,
  };
  window.prerenderReady = false;
}

export function finishProductPrerender() {
  if (!window.__kfoodProductPrerender || !productPath(window.location.pathname)) return;
  // Ignore the optional server preview: the original app must recheck public data.
  const view = document.querySelector<HTMLElement>('#root [data-public-product-state]');
  if (view?.dataset.publicProductState === 'age') { restore(); return; }
  const products: unknown[] = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"][data-seo-managed]')) {
    try {
      const value: unknown = JSON.parse(script.textContent || '{}');
      const graph = record(value) && Array.isArray(value['@graph']) ? value['@graph'] : [value];
      products.push(...graph.filter(item => record(item) && item['@type'] === 'Product'));
    } catch { return; }
  }
  const meta = (selector: string) => document.querySelector<HTMLMetaElement>(selector)?.content || '';
  window.prerenderReady = productSnapshotReady({
    pathname: window.location.pathname, state: view?.dataset.publicProductState, productId: view?.dataset.publicProductId,
    heading: view?.querySelector('h1')?.textContent || '', title: document.title,
    description: meta('meta[name="description"]'),
    canonical: [...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')].map(link => link.href),
    ogTitle: meta('meta[property="og:title"]'), ogUrl: meta('meta[property="og:url"]'),
    robots: meta('meta[name="robots"]'), products,
  });
}
