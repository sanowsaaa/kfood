export interface StoreProduct {
  id: number; name: string; description: string; price: number; image: string; category: string;
  badge?: string; rating: number; reviews: number; in_stock: boolean; stock: number;
  slug?: string; weight?: string; volume?: string;
}

export interface StoredCartItem {
  id: number; name: string; price: number; image: string; quantity: number;
  category?: string; slug?: string; in_stock?: boolean; stock?: number;
}

// Browser storage is an untrusted draft. The server remains the price/stock authority.
export function normalizeCart(value: unknown): StoredCartItem[] {
  if (!Array.isArray(value)) return [];
  const result = new Map<number, StoredCartItem>();
  for (const raw of value.slice(0, 50)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (!Number.isSafeInteger(item.id) || Number(item.id) < 1 || typeof item.name !== 'string' ||
      typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 ||
      !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 100) continue;
    const id = Number(item.id), previous = result.get(id);
    result.set(id, { id, name: item.name.slice(0, 500), price: item.price,
      image: typeof item.image === 'string' ? item.image : '',
      quantity: Math.min(100, Number(item.quantity) + (previous?.quantity || 0)),
      ...(typeof item.category === 'string' ? { category: item.category } : {}),
      ...(typeof item.slug === 'string' ? { slug: item.slug } : {}),
      ...(typeof item.in_stock === 'boolean' ? { in_stock: item.in_stock } : {}),
      ...(Number.isSafeInteger(item.stock) && Number(item.stock) >= 0 ? { stock: Number(item.stock) } : {}),
    });
  }
  return [...result.values()];
}

export function readCart(key: string): StoredCartItem[] {
  try { return normalizeCart(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return []; }
}

export function subtotalMinor(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
}
export function discountedMinor(subtotal: number, percent: number): number {
  return Math.round(subtotal * (100 - percent) / 100);
}
export function productAvailable(product: { in_stock?: boolean; stock?: number }): boolean {
  return product.in_stock === true && (product.stock == null || product.stock > 0);
}
export function validateCartForCheckout(items: StoredCartItem[]): void {
  if (items.length === 0) throw new Error('Количката е празна.');
  if (items.length > 50) throw new Error('Поръчката може да съдържа до 50 различни продукта.');
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 ||
      !Number.isFinite(item.price) || item.price < 0) throw new Error('Проверете количествата в количката.');
    if (item.in_stock === false || (item.stock != null && item.quantity > item.stock))
      throw new Error(`Недостатъчна наличност за „${item.name}“. Променете количката преди плащане.`);
  }
}
export function checkoutRedirect(data: unknown): { url: string; orderNumber: string } {
  const result = data as { url?: unknown; orderNumber?: unknown } | null;
  if (typeof result?.url !== 'string' || typeof result.orderNumber !== 'string' ||
      !/^[a-z0-9-]{3,100}$/i.test(result.orderNumber)) throw new Error('Не получихме валиден линк за плащане от сървъра.');
  let url: URL;
  try { url = new URL(result.url); } catch { throw new Error('Невалиден линк за плащане.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.port || url.username || url.password)
    throw new Error('Невалиден линк за плащане.');
  return { url: url.href, orderNumber: result.orderNumber };
}
export const emailValid = (value: string) => value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const phoneValid = (value: string) => /^(\+359\d{8,9}|0\d{9})$/.test(value.replace(/\s/g, ''));
