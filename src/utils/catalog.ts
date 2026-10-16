import { supabase } from './supabase';
import { productAvailable, type StoreProduct } from './customer';

export const PUBLIC_PRODUCT_FIELDS = 'id,name,description,price,image,category,badge,rating,reviews,in_stock,stock,slug,weight,volume,visibility';
// Only the detail request needs editorial metadata; cards keep their projection.
export const PUBLIC_PRODUCT_SEO_FIELDS = `${PUBLIC_PRODUCT_FIELDS},seo_title,seo_description`;
export async function loadProducts(signal: AbortSignal, category?: string): Promise<StoreProduct[]> {
  let query = supabase.from('products').select(PUBLIC_PRODUCT_FIELDS).eq('visibility', 'retail')
    .order('id', { ascending: true });
  if (category) query = query.eq('category', category);
  const { data, error } = await query.abortSignal(signal);
  if (error || !Array.isArray(data)) throw new Error('Products unavailable');
  return (data as unknown as StoreProduct[]).map(product => ({ ...product, in_stock: productAvailable(product) }));
}

// The category directory needs counts, not prices, images or descriptions.
// Follow the server's actual page size and reject an incomplete/changing read.
export async function loadCategoryCounts(signal: AbortSignal): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.create(null);
  let offset = 0;
  let expected: number | undefined;
  do {
    const { data, count, error } = await supabase.from('products').select('category', { count: 'exact' })
      .eq('visibility', 'retail').order('id', { ascending: true }).range(offset, offset + 999).abortSignal(signal);
    if (error || !Array.isArray(data) || count == null || !Number.isSafeInteger(count) || count < 0
      || (expected !== undefined && count !== expected) || offset + data.length > count
      || (!data.length && offset < count)) throw new Error('Category counts unavailable');
    expected = count;
    for (const row of data) {
      if (typeof row.category === 'string') counts[row.category] = (counts[row.category] || 0) + 1;
    }
    offset += data.length;
  } while (offset < expected);
  return counts;
}

// Keep the existing rating selection and id tie-breaker without transferring
// the full catalog. Fetch fresh public prices and stock on every home visit.
export async function loadFeaturedProducts(signal: AbortSignal): Promise<StoreProduct[]> {
  const { data, error } = await supabase.from('products').select(PUBLIC_PRODUCT_FIELDS).eq('visibility', 'retail')
    .order('rating', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true }).limit(8).abortSignal(signal);
  if (error || !Array.isArray(data)) throw new Error('Products unavailable');
  return (data as unknown as StoreProduct[]).map(product => ({ ...product, in_stock: productAvailable(product) }));
}
