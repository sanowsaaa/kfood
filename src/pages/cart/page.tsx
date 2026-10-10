import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, DISCOUNT_TIERS, MIN_ORDER_EUR, getNextTier } from '@/contexts/CartContext';
import Header from '../home/components/Header';
import { supabase } from '@/utils/supabase';
import { useSEO } from '@/utils/seo';
import { createActionLock } from '@/utils/admin';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  in_stock: boolean;
  stock?: number;
  slug?: string;
}

const CartPage = () => {
  const {
    cartItems,
    savedItems,
    updateQuantity,
    removeFromCart,
    saveForLater,
    moveToCart,
    removeSaved,
    addToCart,
    getCartCount,
    totalPriceEur,
    discountTier,
    discountAmountEur,
    promoCode,
    promoDiscountAmountEur,
    applyPromoCode,
    removePromoCode,
    finalPriceEur,
    syncCartPrices,
    storageError,
  } = useCart();

  const navigate = useNavigate();
  const [recommended, setRecommended] = useState<Array<Product & { slug?: string }>>([]);
  const [addedRec, setAddedRec] = useState<Set<number>>(new Set());
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const promoLock = useRef(createActionLock());
  const [checking, setChecking] = useState(true);
  const [cartError, setCartError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    setChecking(true); setCartError('');
    void syncCartPrices().catch(err => { if (current) setCartError(err instanceof Error ? err.message : 'Не успяхме да проверим количката.'); })
      .finally(() => { if (current) setChecking(false); });
    return () => { current = false; };
  }, [syncCartPrices, revision]);
  const unavailable = cartItems.some(item => item.in_stock === false || (item.stock != null && item.quantity > item.stock));

  useSEO({
    title: 'Количка | K-FOOD Велико Търново - Корейска Храна Онлайн',
    description: 'Вашата количка с корейски продукти от K-FOOD. Прегледайте избраните продукти, приложете отстъпки и завършете поръчката с бърза доставка в цяла България.',
    keywords: 'количка корейска храна, купи корейски продукти, K-FOOD количка, корейска храна онлайн поръчка',
    canonical: '/cart',
    ogType: 'website',
  });

  const isBelowMinimum = finalPriceEur < MIN_ORDER_EUR;
  const remaining = Math.max(0, MIN_ORDER_EUR - finalPriceEur);
  const nextTier = getNextTier(totalPriceEur);
  const toNextTierEur = nextTier ? Math.max(0, nextTier.minEur - totalPriceEur) : 0;
  const progressToNextTier = nextTier ? Math.min(100, (totalPriceEur / nextTier.minEur) * 100) : 100;

  useEffect(() => {
    let current = true;
    const fetchRecommended = async () => {
      const cartIds = cartItems.map(i => i.id);
      let query = supabase.from('products').select('id, name, price, image, category, rating, in_stock, stock, slug').eq('in_stock', true).gt('stock', 0).limit(6);
      if (cartIds.length > 0) query = query.not('id', 'in', `(${cartIds.join(',')})`);
      const { data, error } = await query.order('rating', { ascending: false });
      if (current) setRecommended(error ? [] : (data || []).slice(0, 4));
    };
    if (cartItems.length > 0) fetchRecommended();
    return () => { current = false; };
  }, [cartItems]);

  const handleAddRecommended = (product: Product) => {
    if (product.category === 'Алкохол') {
      let verified = false;
      try { verified = sessionStorage.getItem('ageVerified') === 'true'; } catch { /* Use the existing product age confirmation. */ }
      if (!verified) { navigate(`/product/${product.slug || product.id}`); return; }
    }
    addToCart(product);
    setAddedRec(prev => new Set(prev).add(product.id));
    setTimeout(() => { setAddedRec(prev => { const n = new Set(prev); n.delete(product.id); return n; }); }, 2000);
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !promoLock.current.acquire()) return;
    setPromoLoading(true);
    setPromoError('');
    const result = await applyPromoCode(promoInput.trim());
    if (result.success) setPromoInput('');
    else setPromoError(result.error || 'Грешка');
    setPromoLoading(false);
    promoLock.current.release();
  };

  if (cartItems.length === 0 && savedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 flex items-center justify-center bg-gray-100 rounded-full">
            <i aria-hidden="true" className="ri-shopping-cart-line text-2xl sm:text-3xl text-gray-400"></i>
          </div>
          <h1 id="main-content" className="text-2xl font-bold text-gray-900 mb-3">Количката е празна</h1>
          <p className="text-gray-500 text-sm mb-6">Добавете продукти за да продължите с поръчката</p>
          <Link to="/products" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors cursor-pointer text-sm">
            <i aria-hidden="true" className="ri-arrow-left-line"></i>
            Разгледай продуктите
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-40 lg:pb-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
          <div>
            <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900">Количка</h1>
            <p className="text-xs sm:text-sm text-gray-500">{getCartCount()} продукта</p>
          </div>
          <Link to="/products" className="text-xs sm:text-sm text-red-600 font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap">
            <i aria-hidden="true" className="ri-arrow-left-line"></i>
            Продължи пазаруването
          </Link>
        </div>
        {checking && cartItems.length > 0 && <p role="status" className="mb-4 rounded-xl bg-white p-4 text-sm text-gray-700">Проверяваме цените и наличностите…</p>}
        {storageError && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{storageError}</p>}
        {(cartError || unavailable) && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{cartError || 'Някои продукти нямат достатъчна наличност. Намалете количеството или ги премахнете.'}</p><button type="button" onClick={() => setRevision(value => value + 1)} disabled={checking} className="mt-2 min-h-11 font-semibold underline">Провери отново</button></div>}

        {/* Discount banners */}
        {cartItems.length > 0 && (
          <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
            {discountTier && (
              <div className="bg-red-600 text-white rounded-xl p-3 sm:p-4 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/20 rounded-full flex-shrink-0">
                  <i aria-hidden="true" className="ri-gift-line text-lg sm:text-xl"></i>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-xs sm:text-sm">Получавате {discountTier.percent}% отстъпка!</p>
                  <p className="text-red-100 text-[10px] sm:text-xs">Спестявате €{discountAmountEur.toFixed(2)} от тази поръчка</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg sm:text-xl font-bold">-{discountTier.percent}%</div>
                </div>
              </div>
            )}

            {promoCode && (() => {
              const wouldHaveTier = DISCOUNT_TIERS.find(t => totalPriceEur >= t.minEur);
              return wouldHaveTier ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 sm:p-3 flex items-start gap-2">
                  <i aria-hidden="true" className="ri-information-line text-amber-600 flex-shrink-0 mt-0.5 text-base sm:text-lg"></i>
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold text-amber-800">Промо кодът замества отстъпката за обем</p>
                    <p className="text-amber-700 text-[10px] sm:text-xs mt-0.5">Имате активен промо код ({promoCode.discountPercent}%), затова отстъпката от {wouldHaveTier.percent}% не се прилага.</p>
                  </div>
                </div>
              ) : null;
            })()}

            {nextTier && !promoCode && (
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <i aria-hidden="true" className="ri-gift-line text-amber-500 text-base sm:text-lg"></i>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">Добавете още €{toNextTierEur.toFixed(2)} за {nextTier.percent}% отстъпка</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-amber-600 whitespace-nowrap">€{totalPriceEur.toFixed(2)} / €{nextTier.minEur}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                  <div className="bg-gradient-to-r from-amber-400 to-red-500 h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: `${progressToNextTier}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Min order warning */}
        {isBelowMinimum && cartItems.length > 0 && (
          <div className="mb-3 sm:mb-4 bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 flex items-start gap-2">
            <i aria-hidden="true" className="ri-error-warning-line text-amber-600 flex-shrink-0 mt-0.5"></i>
            <div className="text-xs sm:text-sm text-amber-800">
              <strong>Минимална поръчка €{MIN_ORDER_EUR.toFixed(2)}</strong>
              <p className="text-amber-700 mt-0.5">Добавете още €{remaining.toFixed(2)} за да продължите с поръчката.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left column */}
          <div className="min-w-0 lg:col-span-2 space-y-2 sm:space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="customer-cart-row bg-white rounded-xl p-2.5 sm:p-3 md:p-4 flex items-center gap-2.5 sm:gap-3 border border-gray-100">
                <Link to={`/product/${item.slug || item.id}`} className="customer-cart-thumb flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain rounded-lg bg-white" />
                </Link>

                <div className="customer-cart-info flex-1 min-w-0">
                  <Link to={`/product/${item.slug || item.id}`}>
                    <h3 className="customer-product-name font-semibold text-gray-900 text-sm md:text-base leading-relaxed">{item.name}</h3>
                  </Link>
                  <div className="mt-0.5 sm:mt-1">
                    <span className="text-red-600 font-bold text-xs sm:text-sm">€{item.price.toFixed(2)}</span>
                    
                  </div>
                  <button onClick={() => saveForLater(item.id)} className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1">
                    <i aria-hidden="true" className="ri-bookmark-line text-[10px]"></i>
                    Запази за по-късно
                  </button>
                </div>

                <div className="customer-cart-controls flex flex-col items-end gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button aria-label={`Намали количеството на ${item.name}`} onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer active:bg-gray-200 transition-colors touch-target-sm">
                      <i aria-hidden="true" className="ri-subtract-line text-xs sm:text-sm"></i>
                    </button>
                    <span className="w-6 sm:w-8 text-center font-bold text-xs sm:text-sm">{item.quantity}</span>
                    <button aria-label={`Увеличи количеството на ${item.name}`} disabled={item.quantity >= Math.min(100, item.stock ?? 100)} onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer active:bg-gray-200 transition-colors touch-target-sm">
                      <i aria-hidden="true" className="ri-add-line text-xs sm:text-sm"></i>
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="customer-product-price font-bold text-gray-900">€{(item.price * item.quantity).toFixed(2)}</div>
                    
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer p-1" aria-label={`Премахни ${item.name}`}>
                    <i aria-hidden="true" className="ri-delete-bin-line text-sm sm:text-base"></i>
                  </button>
                </div>
              </div>
            ))}

            {savedItems.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <h2 className="text-sm sm:text-base font-bold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <i aria-hidden="true" className="ri-bookmark-line text-red-600"></i>
                  Запазени за по-късно ({savedItems.length})
                </h2>
                <div className="space-y-2">
                  {savedItems.map(item => (
                    <div key={item.id} className="customer-cart-row bg-white rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 border border-dashed border-gray-200">
                      <img src={item.image} alt={item.name} className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-lg flex-shrink-0 opacity-70 bg-white" />
                      <div className="customer-cart-info flex-1 min-w-0">
                        <h3 className="customer-product-name text-sm font-semibold text-gray-700">{item.name}</h3>
                        <p className="text-[10px] sm:text-xs text-red-600 font-bold mt-0.5">€{item.price.toFixed(2)}</p>
                      </div>
                      <div className="customer-saved-actions flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => moveToCart(item.id)} className="text-[10px] sm:text-xs bg-red-600 text-white px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold cursor-pointer hover:bg-red-700 transition-colors whitespace-nowrap touch-target-sm">
                          Добави в количката
                        </button>
                        <button onClick={() => removeSaved(item.id)} className="text-[10px] sm:text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer text-center">
                          Премахни
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommended.length > 0 && cartItems.length > 0 && (
              <div className="mt-4 sm:mt-6">
                <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
                  <i aria-hidden="true" className="ri-thumb-up-line text-red-600"></i>
                  Още продукти за вас
                </h2>
                <div className="customer-product-grid grid grid-cols-2 sm:grid-cols-4 gap-3" data-product-shop>
                  {recommended.map(product => (
                    <div key={product.id} className="customer-product-card bg-white rounded-xl overflow-hidden border border-gray-100 group">
                      <Link to={`/product/${product.slug || product.id}`}>
                        <div className="customer-product-image">
                          <img src={product.image} alt={product.name} className="transition-transform duration-300" />
                        </div>
                      </Link>
                      <div className="customer-product-body p-3">
                        <Link to={`/product/${product.slug || product.id}`}>
                          <h3 className="customer-product-name font-semibold text-gray-800 mb-2 group-hover:text-brand-primary transition-colors">{product.name}</h3>
                        </Link>
                        <div className="customer-product-actions flex items-center justify-between gap-2">
                          <div>
                            <div className="customer-product-price font-bold text-brand-hover">€{product.price.toFixed(2)}</div>
                            
                          </div>
                          <button onClick={() => handleAddRecommended(product)} disabled={!product.in_stock} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-90 touch-target-sm ${product.in_stock ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`} aria-label={`Добави ${product.name}`}>
                            {addedRec.has(product.id) ? <i aria-hidden="true" className="ri-check-line text-xs"></i> : <i aria-hidden="true" className="ri-add-line text-xs"></i>}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* One summary and promo form for every screen size. */}
          <div className="min-w-0 lg:col-span-1">
            <div className="customer-cart-summary bg-white rounded-xl p-4 sm:p-5 border border-gray-100 top-24">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Обобщение</h2>
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Продукти ({getCartCount()})</span>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">€{totalPriceEur.toFixed(2)}</div>
                    
                  </div>
                </div>
                {discountTier && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span className="flex items-center gap-1"><i aria-hidden="true" className="ri-gift-line"></i>Отстъпка {discountTier.percent}%</span>
                    <span>-€{discountAmountEur.toFixed(2)}</span>
                  </div>
                )}
                {promoCode && (
                  <div className="flex justify-between text-amber-600 font-semibold">
                    <span className="flex items-center gap-1"><i aria-hidden="true" className="ri-gamepad-line"></i>Промо {promoCode.discountPercent}%</span>
                    <span>-€{promoDiscountAmountEur.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Доставка</span>
                  <span className="font-medium text-gray-700">При получаване</span>
                </div>
                <div className="border-t pt-2 sm:pt-3 flex justify-between font-bold text-sm sm:text-base">
                  <span>Общо</span>
                  <div className="text-right">
                    {(discountTier || promoCode) && <div className="text-xs text-gray-400 line-through font-normal">€{totalPriceEur.toFixed(2)}</div>}
                    <div className="text-red-600">€{finalPriceEur.toFixed(2)}</div>
                    
                  </div>
                </div>
              </div>

              {!promoCode ? (
                <div className="mb-3 sm:mb-4">
                  <label className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 block">
                    <i aria-hidden="true" className="ri-gamepad-line mr-1"></i>Имаш промо код от играта?
                  </label>
                  <div className="flex gap-2">
                    <input type="text" aria-label="Промо код" disabled={promoLoading} value={promoInput} onChange={e => setPromoInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleApplyPromo()} placeholder="KFOOD-10-..." className="flex-1 px-3 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                    <button onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()} className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap touch-target-sm">
                      {promoLoading ? <i aria-hidden="true" className="ri-loader-4-line animate-spin"></i> : 'Приложи'}
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-red-600 mt-1.5">{promoError}</p>}
                </div>
              ) : (
                <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-xl p-2.5 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-red-800"><i aria-hidden="true" className="ri-gamepad-line mr-1"></i>Промо код активен</p>
                      <p className="text-[10px] sm:text-xs text-red-600">{promoCode.code} — {promoCode.discountPercent}% отстъпка</p>
                    </div>
                    <button onClick={removePromoCode} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">Премахни</button>
                  </div>
                </div>
              )}

              {!discountTier && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-amber-50 rounded-xl text-[10px] sm:text-xs text-amber-800 space-y-1">
                  {DISCOUNT_TIERS.slice().reverse().map(t => (
                    <div key={t.minEur} className="flex items-center gap-1.5">
                      <i aria-hidden="true" className="ri-gift-line text-amber-500"></i>
                      <span>Над €{t.minEur} → <strong>{t.percent}% отстъпка</strong></span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => navigate('/checkout')} disabled={isBelowMinimum || cartItems.length === 0 || checking || !!cartError || unavailable} className="hidden lg:flex w-full bg-brand-primary text-white py-3 sm:py-3.5 rounded-xl font-bold hover:bg-brand-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors items-center justify-center gap-2 cursor-pointer whitespace-nowrap touch-target">
                <i aria-hidden="true" className="ri-bank-card-line text-base sm:text-lg"></i>
                Поръчай и плати
              </button>
              <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-gray-400">
                <i aria-hidden="true" className="ri-shield-check-line"></i>
                <span>Сигурно плащане чрез Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Checkout Bar */}
      {cartItems.length > 0 && (
        <div className="customer-mobile-actions lg:hidden fixed left-0 right-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-600">
              Общо ({getCartCount()})
              {discountTier && <span className="ml-1.5 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">-{discountTier.percent}%</span>}
              {promoCode && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">-{promoCode.discountPercent}%</span>}
            </span>
            <div className="text-right">
              {(discountTier || promoCode) && <div className="text-[10px] text-gray-400 line-through">€{totalPriceEur.toFixed(2)}</div>}
              <span className="font-bold text-sm sm:text-base text-gray-900">€{finalPriceEur.toFixed(2)}</span>
              
            </div>
          </div>
          <button onClick={() => navigate('/checkout')} disabled={isBelowMinimum || checking || !!cartError || unavailable} className="w-full min-h-12 bg-brand-primary text-white py-3 sm:py-3.5 rounded-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 touch-target">
            <i aria-hidden="true" className="ri-bank-card-line text-base sm:text-lg"></i> Поръчай и плати
          </button>
          {isBelowMinimum && <p className="text-center text-[10px] sm:text-xs text-amber-600 mt-1.5">Добавете още €{remaining.toFixed(2)} за минималната поръчка (€{MIN_ORDER_EUR})</p>}
        </div>
      )}
    </div>
  );
};

export default CartPage;
