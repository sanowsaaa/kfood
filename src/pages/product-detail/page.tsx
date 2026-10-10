import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useCart } from '../../contexts/CartContext';
import { useSEO, getProductSchema, getBreadcrumbSchema } from '../../utils/seo';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { supabase } from '../../utils/supabase';
import { trackViewContent } from '../../utils/metaPixel';
import { PUBLIC_PRODUCT_FIELDS } from '../../utils/catalog';
import { productAvailable } from '../../utils/customer';
import { useCustomerRead } from '../../hooks/useCustomerRead';
import CustomerReadError from '../../components/CustomerReadError';
import AgeVerification from '../../components/AgeVerification';

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
  weight?: string;
  volume?: string;
  slug?: string;
}

export default function ProductDetail() {
  const { id: slugOrId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const [ageVerified, setAgeVerified] = useState(() => { try { return sessionStorage.getItem('ageVerified') === 'true'; } catch { return false; } });
  const tracked = useRef<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showNotification, setShowNotification] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slugOrId]);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!slugOrId || slugOrId === ':id') return { product: null, related: [] };
    const numeric = /^\d+$/.test(slugOrId) && Number.isSafeInteger(Number(slugOrId));
    const result = await supabase.from('products').select(PUBLIC_PRODUCT_FIELDS)
      .eq(numeric ? 'id' : 'slug', numeric ? Number(slugOrId) : slugOrId).abortSignal(signal).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return { product: null, related: [] };
    const raw = result.data as unknown as Product;
    const found = { ...raw, in_stock: productAvailable(raw) };
    const related = await supabase.from('products').select(PUBLIC_PRODUCT_FIELDS)
      .eq('category', found.category).neq('id', found.id).limit(4).abortSignal(signal);
    const relatedProducts = related.error ? [] : (related.data || []) as unknown as Product[];
    return { product: found, related: relatedProducts.map(item => ({ ...item, in_stock: productAvailable(item) })) };
  }, [slugOrId]);
  const { data: result, loading, error: readError, retry } = useCustomerRead<{ product: Product | null; related: Product[] }>(load, { product: null, related: [] });
  const product = result.product;
  const relatedProducts = result.related;
  useEffect(() => {
    setQuantity(1); setAddedToCart(false); setShowNotification(false);
  }, [slugOrId]);
  useEffect(() => {
    if (loading || readError || !product) return;
    if (product.slug && /^\d+$/.test(slugOrId || '')) navigate(`/product/${product.slug}`, { replace: true });
    if (tracked.current === product.id) return;
    tracked.current = product.id;
    trackViewContent({ content_ids: [String(product.id)], content_name: product.name,
      content_category: product.category, value: product.price, currency: 'EUR' });
    addToRecentlyViewed({ ...product });
  }, [product, loading, readError, slugOrId, navigate, addToRecentlyViewed]);

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';
  const productUrl = product
    ? `${siteUrl}/product/${product.slug || product.id}`
    : `${siteUrl}/product/${slugOrId}`;

  useSEO({
    title: product
      ? `${product.name} | Купи Онлайн - K-FOOD Велико Търново`
      : 'Продукт - K-FOOD',
    description: product
      ? `${product.name}. ${product.description ? `${product.description.slice(0, 100)} ` : ''}Цена: €${product.price.toFixed(2)}. ${product.in_stock ? 'В наличност. Доставка в България.' : 'Временно изчерпан.'}`
      : 'Детайли за корейски продукт от K-FOOD',
    keywords: product
      ? `${product.name}, купи ${product.name}, ${product.category} онлайн, корейски продукти, K-FOOD`
      : 'корейски продукти онлайн',
    canonical: productUrl,
    robots: !loading && !readError && !product ? 'noindex, follow' : undefined,
    ogType: 'product',
    ogImage: product?.image,
    schema: product
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            getProductSchema({
              name: product.name,
              description: product.description,
              price: product.price,
              image: product.image,
              inStock: product.in_stock,
              rating: product.rating,
              reviews: product.reviews,
              productId: product.id,
              slug: product.slug,
            }),
            getBreadcrumbSchema([
              { name: 'Начало', url: '/' },
              { name: 'Продукти', url: '/products' },
              { name: product.name, url: productUrl },
            ]),
          ],
        }
      : undefined,
  });

  const handleAddToCart = () => {
    if (!product || !product.in_stock) return;
    if (quantity > product.stock) return;

    addToCart(
      { ...product },
      quantity
    );

    setAddedToCart(true);
    setShowNotification(true);
    setTimeout(() => {
      setAddedToCart(false);
      setShowNotification(false);
    }, 2500);
  };

  const handleBuyNow = () => {
    if (!product || !product.in_stock) return;
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (readError) return <div className="min-h-screen bg-gray-50"><Header /><CustomerReadError message={readError} onRetry={retry} /><Footer /></div>;

  if (!product) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 id="main-content" tabIndex={-1} className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Продуктът не е намерен</h1>
            <Link to="/products" className="text-brand-primary font-semibold text-sm">← Виж всички продукти</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (product.category === 'Алкохол' && !ageVerified) return <><Header />
    <AgeVerification onVerified={() => setAgeVerified(true)} onDenied={() => navigate('/products', { replace: true })} /><Footer /></>;

  const maxQuantity = product.in_stock ? Math.min(product.stock, 99) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Toast notification */}
      {showNotification && (
        <div
          className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-primary text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-xl whitespace-nowrap"
          style={{
            animation: 'slideUpFade 0.3s ease-out, slideDownFade 0.3s ease-in 2.2s forwards',
          }}
        >
          <i aria-hidden="true" className="ri-checkbox-circle-fill text-lg"></i>
          Добавено в количката!
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 flex-wrap">
            <Link to="/" className="hover:text-brand-primary transition-colors">Начало</Link>
            <i aria-hidden="true" className="ri-arrow-right-s-line text-gray-300"></i>
            <Link to="/products" className="hover:text-brand-primary transition-colors">Продукти</Link>
            <i aria-hidden="true" className="ri-arrow-right-s-line text-gray-300"></i>
            <span className="customer-product-name text-gray-800 font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 md:py-10 pb-32 sm:pb-40 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-12">

          {/* Product Image - smaller on mobile */}
          <div className="relative group">
            <div className="customer-product-image customer-detail-image bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100">
              {!product.in_stock && (
                <div className="customer-product-unavailable absolute inset-0 flex items-center justify-center z-10">
                  <span className="bg-white text-gray-900 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-base sm:text-lg whitespace-nowrap">
                    Изчерпан
                  </span>
                </div>
              )}
              <img
                src={product.image}
                alt={product.name}
                className="transition-transform duration-300"
              />
            </div>
          </div>

          {/* Product Info - compact on mobile */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {product.badge && (
              <span className="inline-block bg-brand-primary text-white px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold">
                <i aria-hidden="true" className="ri-fire-fill mr-1"></i>{product.badge}
              </span>
            )}

            <h1 id="main-content" tabIndex={-1} className="customer-product-name text-[22px] sm:text-2xl md:text-4xl font-bold text-gray-900 leading-tight">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <i aria-hidden="true" key={i} className={`${i < Math.floor(product.rating) ? 'ri-star-fill' : 'ri-star-line'} text-amber-400 text-sm sm:text-base md:text-lg`}></i>
                ))}
              </div>
              <span className="text-xs sm:text-sm text-gray-500">{product.rating} ({product.reviews} отзива)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-primary">
                €{(product.price).toFixed(2)}
              </span>
            </div>

            {/* Stock & Social proof */}
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              {product.in_stock ? (
                <>
                  <div className="flex items-center gap-2 text-brand-primary">
                    <i aria-hidden="true" className="ri-checkbox-circle-fill text-lg sm:text-xl"></i>
                    <span className="font-semibold text-sm sm:text-base">В наличност ({product.stock} бр.)</span>
                  </div>
                  {product.stock <= 10 && product.stock > 0 && (
                    <span className="text-xs sm:text-sm text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <i aria-hidden="true" className="ri-fire-fill"></i> Само {product.stock} остават!
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                    <i aria-hidden="true" className="ri-eye-line"></i> {Math.floor(Math.random() * 9) + 3} души разглеждат
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2 text-brand-primary">
                  <i aria-hidden="true" className="ri-close-circle-fill text-lg sm:text-xl"></i>
                  <span className="font-semibold text-sm sm:text-base">Изчерпан</span>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{product.description}</p>

            {/* Details */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 text-xs sm:text-sm">
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Категория</span>
                  <span>{product.category}</span>
                </div>
                {product.weight && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Тегло</span>
                    <span>{product.weight}</span>
                  </div>
                )}
                {product.volume && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Обем</span>
                    <span>{product.volume}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Произход</span>
                  <span>Южна Корея</span>
                </div>
              </div>
            </div>

            {/* Quantity - desktop only */}
            {product.in_stock && (
              <div className="hidden md:flex items-center gap-4">
                <span className="font-semibold text-gray-900">Количество:</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    aria-label="Намали количество" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer touch-target-sm"
                  >
                    <i aria-hidden="true" className="ri-subtract-line text-lg"></i>
                  </button>
                  <span className="w-14 text-center font-bold text-lg">{quantity}</span>
                  <button
                    aria-label="Увеличи количество" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                    disabled={quantity >= maxQuantity}
                    className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer touch-target-sm"
                  >
                    <i aria-hidden="true" className="ri-add-line text-lg"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-4">
              <button
                aria-label="Добави в количката"
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className={`flex-1 py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 whitespace-nowrap touch-target ${
                  product.in_stock
                    ? 'bg-brand-primary text-white hover:bg-brand-hover cursor-pointer active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {addedToCart ? <i aria-hidden="true" className="ri-check-line text-xl"></i> : <i aria-hidden="true" className="ri-shopping-cart-line text-xl"></i>}
                {addedToCart ? 'Добавено!' : product.in_stock ? 'Добави в количката' : 'Изчерпан'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!product.in_stock}
                className={`flex-1 py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 whitespace-nowrap touch-target ${
                  product.in_stock
                    ? 'bg-orange-700 text-white hover:bg-orange-800 cursor-pointer active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <i aria-hidden="true" className="ri-flashlight-fill text-xl"></i>
                Купи сега
              </button>
            </div>

            {/* Trust badges - show compact version on mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-3">
              {[
                { icon: 'ri-shield-check-line', text: '100% Оригинален' },
                { icon: 'ri-truck-line', text: 'Бърза доставка' },
                { icon: 'ri-customer-service-2-line', text: 'Поддръжка 24/7' },
              ].map(b => (
                <div key={b.text} className="text-center p-2 sm:p-3 bg-white rounded-xl border border-gray-100">
                  <i aria-hidden="true" className={`${b.icon} text-lg sm:text-2xl text-brand-primary mb-1 block`}></i>
                  <p className="text-[10px] sm:text-xs text-gray-600 font-medium">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-10 md:mt-20">
            <h2 className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-5 md:mb-8">Подобни продукти</h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible md:pb-0 scrollbar-hide" data-product-shop>
              {relatedProducts.map(rp => (
                <Link
                  key={rp.id}
                  to={`/product/${rp.slug || rp.id}`}
                  className="customer-product-card flex-shrink-0 w-44 sm:w-48 md:w-auto bg-white rounded-xl overflow-hidden border border-gray-100 group active:scale-95 transition-transform snap-start"
                >
                  <div className="customer-product-image">
                    <img
                      src={rp.image}
                      alt={rp.name}
                      loading="lazy"
                      className="transition-transform duration-300"
                    />
                    {!rp.in_stock && (
                      <div className="customer-product-unavailable absolute inset-0 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold">Изчерпан</span>
                      </div>
                    )}
                  </div>
                  <div className="customer-product-body p-3">
                    <h3 className="customer-product-name font-bold text-gray-900 mb-2 group-hover:text-brand-primary transition-colors">{rp.name}</h3>
                    <span className="customer-product-actions customer-product-price font-bold text-brand-primary">€{(rp.price).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Mobile Sticky Buy Bar - improved spacing and touch targets */}
      {product.in_stock && (
        <div
          className="customer-mobile-actions md:hidden fixed left-0 right-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quantity */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
              <button
                aria-label="Намали количество" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gray-50 disabled:opacity-40 cursor-pointer active:bg-gray-100 touch-target-sm"
              >
                <i aria-hidden="true" className="ri-subtract-line text-sm sm:text-base"></i>
              </button>
              <span className="w-8 sm:w-10 text-center font-bold text-sm sm:text-base">{quantity}</span>
              <button
                aria-label="Увеличи количество" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gray-50 disabled:opacity-40 cursor-pointer active:bg-gray-100 touch-target-sm"
              >
                <i aria-hidden="true" className="ri-add-line text-sm sm:text-base"></i>
              </button>
            </div>

            {/* Add to cart */}
            <button
              aria-label="Добави в количката"
              onClick={handleAddToCart}
              className="min-w-0 flex-1 min-h-12 py-2.5 sm:py-3 bg-brand-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform whitespace-nowrap touch-target"
            >
              {addedToCart ? (
                <><i aria-hidden="true" className="ri-check-line text-sm"></i> Добавено!</>
              ) : (
                <><i aria-hidden="true" className="ri-shopping-cart-line text-sm"></i> Добави</>
              )}
            </button>

            {/* Buy now */}
            <button
              onClick={handleBuyNow}
              className="min-w-0 flex-1 min-h-12 py-2.5 sm:py-3 bg-orange-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform whitespace-nowrap touch-target"
            >
              <i aria-hidden="true" className="ri-flashlight-fill text-sm"></i>
              Купи сега
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
