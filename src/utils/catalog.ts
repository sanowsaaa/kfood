import { supabase } from './supabase';
import { productAvailable, type StoreProduct } from './customer';

export const PUBLIC_PRODUCT_FIELDS = 'id,name,description,price,image,category,badge,rating,reviews,in_stock,stock,slug,weight,volume';
export async function loadProducts(signal: AbortSignal): Promise<StoreProduct[]> {
  const { data, error } = await supabase.from('products').select(PUBLIC_PRODUCT_FIELDS)
    .order('id', { ascending: true }).abortSignal(signal);
  if (error || !Array.isArray(data)) throw new Error('Products unavailable');
  return (data as unknown as StoreProduct[]).map(product => ({ ...product, in_stock: productAvailable(product) }));
}
