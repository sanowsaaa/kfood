import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminHeader from './components/AdminHeader';
import ProductList from './components/ProductList';
import AddProductModal from './components/AddProductModal';
import ProductEditModal from './components/ProductEditModal';

interface Product {
  id: string;
  name: string;
  price: number;
  price_euro: number;
  wholesale_price?: number;
  carton_price?: number;
  image: string;
  category: string;
  description?: string;
  stock?: number;
  in_stock?: boolean;
  sku?: string | null;
  moq?: number;
  moq_unit?: string;
  pieces_per_carton?: number;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'missing' | 'duplicate'>('all');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/login');
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch {
      // Silently handle
    } finally { setLoading(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете този продукт?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter((p) => String(p.id) !== String(id)));
    } catch {
      alert('Грешка при изтриване на продукта');
    }
  };

  const handleToggleStock = async (id: string | number, currentStock: boolean) => {
    try {
      const { error } = await supabase.from('products').update({ in_stock: !currentStock }).eq('id', id);
      if (error) throw error;
      setProducts(products.map((p) => String(p.id) === String(id) ? { ...p, in_stock: !currentStock } : p));
    } catch {
      alert('Грешка при промяна на наличността');
    }
  };

  const handleEditProduct = (product: Product) => { setEditingProduct(product); };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Проверка на достъпа...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление на продукти</h1>
            <p className="text-gray-600 mt-1">Добавяйте, редактирайте и изтривайте продукти</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/admin/game" className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i className="ri-gamepad-line text-xl"></i> Игра
            </a>
            <a href="/admin/orders" className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i className="ri-file-list-3-line text-xl"></i> Поръчки
            </a>
            <a href="/admin/reviews" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i className="ri-star-line text-xl"></i> Ревюта
            </a>
            <a href="/admin/blog" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i className="ri-article-line text-xl"></i> Блог
            </a>
            <a href="/admin/b2b" className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i className="ri-building-2-line text-xl"></i> B2B
            </a>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <i className="ri-add-line text-xl"></i> Добави продукт
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400"></i>
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
                <i className="ri-close-circle-line"></i>
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
              {f.value !== 'all' && <i className="ri-error-warning-line mr-1"></i>}
              {f.label}
            </button>
          ))}
        </div>

        <ProductList
          products={products}
          loading={loading}
          searchQuery={searchQuery}
          catalogFilter={catalogFilter}
          onToggleStock={handleToggleStock}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      </main>

      {isAddModalOpen && (
        <AddProductModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); fetchProducts(); }}
        />
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => { setEditingProduct(null); fetchProducts(); }}
        />
      )}
    </div>
  );
}