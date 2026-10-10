import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useCart } from '../../contexts/CartContext';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';
import { loadProducts } from '../../utils/catalog';
import { useCustomerRead } from '../../hooks/useCustomerRead';
import AgeVerification from '../../components/AgeVerification';
import CustomerReadError from '../../components/CustomerReadError';

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

const categoryData = [
  { slug: 'non-food', name: 'Нехранителни стоки', description: 'Кухненски принадлежности и аксесоари за корейска кухня', dbCategory: 'Нехранителни стоки' },
  {
    slug: 'cosmetics', name: 'Корейска козметика',
    description: 'K-beauty продукти — грижа за кожата, маски, серуми и корейски козметични иновации с доставка в България',
    seoTitle: 'Корейска Козметика Онлайн | K-Beauty Продукти с Доставка - K-FOOD',
    seoDescription: 'Купете корейска козметика онлайн с доставка в България. K-beauty продукти за грижа за кожата — sheet masks, серуми, кремове, BB кремове и anti-aging продукти от Корея. 100% оригинални.',
    seoKeywords: 'корейска козметика онлайн, k-beauty продукти, корейска грижа за кожа, корейски серуми, sheet masks, bb cream корейски, корейска козметика България',
    dbCategory: 'Корейска козметика',
    isNew: true
  },
  {
    slug: 'noodles', name: 'Нудъли и Рамен',
    description: 'Автентични корейски нудъли и рамен за бързо и вкусно ястие',
    seoTitle: 'Корейски Нудъли Онлайн | Купи Нудъли с Доставка - K-FOOD',
    seoDescription: 'Купете автентични корейски нудъли онлайн с доставка в България. Широк избор от корейски нудъли — стъклени, оризови, пшенични. Samyang, Nongshim и още марки.',
    seoKeywords: 'корейски нудъли онлайн, купи нудъли, стъклени нудъли, оризови нудъли, корейска юфка, Samyang нудъли',
    dbCategory: 'Нудъли и Рамен'
  },
  {
    slug: 'cooking', name: 'Продукти за готвене',
    description: 'Оризи, брашна, сосове и всичко необходимо за корейска кухня',
    seoTitle: 'Корейски Продукти за Готвене | Ориз, Брашна - K-FOOD',
    seoDescription: 'Купете корейски продукти за готвене онлайн с доставка в България. Корейски ориз, оризово брашно, нори, сусам и всичко необходимо за автентична корейска кухня.',
    seoKeywords: 'корейски продукти за готвене, корейски ориз, оризово брашно, нори, сусам, корейска кухня продукти',
    dbCategory: 'Продукти за готвене'
  },
  {
    slug: 'desserts', name: 'Десерти',
    description: 'Популярни корейски сладкиши, бисквити и десерти',
    seoTitle: 'Корейски Десерти Онлайн | Купи Корейски Сладкиши - K-FOOD',
    seoDescription: 'Поръчайте популярни корейски десерти онлайн с доставка в България. Корейски бисквити, оризови крекери, Choco Pie и още.',
    seoKeywords: 'корейски десерти онлайн, корейски сладкиши, Choco Pie, корейски бисквити, оризови крекери',
    dbCategory: 'Десерти'
  },
  {
    slug: 'sauces', name: 'Сосове и Масла',
    description: 'Оригинални корейски сосове и масла за автентичен вкус',
    seoTitle: 'Корейски Сосове Онлайн | Гочуджанг, Доенджанг, Самджанг - K-FOOD',
    seoDescription: 'Купете автентични корейски сосове онлайн с доставка в България. Гочуджанг, доенджанг, самджанг, корейски соев сос и сусамово масло.',
    seoKeywords: 'корейски сосове онлайн, гочуджанг купи, доенджанг България, самджанг сос, корейски соев сос, сусамово масло',
    dbCategory: 'Сосове и Масла'
  },
  {
    slug: 'frozen', name: 'Замразени продукти',
    description: 'Манду, кнедли и други замразени корейски специалитети',
    seoTitle: 'Корейски Замразени Продукти | Манду, Токбоки - K-FOOD',
    seoDescription: 'Поръчайте корейски замразени продукти онлайн с доставка в България. Манду, токбоки, корейски замразени деликатеси.',
    seoKeywords: 'корейски замразени продукти, манду купи, токбоки онлайн, корейски кнедли, оризови кейкове',
    dbCategory: 'Замразени продукти'
  },
  {
    slug: 'drinks', name: 'Напитки',
    description: 'Освежаващи корейски напитки, сокове и традиционни чайове',
    seoTitle: 'Корейски Напитки Онлайн | Корейски Чай, Сокове - K-FOOD',
    seoDescription: 'Купете корейски напитки онлайн с доставка в България. Корейски ечемичен чай, сикхе, корейски плодови сокове и традиционни напитки.',
    seoKeywords: 'корейски напитки онлайн, корейски чай, ечемичен чай, сикхе, корейски сокове, традиционни корейски напитки',
    dbCategory: 'Напитки'
  },
  {
    slug: 'snacks', name: 'Снакс и Чай',
    description: 'Чипсове, чайове и леки закуски за всеки момент',
    seoTitle: 'Корейски Чай и Снакс Онлайн | Купи с Доставка - K-FOOD',
    seoDescription: 'Поръчайте корейски чай и снакове онлайн с доставка в България. Корейски зелен чай, ечемичен чай, корейски чипс и леки закуски.',
    seoKeywords: 'корейски чай онлайн, корейски снакс, зелен чай корейски, ечемичен чай, корейски чипс, леки закуски корейски',
    dbCategory: 'Снакс и Чай'
  },
  {
    slug: 'alcohol', name: 'Алкохол',
    description: 'Корейско соджу с различни вкусове - само за лица над 18 години',
    seoTitle: 'Корейско Соджу Онлайн | Купи Соджу с Доставка - K-FOOD',
    seoDescription: 'Купете автентично корейско соджу онлайн с доставка в България. Jinro, Chum Churum и други марки соджу. Само за лица над 18 години.',
    seoKeywords: 'корейско соджу онлайн, купи соджу, Jinro соджу, Chum Churum, корейски алкохол, соджу доставка България',
    dbCategory: 'Алкохол'
  }
];

