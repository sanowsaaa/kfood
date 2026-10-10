import { useEffect } from 'react';
import { absoluteSiteUrl } from './urls';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  schema?: object;
}

const MANAGED_SCHEMA_ATTR = 'data-seo-managed';

export const useSEO = ({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage,
  schema
}: SEOProps) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', ogType, true);
    
    if (ogImage) {
      updateMetaTag('og:image', ogImage, true);
    }

    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
    if (canonical) {
      updateMetaTag('og:url', absoluteSiteUrl(canonical, siteUrl), true);
      
      // Update canonical link
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', absoluteSiteUrl(canonical, siteUrl));
    }

    // Schema.org JSON-LD - remove all managed scripts first, then add new one
    if (schema) {
      document.querySelectorAll(`script[type="application/ld+json"][${MANAGED_SCHEMA_ATTR}]`).forEach(el => el.remove());
      const scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      scriptTag.setAttribute(MANAGED_SCHEMA_ATTR, 'true');
      scriptTag.textContent = JSON.stringify(schema);
      document.head.appendChild(scriptTag);
    }

    // Cleanup function
    return () => {
      document.querySelectorAll(`script[type="application/ld+json"][${MANAGED_SCHEMA_ATTR}]`).forEach(el => el.remove());
    };
  }, [title, description, keywords, canonical, ogType, ogImage, schema]);
};

// Add the missing updateSEO function
export const updateSEO = (seoData: SEOProps) => {
  // Update title
  document.title = seoData.title;

  // Update or create meta tags
  const updateMetaTag = (name: string, content: string, isProperty = false) => {
    const attribute = isProperty ? 'property' : 'name';
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  };

  // Basic meta tags
  updateMetaTag('description', seoData.description);
  if (seoData.keywords) {
    updateMetaTag('keywords', seoData.keywords);
  }

  // Open Graph tags
  updateMetaTag('og:title', seoData.title, true);
  updateMetaTag('og:description', seoData.description, true);
  updateMetaTag('og:type', seoData.ogType || 'website', true);
  
  if (seoData.ogImage) {
    updateMetaTag('og:image', seoData.ogImage, true);
  }

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  if (seoData.canonical) {
    updateMetaTag('og:url', absoluteSiteUrl(seoData.canonical, siteUrl), true);
    
    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', absoluteSiteUrl(seoData.canonical, siteUrl));
  }

  // Schema.org JSON-LD
  if (seoData.schema) {
    document.querySelectorAll(`script[type="application/ld+json"][${MANAGED_SCHEMA_ATTR}]`).forEach(el => el.remove());
    const scriptTag = document.createElement('script');
    scriptTag.setAttribute('type', 'application/ld+json');
    scriptTag.setAttribute(MANAGED_SCHEMA_ATTR, 'true');
    scriptTag.textContent = JSON.stringify(seoData.schema);
    document.head.appendChild(scriptTag);
  }
};

