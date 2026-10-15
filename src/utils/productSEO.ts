export interface ProductSEOContent {
  name: string;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

const plain = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/[*_#`]/g, '').replace(/\s+/gu, ' ').trim();
function excerpt(value: string, limit: number): string {
  const text = plain(value);
  if (text.length <= limit) return text;
  const end = text.lastIndexOf(' ', limit - 1);
  return `${text.slice(0, end > limit / 2 ? end : limit - 1).replace(/[\s,;:–—-]+$/u, '')}…`;
}

// SEO content never supplies price, stock, SKU, canonical or publication state.
// Null metadata remains compatible with new products and ordinary admin edits.
export function productSEO(product: ProductSEOContent): { title: string; description: string } {
  return {
    title: product.seo_title?.trim() || `${plain(product.name)} | K-FOOD`,
    description: product.seo_description?.trim() || excerpt(product.description || `${product.name}. Разгледай продукта в K-FOOD.`, 160),
  };
}

export function productDescriptionParagraphs(description: string | null | undefined): string[] {
  return (description || '').split(/\n\s*\n/u).map(value => value.trim()).filter(Boolean);
}
