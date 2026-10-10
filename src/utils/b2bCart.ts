import type { B2BCartItem, B2BProduct } from '@/contexts/B2BContext';

// The existing checkout contract uses pieces, whole packs, and at most 50 lines.
export const MAX_B2B_PIECES = 10000;
export const MAX_B2B_LINES = 50;
export const packSize = (product: B2BProduct) => product.pieces_per_carton > 0 ? product.pieces_per_carton : 1;
export const maxPacks = (product: B2BProduct) => Math.floor(MAX_B2B_PIECES / packSize(product));
export const packPrice = (product: B2BProduct) => product.pieces_per_carton > 0
  ? product.carton_price || product.wholesale_price || product.price || 0
  : product.wholesale_price || product.price || 0;
export const lineTotal = (product: B2BProduct, quantity: number) =>
  Math.round((packPrice(product) + Number.EPSILON) * 100) * (quantity / packSize(product)) / 100;

export function validQuantity(product: B2BProduct, quantity: number): boolean {
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= MAX_B2B_PIECES && quantity % packSize(product) === 0;
}

// localStorage is an untrusted draft, including carts saved by older clients.
export function restoreB2BCart(raw: string | null): B2BCartItem[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    const restored: B2BCartItem[] = [];
    for (const item of parsed) {
      const p = item?.product ? { ...item.product, pieces_per_carton: item.product.pieces_per_carton ?? 0 } : null;
      if (!p || !Number.isSafeInteger(p.id) || p.id <= 0 || typeof p.name !== 'string' ||
          !Number.isSafeInteger(p.pieces_per_carton) || p.pieces_per_carton < 0 || p.pieces_per_carton > MAX_B2B_PIECES ||
          !['price', 'wholesale_price', 'carton_price'].every(key => p[key] == null || (typeof p[key] === 'number' && Number.isFinite(p[key]) && p[key] >= 0)) ||
          !validQuantity(p, item.quantity) || packPrice(p) <= 0 || restored.some(row => row.product.id === p.id)) continue;
      const product = { ...p };
      delete product.cost_price;
      for (const key of ['description', 'image', 'category', 'sku', 'slug', 'weight', 'volume', 'badge', 'moq_unit']) {
        if (typeof product[key] !== 'string') product[key] = '';
      }
      restored.push({ product, quantity: item.quantity });
      if (restored.length === MAX_B2B_LINES) break;
    }
    return restored;
  } catch { return []; }
}