export const getWebsiteSchema = () => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'K-FOOD Велико Търново',
    url: siteUrl,
    description: 'Автентична корейска храна и продукти във Велико Търново',
    creator: {
      '@type': 'Person',
      name: 'Владимир Атанасов',
      url: 'https://imashnujnoto.com/',
      jobTitle: 'Web Developer',
      worksFor: {
        '@type': 'Organization',
        name: 'imashnujnoto.com',
        url: 'https://imashnujnoto.com/',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
};

export const getLocalBusinessSchema = () => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Store', 'OnlineStore'],
    '@id': `${siteUrl}/#organization`,
    name: 'K-FOOD - Магазин за Корейска Храна',
    alternateName: ['Онлайн Корейски Магазин', 'Корейски Магазин Онлайн', 'K-FOOD Велико Търново', 'корейска храна онлайн магазин'],
    image: 'https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp',
    logo: 'https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp',
    url: siteUrl,
    telephone: '+359899897566',
    email: 'kfoodtarnovo@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'ул. Велчо Джамджията 6',
      addressLocality: 'Велико Търново',
      postalCode: '5000',
      addressCountry: 'BG',
      addressRegion: 'Велико Търново'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.0757,
      longitude: 25.6172
    },
    areaServed: [
      { '@type': 'Country', name: 'Bulgaria', sameAs: 'https://www.wikidata.org/wiki/Q219' },
      { '@type': 'AdministrativeArea', name: 'Велико Търново' }
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '19:00'
      }
    ],
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Online Banking',
    servesCuisine: 'Korean',
    foundingDate: '2020',
    numberOfEmployees: 3,
    legalName: 'K-FOOD',
    slogan: 'Автентична корейска храна с доставка до цяла България',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Корейска Храна Онлайн',
      itemListElement: [
        { '@type': 'OfferCatalog', name: 'Корейски Рамен и Нудъли', description: 'Samyang Buldak, Nongshim, корейски нудъли онлайн' },
        { '@type': 'OfferCatalog', name: 'Кимчи', description: 'Автентично корейско кимчи онлайн' },
        { '@type': 'OfferCatalog', name: 'Токбоки', description: 'Корейски оризови кейкове токбоки' },
        { '@type': 'OfferCatalog', name: 'Корейски Сосове', description: 'Гочуджанг, доенджанг, самджанг' },
        { '@type': 'OfferCatalog', name: 'Корейски Снакове', description: 'Автентични корейски снакове и десерти' },
        { '@type': 'OfferCatalog', name: 'Корейски Напитки', description: 'Корейски чайове, сокове и традиционни напитки' }
      ]
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '2847'
    },
    sameAs: [
      'https://www.facebook.com/profile.php?id=61556516122723',
      'https://www.instagram.com/kfood_veliko_tarnovo/',
      'https://www.tiktok.com/@kfoodveliko'
    ],
    description: 'K-FOOD е специализиран онлайн магазин за корейска храна, кухня и култура в България. Автентични корейски продукти: кимчи, рамен Samyang, токбоки, корейски сосове и снакове с бърза доставка в цяла България.'
  };
};

// LEGACY - kept for backward compat 
export const _getLocalBusinessSchemaLegacy = () => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Store', 'OnlineStore'],
    '@id': `${siteUrl}/#organization`,
    name: 'K-FOOD - Магазин за Корейска Храна',
    alternateName: ['Онлайн Корейски Магазин', 'Корейски Магазин Онлайн', 'K-FOOD Велико Търново'],
    image: 'https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp',
    url: siteUrl,
    telephone: '+359899897566',
    email: 'kfoodtarnovo@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'ул. Велчо Джамджията 6',
      addressLocality: 'Велико Търново',
      postalCode: '5000',
      addressCountry: 'BG'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.0757,
      longitude: 25.6172
    },
    areaServed: {
      '@type': 'Country',
      name: 'Bulgaria'
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '19:00'
      }
    ],
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
    servesCuisine: 'Korean',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Корейска Храна Онлайн',
      itemListElement: [
        { '@type': 'OfferCatalog', 'name': 'Корейски Рамен' },
        { '@type': 'OfferCatalog', 'name': 'Кимчи' },
        { '@type': 'OfferCatalog', 'name': 'Токбоки' },
        { '@type': 'OfferCatalog', 'name': 'Корейски Сосове' },
        { '@type': 'OfferCatalog', 'name': 'Корейски Снакове' },
        { '@type': 'OfferCatalog', 'name': 'Корейски Напитки' }
      ]
    },
    sameAs: [
      'https://www.facebook.com/profile.php?id=61556516122723',
      'https://www.instagram.com/kfood_veliko_tarnovo/',
      'https://www.tiktok.com/@kfoodveliko'
    ],
    creator: {
      '@type': 'Person',
      name: 'Владимир Атанасов',
      url: 'https://imashnujnoto.com/',
      jobTitle: 'Web Developer',
      worksFor: {
        '@type': 'Organization',
        name: 'imashnujnoto.com',
        url: 'https://imashnujnoto.com/',
      },
    },
    description: 'K-FOOD е специализиран онлайн магазин за корейска храна, кухня и култура в България. Автентични корейски продукти: кимчи, рамен Samyang, токбоки, корейски сосове и снакове с бърза доставка в цяла България.'
  };
};

export const getProductSchema = (product: {
  name: string;
  description: string;
  image: string;
  price: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  productId?: number | string;
  slug?: string;
}) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  const productUrl = product.productId
    ? absoluteSiteUrl(`/product/${product.slug || product.productId}`, siteUrl)
    : siteUrl;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'K-FOOD'
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'EUR',
      price: product.price.toFixed(2),
      priceValidUntil: '2027-12-31',
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'K-FOOD Велико Търново'
      }
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toString(),
      reviewCount: product.reviews.toString()
    }
  };
};

export const getBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteSiteUrl(item.url, siteUrl)
    }))
  };
};