export default function Category() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [sortBy, setSortBy] = useState('featured');
  const [addedProducts, setAddedProducts] = useState<Set<number>>(new Set());
  const { data: products, loading, error: readError, retry } = useCustomerRead<Product[]>(loadProducts, []);

  const [ageVerified, setAgeVerified] = useState(() => { try { return sessionStorage.getItem('ageVerified') === 'true'; } catch { return false; } });
  const [ageDenied, setAgeDenied] = useState(false);

  const currentCategory = categoryData.find(cat => cat.slug === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useSEO({
    title: currentCategory?.seoTitle ?? (currentCategory ? `${currentCategory.name} - K-FOOD Велико Търново | Корейски Продукти` : 'Категория - K-FOOD'),
    description: currentCategory?.seoDescription ?? (currentCategory ? `${currentCategory.description}. Разгледайте нашата селекция от ${currentCategory.name.toLowerCase()} в K-FOOD Велико Търново.` : 'Категория корейски продукти'),
    keywords: currentCategory?.seoKeywords ?? (currentCategory ? `${currentCategory.name}, корейски продукти, K-FOOD` : 'корейски продукти'),
    canonical: `/category/${id}`,
    robots: !currentCategory ? 'noindex, follow' : undefined,
    ogType: 'website',
    schema: currentCategory ? {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Категории', url: '/categories' },
          { name: currentCategory.name, url: `/category/${id}` }
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: currentCategory.seoTitle ?? currentCategory.name,
          description: currentCategory.seoDescription ?? currentCategory.description,
          url: `https://k-foodvelikotarnovo.com/category/${id}`,
          provider: {
            '@type': 'Organization',
            name: 'K-FOOD Велико Търново',
            url: 'https://k-foodvelikotarnovo.com'
          }
        }
      ]
    } : undefined
  });

  const filteredProducts = products.filter(product =>
    product.category === currentCategory?.dbCategory
  ).sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'name': return a.name.localeCompare(b.name);
      default: return b.rating - a.rating;
    }
  });

  const handleAddToCart = (product: Product) => {
    if (!product.in_stock) return;
    addToCart({ ...product });
    setAddedProducts(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedProducts(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }, 2000);
  };

  if (readError) return <div className="customer-page min-h-screen bg-gray-50"><Header /><main id="main-content" className="px-4 py-8"><CustomerReadError message={readError} onRetry={retry} /></main><Footer /></div>;

  if (ageDenied) return <Navigate to="/categories" replace />;
  if (currentCategory?.dbCategory === 'Алкохол' && !ageVerified) return <><Header /><AgeVerification onVerified={() => setAgeVerified(true)} onDenied={() => setAgeDenied(true)} /><Footer /></>;

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium text-sm">Зареждане на продуктите...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!currentCategory) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 id="main-content" tabIndex={-1} className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">Категорията не е намерена</h1>
            <Link to="/products" className="text-brand-primary hover:text-brand-hover font-semibold whitespace-nowrap text-sm">
              Виж всички продукти
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      {/* Category Hero - MOBILE OPTIMIZED: smaller padding, smaller text */}
      <section className="bg-gradient-to-r from-brand-primary to-brand-hover text-white py-10 sm:py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 id="main-content" tabIndex={-1} className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-4">{currentCategory.name}</h1>
            <p className="text-sm sm:text-base md:text-xl text-brand-petal max-w-2xl mx-auto">
              {currentCategory.description}
            </p>
            <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-brand-petal text-xs sm:text-sm">
              <Link to="/" className="hover:text-white transition-colors cursor-pointer">Начало</Link>
              <i aria-hidden="true" className="ri-arrow-right-s-line"></i>
              <span>{currentCategory.name}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-8 sm:py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters Bar - mobile optimized */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700 font-semibold">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'продукт' : 'продукта'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 font-medium whitespace-nowrap">Сортирай:</label>
                <select
                  aria-label="Сортиране на продуктите"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="min-w-0 flex-1 sm:flex-none px-3 sm:px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent cursor-pointer text-sm"
                >
                  <option value="featured">Препоръчани</option>
                  <option value="price-low">Цена: Ниска → Висока</option>
                  <option value="price-high">Цена: Висока → Ниска</option>
                  <option value="name">Име: А-Я</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid - mobile: 2 cols, better gaps */}
          {filteredProducts.length > 0 ? (
            <div className="customer-product-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6" data-product-shop>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="customer-product-card bg-white rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  <Link to={`/product/${product.slug || product.id}`} className="customer-product-image cursor-pointer">
                    <img
                        loading="lazy"
                        decoding="async"
                      src={product.image}
                      alt={product.name}
                      className="transition-transform duration-300"
                    />
                    {product.badge && (
                      <span className="customer-product-badge absolute top-2 sm:top-3 left-2 sm:left-3 bg-brand-primary text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold">
                        {product.badge}
                      </span>
                    )}
                    {!product.in_stock && (
                      <div className="customer-product-unavailable absolute inset-0 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                          Изчерпан
                        </span>
                      </div>
                    )}
                  </Link>

                  <div className="customer-product-body p-3 sm:p-4 md:p-5">
                    <Link to={`/product/${product.slug || product.id}`} className="cursor-pointer">
                      <h3 className="customer-product-name font-bold text-gray-900 mb-2 group-hover:text-brand-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-center gap-2 mb-2 sm:mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <i aria-hidden="true"
                            key={i}
                            className={`${i < Math.floor(product.rating) ? 'ri-star-fill text-yellow-400' : 'ri-star-line text-gray-300'} text-xs sm:text-sm`}
                          ></i>
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">({product.reviews})</span>
                    </div>

                    <div className="customer-product-actions flex items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-col">
                          <span className="customer-product-price font-bold text-brand-primary">
                            €{product.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        aria-label={`Добави ${product.name}`}
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.in_stock}
                        className={`${product.in_stock ? 'bg-brand-primary hover:bg-brand-hover text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap touch-target-sm`}
                      >
                        {addedProducts.has(product.id) ? (
                          <i aria-hidden="true" className="ri-check-line text-base sm:text-xl"></i>
                        ) : (
                          <i aria-hidden="true" className="ri-shopping-cart-line text-base sm:text-xl"></i>
                        )}
                      </button>
                    </div>

                    {product.in_stock && product.stock < 20 && (
                      <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-orange-600 font-medium">
                        <i aria-hidden="true" className="ri-error-warning-line mr-1"></i>
                        Остават само {product.stock} бр.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <i aria-hidden="true" className="ri-inbox-line text-4xl sm:text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">Няма продукти в тази категория</h3>
              <p className="text-gray-600 text-sm mb-6">Опитайте да разгледате други категории</p>
              <Link
                to="/products"
                className="inline-block bg-brand-primary text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold hover:bg-brand-hover transition-colors whitespace-nowrap cursor-pointer text-sm"
              >
                Виж всички продукти
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SEO текст блок - mobile optimized */}
      {currentCategory && (
        <section className="bg-white border-t border-gray-100 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                {currentCategory.name} — K-FOOD Онлайн Магазин
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3">
                {currentCategory.seoDescription}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                K-FOOD е специализиран <strong>онлайн магазин за корейска храна</strong> с доставка в цяла България.
                Всички продукти са 100% оригинални и внесени директно от Южна Корея.
                Поръчайте онлайн и получете <strong>корейска храна с доставка до вкъщи</strong>.
              </p>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
