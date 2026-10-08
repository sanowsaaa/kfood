import { useAdminAction } from '@/hooks/useAdminAction';
import { useAdminRead } from '@/hooks/useAdminRead';
import { checkedData, confirmedRecord } from '@/utils/admin';
import AdminFeedback from '@/pages/admin/components/AdminFeedback';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminAccess from '@/pages/admin/components/AdminAccess';
import AdminHeader from './components/AdminHeader';
import ProductList from './components/ProductList';
import AddProductModal from './components/AddProductModal';
import ProductEditModal from './components/ProductEditModal';

import type { Product } from './components/ProductEditModal';

export default function AdminPage() {
  const { isAdmin, loading: authLoading, error: authError, retry: retryAuth } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const { loading, error: loadError, load } = useAdminRead();
  const action = useAdminAction();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'missing' | 'duplicate'>('all');

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

  const fetchProducts = () => load(async () => checkedData(await supabase.from('products').select('*').order('created_at', { ascending: false })) as Product[], setProducts);

  const handleDeleteProduct = async (id: string | number) => {
    if (action.pending || !confirm('Сигурни ли сте, че искате да изтриете този продукт?')) return;
    await action.run(`delete:${id}`, async () => {
      confirmedRecord(await supabase.from('products').delete().eq('id', id).select('id').single(), id);
      setProducts(current => current.filter(p => String(p.id) !== String(id)));
    }, 'Продуктът е изтрит.');
  };

  const handleToggleStock = async (id: string | number, currentStock: boolean) => {
    await action.run(`stock:${id}`, async () => {
      confirmedRecord(await supabase.from('products').update({ in_stock: !currentStock }).eq('id', id).select('id').single(), id);
      setProducts(current => current.map(p => String(p.id) === String(id) ? { ...p, in_stock: !currentStock } : p));
    }, 'Наличността е обновена.');
  };

  const handleEditProduct = (product: Product) => { setEditingProduct(product); };

  if (authLoading || authError) return <AdminAccess error={authError} onRetry={retryAuth} />;

  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="admin-page min-h-screen bg-gray-50">
      <AdminHeader />

      <main id="admin-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление на продукти</h1>
            <p className="text-gray-600 mt-1">Добавяйте, редактирайте и изтривайте продукти</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={!!action.pending || loading || !!loadError} onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i aria-hidden="true" className="ri-add-line text-xl"></i> Добави продукт
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i aria-hidden="true" className="ri-search-line text-gray-400"></i>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Търси по име, категория, SKU или ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i aria-hidden="true" className="ri-close-circle-line"></i>
              </button>
            )}
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            Общо: <strong className="text-gray-900">{products.length}</strong> продукта
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Каталожен №:</span>
          {([
            { value: 'all', label: 'Всички' },
            { value: 'missing', label: 'Без №' },
            { value: 'duplicate', label: 'Дублирани' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setCatalogFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                catalogFilter === f.value
                  ? f.value === 'missing'
                    ? 'bg-red-600 text-white'
                    : f.value === 'duplicate'
                    ? 'bg-amber-500 text-white'
                    : 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.value !== 'all' && <i aria-hidden="true" className="ri-error-warning-line mr-1"></i>}
              {f.label}
            </button>
          ))}
        </div>

        <AdminFeedback message={loadError ? { type: 'error', text: loadError } : null} onRetry={fetchProducts} />
        <AdminFeedback message={action.message} onDismiss={action.clearMessage} />

        {!loadError && <ProductList
          busy={!!action.pending}
          products={products}
          loading={loading}
          searchQuery={searchQuery}
          catalogFilter={catalogFilter}
          onToggleStock={handleToggleStock}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />}
      </main>

      {isAddModalOpen && (
        <AddProductModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); action.setMessage({ type: 'success', text: 'Продуктът е добавен.' }); void fetchProducts(); }}
        />
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => { setEditingProduct(null); action.setMessage({ type: 'success', text: 'Промените са запазени.' }); void fetchProducts(); }}
        />
      )}
    </div>
  );
}