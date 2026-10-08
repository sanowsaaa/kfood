import { useState } from 'react';

import type { Product } from './ProductEditModal';

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  busy?: boolean;
  searchQuery: string;
  catalogFilter: 'all' | 'missing' | 'duplicate';
  onToggleStock: (id: string | number, currentStock: boolean) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string | number) => void;
}

export default function ProductList({ products, loading, busy, searchQuery, catalogFilter, onToggleStock, onEdit, onDelete }: ProductListProps) {
  const [sortField, setSortField] = useState<'name' | 'price' | 'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const skuCounts = new Map<string, number>();
  products.forEach((p) => {
    const s = (p.sku || '').trim();
    if (s) skuCounts.set(s, (skuCounts.get(s) || 0) + 1);
  });
  const duplicateSkus = new Set<string>();
  skuCounts.forEach((cnt, s) => { if (cnt > 1) duplicateSkus.add(s); });
  const missingSkuCount = products.filter((p) => !(p.sku && p.sku.trim())).length;
  const duplicateSkuCount = duplicateSkus.size;

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      String(p.id).includes(q);
    const s = (p.sku || '').trim();
    const matchesCatalog =
      catalogFilter === 'all' ||
      (catalogFilter === 'missing' && !s) ||
      (catalogFilter === 'duplicate' && duplicateSkus.has(s));
    return matchesSearch && matchesCatalog;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'price') cmp = a.price - b.price;
    else if (sortField === 'stock') cmp = (a.stock || 0) - (b.stock || 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <i aria-hidden="true" className="ri-arrow-up-down-line text-gray-300 ml-1"></i>;
    return sortDir === 'asc' ? <i aria-hidden="true" className="ri-arrow-up-line text-teal-600 ml-1"></i> : <i aria-hidden="true" className="ri-arrow-down-line text-teal-600 ml-1"></i>;
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <i aria-hidden="true" className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-gray-600">Зареждане на продукти...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <i aria-hidden="true" className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
        <p className="text-gray-500 text-lg">Няма намерени продукти</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <i aria-hidden="true" className="ri-search-line text-6xl text-gray-300 mb-4"></i>
        <p className="text-gray-500 text-lg">Няма резултати за „{searchQuery}"</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Снимка</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" aria-sort={sortField === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggleSort('name')} className="flex items-center whitespace-nowrap uppercase">Продукт <SortIcon field="name" /></button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Каталожен №</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Категория</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" aria-sort={sortField === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggleSort('price')} className="flex items-center whitespace-nowrap uppercase">Цена <SortIcon field="price" /></button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">B2B Цена</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">MOQ</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" aria-sort={sortField === 'stock' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggleSort('stock')} className="flex items-center whitespace-nowrap uppercase">Наличност <SortIcon field="stock" /></button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  #{product.id}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    loading="lazy"
                  />
                </td>
                <td className="px-3 py-4">
                  <div className="max-w-xs">
                    <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">{product.description}</p>
                    {product.badge && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded whitespace-nowrap">
                        {product.badge}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-mono">
                  {product.sku && product.sku.trim() ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700 font-semibold">{product.sku.trim()}</span>
                      {duplicateSkus.has(product.sku.trim()) && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded whitespace-nowrap" title="Дублиран каталожен номер">Дубл.</span>
                      )}
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-[11px] font-bold rounded whitespace-nowrap">
                      <i aria-hidden="true" className="ri-error-warning-line mr-0.5"></i>Няма №
                    </span>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded whitespace-nowrap">
                    {product.category}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <div className="font-medium text-gray-900">
                    €{product.price.toFixed(2)}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {product.wholesale_price > 0 ? (
                    <div>
                      <div className="font-medium text-emerald-700">€{product.wholesale_price.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {product.carton_price > 0 ? `Кашон: €${product.carton_price.toFixed(2)}` : '—'}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {product.moq > 1 || product.moq_unit !== 'бр.' ? (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded font-medium whitespace-nowrap">
                      {product.moq} {product.moq_unit}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <button
                    disabled={busy} onClick={() => onToggleStock(product.id, product.in_stock)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      product.in_stock
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {product.in_stock ? (
                      <>
                        <i aria-hidden="true" className="ri-checkbox-circle-line mr-1"></i>
                        {product.stock || 0} бр.
                      </>
                    ) : (
                      <>
                        <i aria-hidden="true" className="ri-close-circle-line mr-1"></i>
                        Изчерпан
                      </>
                    )}
                  </button>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={busy} onClick={() => onEdit(product)}
                      className="px-2 py-2 flex items-center gap-1 text-xs font-medium justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Редактирай"
                    >
                      <i aria-hidden="true" className="ri-edit-line text-lg"></i>Редактирай
                    </button>
                    <button
                      disabled={busy} onClick={() => onDelete(product.id)}
                      className="px-2 py-2 flex items-center gap-1 text-xs font-medium justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Изтрий"
                    >
                      <i aria-hidden="true" className="ri-delete-bin-line text-lg"></i>Изтрий
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex items-center justify-between flex-wrap gap-2">
        <span>Показани {sorted.length} от {products.length} продукта</span>
        <span className="flex items-center gap-3 flex-wrap">
          {missingSkuCount > 0 && (
            <span className="text-red-500 font-semibold whitespace-nowrap">
              <i aria-hidden="true" className="ri-error-warning-line mr-1"></i>{missingSkuCount} без каталожен №
            </span>
          )}
          {duplicateSkuCount > 0 && (
            <span className="text-amber-600 font-semibold whitespace-nowrap">
              <i aria-hidden="true" className="ri-error-warning-line mr-1"></i>{duplicateSkuCount} дублирани №
            </span>
          )}
        </span>
      </div>
    </div>
  );
}