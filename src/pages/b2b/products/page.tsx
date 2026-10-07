import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useB2B, B2BProduct } from '@/contexts/B2BContext';
import { supabase } from '@/utils/supabase';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

export default function B2BProductsPage() {
  const { companyId, company, loading, sessionLoading } = useB2B();
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name'>('name');

  useEffect(() => {
    setProductsLoading(true);
    supabase
      .from('products')
      .select('id, name, description, price, wholesale_price, carton_price, cost_price, image, category, badge, rating, reviews, in_stock, stock, weight, volume, sku, slug, moq, moq_unit, pieces_per_carton')
      .order('category')
      .order('name')
      .then(({ data }) => {
        if (data) setProducts(data);
        setProductsLoading(false);
      })
      .catch(() => setProductsLoading(false));
  }, []);

  const categories = [...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase().includes(q)))
      && (categoryFilter === 'all' || p.category === categoryFilter);
  });

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />

      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 font-heading">Продуктов каталог</h1>
          <p className="text-gray-500 text-sm mt-1">Минимална поръчка: 1 кашон · Добавяш по цели кашони</p>
          <p className="text-emerald-600/80 text-xs mt-1.5 flex items-center gap-1.5">
            <i className="ri-information-line"></i>
            Всички цени са без ДДС
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Търси по каталожен № или име..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="all">Всички категории</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="name">Име (A-Z)</option>
          </select>
        </div>

        {productsLoading ? (
          <div className="text-center py-20">
            <i className="ri-loader-4-line text-3xl text-gray-400 animate-spin"></i>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            {products.length === 0 ? (
              <>
                <i className="ri-price-tag-3-line text-4xl text-gray-300 mb-3"></i>
                <p className="text-gray-500 text-sm">Няма налични продукти</p>
                <p className="text-gray-400 text-xs mt-1">Свържете се с вашия акаунт мениджър за актуален каталог</p>
              </>
            ) : (
              <>
                <i className="ri-inbox-line text-4xl text-gray-300 mb-3"></i>
                <p className="text-gray-500">Няма намерени продукти</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sorted.map(product => (
              <B2BProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-6">
          Показани {sorted.length} от {products.length} продукта
        </div>
      </main>

      <B2BFooter />
    </div>
  );
}

function B2BProductCard({ product }: { product: B2BProduct }) {
  const { calculateB2BPrice, calculateCartonPrice, addCarton } = useB2B();
  const [added, setAdded] = useState(false);
  const isCarton = product.pieces_per_carton > 0;
  const cartonPrice = calculateCartonPrice(product);
  const unitPrice = calculateB2BPrice(product);
  const detailPath = `/b2b/product/${product.slug || product.id}`;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addCarton(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-all group flex flex-col">
      <Link to={detailPath} className="relative bg-gray-50 flex items-center justify-center" style={{ aspectRatio: '1 / 1' }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
        {product.badge && (
          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {product.badge}
          </span>
        )}
        {isCarton && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <i className="ri-archive-line"></i>
            1 кашон = {product.pieces_per_carton} бр.
          </span>
        )}
        {product.in_stock ? (
          <span className="absolute bottom-2 right-2 bg-white/90 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200">
            {product.stock > 0 ? `${Math.floor(product.stock / (product.pieces_per_carton || 1))} каш.` : 'В наличност'}
          </span>
        ) : (
          <span className="absolute bottom-2 right-2 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
            <i className="ri-time-line"></i> За заявка
          </span>
        )}
      </Link>
      <div className="p-3.5 flex flex-col flex-1">
        <Link to={detailPath}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 leading-tight hover:text-emerald-700 transition-colors">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {product.sku && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">№ {product.sku}</span>
          )}
          <span className="text-xs text-gray-500">{product.category}</span>
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-emerald-600 font-bold text-base">€{cartonPrice.toFixed(2)}</span>
            {isCarton && <span className="text-gray-500 text-[10px]">/ кашон</span>}
          </div>
          {isCarton && <span className="text-gray-400 text-[10px]">€{unitPrice.toFixed(2)} / бр.</span>}
        </div>
        <button
          onClick={handleAdd}
          className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          {added ? (
            <><i className="ri-check-line"></i> Добавено!</>
          ) : (
            <><i className="ri-shopping-cart-line"></i> {isCarton ? 'Добави 1 кашон' : 'Добави'}</>
          )}
        </button>
        {!product.in_stock && (
          <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
            <i className="ri-time-line"></i> Доставка 10–20 дни
          </p>
        )}
      </div>
    </div>
  );
}