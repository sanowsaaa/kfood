import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { categories, requiresAgeVerification } from '../../mocks/categories';
import { useCart } from '../../contexts/CartContext';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';
import AgeVerification from '../../components/AgeVerification';
import QuickViewModal from '../../components/QuickViewModal';
import { supabase } from '../../utils/supabase';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  stock: number;
  slug?: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Всички');
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Грешка при зареждане на продуктите:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verified = sessionStorage.getItem('ageVerified');
    if (verified === 'true') setIsAgeVerified(true);
  }, []);

  useEffect(() => {
    if (requiresAgeVerification(selectedCategory) && !isAgeVerified) {
      setShowAgeVerification(true);
    }
  }, [selectedCategory, isAgeVerified]);

  useSEO({
    title: 'Корейска Храна Онлайн | Купи Корейски Продукти - K-FOOD Магазин',
    description: 'Купи автентична корейска храна онлайн с доставка до вкъщи. Рамен Samyang, кимчи, токбоки, корейски сосове, снакове и напитки. Над 200 корейски продукта на топ цени.',
    keywords: 'купи корейска храна онлайн, корейски продукти онлайн, рамен Samyang България, кимчи купи, токбоки онлайн',
    canonical: '/products',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Корейска Храна Онлайн', url: '/products' },
        ]),
      ],
    },
  });

  const handleAgeVerified = () => {
    setIsAgeVerified(true);
    setShowAgeVerification(false);
  };

  const handleAgeDenied = () => {
    setShowAgeVerification(false);
    setSelectedCategory('Напитки');
  };

  const filteredProducts = products
    .filter(p => {
      if (!isAgeVerified && p.category === 'Алкохол') return false;
      return selectedCategory === 'Всички' || p.category === selectedCategory;
    })
    .filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock) return;

    addToCart({ id: product.id, name: product.name, price: product.price, image: product.image });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const handleQuickView = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleCategoryClick = (category: string) => {
    if (requiresAgeVerification(category) && !isAgeVerified) {
      setShowAgeVerification(true);
      setSelectedCategory(category);
    } else {
      setSelectedCategory(category);
    }
    setShowFilterDrawer(false);
  };

  const activeFiltersCount = (selectedCategory !== 'Всички' ? 1 : 0) + (sortBy !== 'featured' ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-24 sm:py-32">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Зареждане...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {showAgeVerification && (
        <AgeVerification onVerified={handleAgeVerified} onDenied={handleAgeDenied} />
      )}

      <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />

      {/* Mobile Filter Drawer Overlay */}
      {showFilterDrawer && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowFilterDrawer(false)}
        />
      )}

      {/* Mobile Filter Drawer */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl md:hidden transition-transform duration-300 max-h-[85vh] overflow-y-auto ${showFilterDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Филтри</h3>
            <button onClick={() => setShowFilterDrawer(false)} className="p-2 cursor-pointer touch-target-sm">
              <i className="ri-close-line text-xl text-gray-500"></i>
            </button>
          </div>

          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Категория</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                if (category === 'Алкохол' && !isAgeVerified) return null;
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-colors touch-target-sm ${
                      selectedCategory === category
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Сортиране</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'featured', label: 'Препоръчани' },
                { value: 'price-low', label: 'Цена: ↑' },
                { value: 'price-high', label: 'Цена: ↓' },
                { value: 'rating', label: 'Оценка' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setShowFilterDrawer(false); }}
                  className={`py-3 rounded-xl text-sm font-medium cursor-pointer transition-colors touch-target-sm ${
                    sortBy === opt.value
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setSelectedCategory('Всички'); setSortBy('featured'); setShowFilterDrawer(false); }}
            className="w-full py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 cursor-pointer touch-target"
          >
            Изчисти филтрите
          </button>
        </div>
        <div className="h-4"></div>
      </div>

      {/* Page Header - mobile optimized */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-800 py-6 sm:py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl md:text-5xl font-bold text-white mb-1 sm:mb-2 md:mb-4">Корейска Храна Онлайн</h1>
          <p className="text-sm sm:text-base md:text-xl text-red-50 mb-2 sm:mb-3 md:mb-6">Доставка в цяла България · 1-2 дни</p>
          <div className="hidden md:flex flex-wrap gap-3">
            {['Доставката се заплаща при получаване', 'Бърза доставка 1-2 дни', '100% Оригинални продукти'].map(text => (
              <div key={text} className="bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-full text-white font-semibold flex items-center gap-2 whitespace-nowrap text-sm">
                <i className="ri-check-line"></i>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Search Bar - ultra compact, categories NOT sticky */}
      <div className="sticky top-14 sm:top-16 md:top-20 z-30 bg-white border-b border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Търси продукт..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 sm:py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-gray-50"
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base"></i>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer p-1"
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilterDrawer(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 cursor-pointer relative flex-shrink-0 touch-target-sm"
              aria-label="Филтри"
            >
              <i className="ri-equalizer-line text-lg"></i>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="hidden md:block px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-gray-50 cursor-pointer"
            >
              <option value="featured">Препоръчани</option>
              <option value="price-low">Цена: ↑</option>
              <option value="price-high">Цена: ↓</option>
              <option value="rating">Най-оценени</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Chips - horizontal scroll on mobile (NOT sticky), wraps on desktop */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-2.5 sm:py-3 scrollbar-hide flex-nowrap md:flex-wrap">
            {categories.map(category => {
              if (category === 'Алкохол' && !isAgeVerified) return null;
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all active:scale-95 touch-target-sm ${
                    selectedCategory === category
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="bg-red-50 border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <p className="text-xs sm:text-sm text-red-700 font-medium text-center">
            <i className="ri-percent-line mr-1"></i>
            Намаление 5% за поръчки над 50€ · 10% над 100€
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-sm text-gray-600">
            <strong className="text-red-600">{filteredProducts.length}</strong> продукта
            {selectedCategory !== 'Всички' && <span className="text-gray-400"> в {selectedCategory}</span>}
          </p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-red-600 font-medium cursor-pointer">
              Изчисти търсенето
            </button>
          )}
        </div>

        {/* Alcohol Warning */}
        {selectedCategory === 'Алкохол' && isAgeVerified && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <i className="ri-information-line text-amber-600 flex-shrink-0 mt-0.5"></i>
            <p className="text-amber-800 text-sm">При доставка куриерът ще изиска лична карта за проверка на възрастта.</p>
          </div>
        )}

        {/* Products Grid - optimized for mobile */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <i className="ri-search-line text-4xl sm:text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-500 font-medium text-sm sm:text-base">Няма намерени продукти</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('Всички'); }} className="mt-3 text-red-600 text-sm font-medium cursor-pointer">
              Виж всички продукти
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6" data-product-shop>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 group"
              >
                <div className="relative overflow-hidden bg-white flex items-center justify-center cursor-pointer" style={{ aspectRatio: '3 / 4' }} onClick={(e) => handleQuickView(e, product)}>
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.badge && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                        {product.badge}
                      </div>
                    )}
                    {!product.in_stock && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                          Изчерпан
                        </span>
                      </div>
                    )}
                    {product.in_stock && product.stock > 0 && product.stock < 10 && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap flex items-center gap-1">
                        <i className="ri-fire-fill text-[8px]"></i> Само {product.stock}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 hidden sm:flex">
                      <span className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                        <i className="ri-eye-line"></i> Бърз преглед
                      </span>
                    </div>
                  </div>

                <div className="p-2.5 sm:p-3 md:p-5">
                  <div className="flex items-center gap-1 mb-1">
                    <i className="ri-star-fill text-amber-400 text-[10px] sm:text-xs"></i>
                    <span className="text-[10px] sm:text-xs text-gray-500">{product.rating} ({product.reviews})</span>
                  </div>

                  <Link to={`/product/${product.slug || product.id}`}>
                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors" style={{ minHeight: '2.2rem' }}>
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm sm:text-base md:text-lg font-bold text-red-700">
                        €{product.price.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={!product.in_stock}
                      className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-90 touch-target-sm ${
                        product.in_stock
                          ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-sm'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                      aria-label="Добави в количката"
                    >
                      {addedId === product.id ? (
                        <i className="ri-check-line text-sm sm:text-base"></i>
                      ) : (
                        <i className="ri-shopping-cart-line text-sm sm:text-base"></i>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}