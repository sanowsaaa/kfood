import { useEffect } from 'react';
import { absoluteSiteUrl, DEFAULT_SITE_URL } from './urls';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  robots?: string;
  article?: { publishedTime?: string; modifiedTime?: string; section?: string };
  schema?: object;
}

export const SITE_LOGO = 'https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp';
const MANAGED_SCHEMA_ATTR = 'data-seo-managed';
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const siteUrl = () => import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL;

// Defaults cover pages without their own SEO hook. Never put emails, order
// proofs or authentication codes from query parameters into metadata.
export function getRouteSEO(pathname: string): SEOProps {
  const privatePage = /^\/(admin|login|cart|checkout|order-success|track-order|leave-review)(\/|$)/.test(pathname)
    || /^\/b2b\/(apply|register|login|dashboard|products|product|quick-order|cart|checkout|orders|documents)(\/|$)/.test(pathname);
  const publicPage = /^\/$|^\/(products|categories|about|faq|blog|shipping|payment|returns|privacy|terms|b2b)\/?$/.test(pathname)
    || /^\/(product|category|blog)\/[^/]+\/?$/.test(pathname);
  const title = pathname.startsWith('/admin') ? 'Администратор | K-FOOD'
    : pathname.startsWith('/b2b/') ? 'B2B портал | K-FOOD'
    : 'K-FOOD — Корейска храна и нови вкусове';
  return { title, description: 'Открий рамен, кимчи, сосове и още вкусове в K-FOOD. Онлайн и във Велико Търново.',
    canonical: pathname, robots: privatePage || !publicPage ? 'noindex, follow' : INDEX_ROBOTS };
}

function updateMetaTag(name: string, content: string, isProperty = false) {
  const attribute = isProperty ? 'property' : 'name';
  const elements = document.querySelectorAll<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  let element = elements[0];
  elements.forEach((duplicate, index) => { if (index > 0) duplicate.remove(); });
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

export const updateSEO = (data: SEOProps) => {
  const url = absoluteSiteUrl(data.canonical || window.location.pathname, siteUrl());
  const image = absoluteSiteUrl(data.ogImage || SITE_LOGO, siteUrl());
  const robots = data.robots || getRouteSEO(window.location.pathname).robots!;
  document.title = data.title;
  updateMetaTag('description', data.description);
  if (data.keywords) updateMetaTag('keywords', data.keywords);
  else document.querySelectorAll('meta[name="keywords"]').forEach(element => element.remove());
  ['robots', 'googlebot', 'bingbot'].forEach(name => updateMetaTag(name, robots));
  updateMetaTag('og:title', data.title, true);
  updateMetaTag('og:description', data.description, true);
  updateMetaTag('og:type', data.ogType || 'website', true);
  updateMetaTag('og:url', url, true);
  updateMetaTag('og:image', image, true);
  updateMetaTag('og:image:alt', data.title, true);
  // Page images have different proportions; don't inherit logo dimensions.
  ['og:image:width', 'og:image:height'].forEach(name => document.querySelectorAll(`meta[property="${name}"]`).forEach(element => element.remove()));
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', data.title);
  updateMetaTag('twitter:description', data.description);
  updateMetaTag('twitter:image', image);
  updateMetaTag('twitter:image:alt', data.title);
  document.querySelectorAll('meta[property^="article:"]').forEach(element => element.remove());
  if (data.article?.publishedTime) updateMetaTag('article:published_time', data.article.publishedTime, true);
  if (data.article?.modifiedTime) updateMetaTag('article:modified_time', data.article.modifiedTime, true);
  if (data.article?.section) updateMetaTag('article:section', data.article.section, true);

  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
  let canonical = links[0];
  links.forEach((duplicate, index) => { if (index > 0) duplicate.remove(); });
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
  document.querySelectorAll(`script[type="application/ld+json"][${MANAGED_SCHEMA_ATTR}]`).forEach(element => element.remove());
  if (data.schema) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_SCHEMA_ATTR, 'true');
    script.textContent = JSON.stringify(data.schema);
    document.head.appendChild(script);
    return () => script.remove();
  }
};

export const useSEO = ({ title, description, keywords, canonical, ogType, ogImage, robots, article, schema }: SEOProps) => {
  useEffect(() => updateSEO({ title, description, keywords, canonical, ogType, ogImage, robots, article, schema }),
    [title, description, keywords, canonical, ogType, ogImage, robots, article, schema]);
};

export const getWebsiteSchema = () => ({
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${siteUrl()}/#website`,
  name: 'K-FOOD Велико Търново', url: siteUrl(), inLanguage: 'bg-BG',
  description: 'Корейска храна, азиатски вкусове и култура. Онлайн и във Велико Търново.',
  publisher: { '@id': `${siteUrl()}/#organization` },
  potentialAction: { '@type': 'SearchAction', target: `${siteUrl()}/products?search={search_term_string}`, 'query-input': 'required name=search_term_string' },
});

export const getLocalBusinessSchema = () => ({
  '@context': 'https://schema.org', '@type': ['LocalBusiness', 'Store', 'OnlineStore'],
  '@id': `${siteUrl()}/#organization`, name: 'K-FOOD Велико Търново',
  image: SITE_LOGO, logo: SITE_LOGO, url: siteUrl(), telephone: '+359899897566', email: 'kfoodtarnovo@gmail.com',
  address: { '@type': 'PostalAddress', streetAddress: 'ул. Велчо Джамджията 6', addressLocality: 'Велико Търново', postalCode: '5000', addressCountry: 'BG' },
  geo: { '@type': 'GeoCoordinates', latitude: 43.0757, longitude: 25.6172 },
  areaServed: { '@type': 'Country', name: 'Bulgaria' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '19:00' }],
  priceRange: '€€', currenciesAccepted: 'EUR',
  sameAs: ['https://www.facebook.com/profile.php?id=61556516122723', 'https://www.instagram.com/kfood_veliko_tarnovo/', 'https://www.tiktok.com/@kfoodveliko'],
  description: 'Магазин за корейска храна, азиатски продукти и култура. Онлайн с доставка в България и на място във Велико Търново.',
});

// Preserve the existing export for callers using the former helper name.
export const _getLocalBusinessSchemaLegacy = getLocalBusinessSchema;

export const getProductSchema = (product: {
  name: string; description: string; image: string; price: number;
  rating?: number; reviews?: number; inStock: boolean; productId?: number | string; slug?: string;
}) => ({
  '@context': 'https://schema.org', '@type': 'Product',
  name: product.name, image: product.image, description: product.description,
  offers: {
    '@type': 'Offer', url: product.productId ? absoluteSiteUrl(`/product/${product.slug || product.productId}`, siteUrl()) : siteUrl(),
    priceCurrency: 'EUR', price: product.price.toFixed(2),
    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: { '@type': 'Organization', '@id': `${siteUrl()}/#organization`, name: 'K-FOOD Велико Търново' },
  },
  // The catalogue has no verified manufacturer, price expiry or source of
  // product reviews. K-FOOD is the seller; those fields must not be invented.
});

export const getBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteSiteUrl(item.url, siteUrl()) })),
});
