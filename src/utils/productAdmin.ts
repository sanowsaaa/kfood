// Retail publication keeps the existing public/RLS/checkout/SEO predicate.
export function productVisibility(retail: boolean, b2b: boolean): 'retail' | 'wholesale' | 'hidden' {
  return retail ? 'retail' : b2b ? 'wholesale' : 'hidden';
}

export type ProductChannelFilter = 'all' | 'both' | 'retail' | 'b2b' | 'hidden';
export function matchesProductChannel(product: { visibility?: string; b2b_enabled: boolean }, filter: ProductChannelFilter) {
  const retail = product.visibility === 'retail';
  const b2b = product.b2b_enabled === true;
  return filter === 'all' || (filter === 'both' && retail && b2b)
    || (filter === 'retail' && retail && !b2b) || (filter === 'b2b' && !retail && b2b)
    || (filter === 'hidden' && !retail && !b2b);
}

const editableFields = ['name', 'description', 'price', 'price_euro', 'wholesale_price',
  'carton_price', 'image', 'category', 'badge', 'rating', 'reviews', 'in_stock', 'stock',
  'weight', 'volume', 'sku', 'cost_price', 'moq', 'moq_unit', 'pieces_per_carton',
  'visibility', 'b2b_enabled'] as const;
const nullableText = new Set(['description', 'badge', 'weight', 'volume', 'sku']);

// Compare with the draft initially shown, not a later refresh or the whole row.
// This also preserves legacy price_euro differences when price was not edited.
export function productPatch(before: object, after: object): Record<string, unknown> {
  const original = before as Record<string, unknown>;
  const current = after as Record<string, unknown>;
  return Object.fromEntries(editableFields.filter(key => !Object.is(original[key], current[key]))
    .map(key => [key, nullableText.has(key) && current[key] === '' ? null : current[key]]));
}

export function requireProductVersion(product: { edit_version: number }): number {
  if (!Number.isSafeInteger(product.edit_version) || product.edit_version < 0) {
    throw new Error('Липсва актуална версия на продукта. Обновете списъка преди редакция.');
  }
  return product.edit_version;
}
