import { absoluteSiteUrl, DEFAULT_SITE_URL } from './urls';
import { SITE_LOGO, getBreadcrumbSchema } from './seo';

interface ArticlePost {
  title: string; slug: string; excerpt: string; content: string; cover_image: string;
  author: string; category: string; tags: string[]; created_at: string; updated_at?: string;
}

const isoDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};

export function getArticleSEO(post: ArticlePost) {
  const siteUrl = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL;
  const url = absoluteSiteUrl(`/blog/${post.slug}`, siteUrl);
  const publishedTime = isoDate(post.created_at);
  const modifiedTime = isoDate(post.updated_at) || publishedTime;
  const organizationAuthor = /^(?:екип\s+)?k[- ]?food\b/i.test(post.author.trim());
  const article: Record<string, unknown> = {
    '@type': 'Article', '@id': `${url}#article`, headline: post.title, description: post.excerpt,
    image: { '@type': 'ImageObject', url: absoluteSiteUrl(post.cover_image, siteUrl) },
    author: organizationAuthor ? { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: post.author }
      : { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'K-FOOD Велико Търново', url: siteUrl,
      logo: { '@type': 'ImageObject', url: SITE_LOGO } },
    ...(publishedTime ? { datePublished: publishedTime } : {}),
    ...(modifiedTime ? { dateModified: modifiedTime } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags.join(', '), articleSection: post.category, inLanguage: 'bg-BG', url,
    wordCount: post.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    isPartOf: { '@type': 'Blog', '@id': `${siteUrl}/blog`, name: 'K-FOOD Блог', url: `${siteUrl}/blog` },
  };
  if (['kak-digitalen-marketing-udvoi-klienti-k-food', 'zashto-vseki-biznes-investira-digitalen-marketing-2026'].includes(post.slug)) {
    article.mentions = { '@type': 'Organization', name: 'ТАВОРА ЕООД', alternateName: 'Tavora Digital Agency',
      url: 'https://imashnujnoto.com', sameAs: ['https://imashnujnoto.com/za-tavora'] };
  }
  return {
    title: `${post.title} | K-FOOD Блог`, description: post.excerpt, keywords: post.tags.join(', '),
    canonical: url, ogType: 'article', ogImage: post.cover_image,
    article: { publishedTime, modifiedTime, section: post.category },
    schema: { '@context': 'https://schema.org', '@graph': [article, getBreadcrumbSchema([
      { name: 'Начало', url: '/' }, { name: 'Блог', url: '/blog' }, { name: post.title, url },
    ])] },
  };
}
