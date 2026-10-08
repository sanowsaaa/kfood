import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from '../home/components/Header';
import { useCart, MIN_ORDER_EUR } from '../../contexts/CartContext';
import { supabase } from '../../utils/supabase';
import { useSEO } from '../../utils/seo';
import { trackInitiateCheckout } from '../../utils/metaPixel';
import { cartSignature, getCheckoutAttempt } from '../../utils/checkoutAttempt';
import { checkoutRedirect, discountedMinor, emailValid, phoneValid, subtotalMinor, validateCartForCheckout, type StoredCartItem } from '../../utils/customer';
import { createActionLock } from '../../utils/admin';

export default function Checkout() {
  const { items, totalPriceEur, discountTier, discountAmountEur, promoCode, promoDiscountAmountEur, finalPriceEur, syncCartPrices, removePromoCode } = useCart();
  const initiated = useRef(false);
  const submission = useRef(createActionLock());
  const [checkingCart, setCheckingCart] = useState(true);
  const [cartError, setCartError] = useState('');
  const [revision, setRevision] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useSEO({
    title: 'Завършване на Поръчка | K-FOOD Велико Търново - Корейска Храна',
    description: 'Завършете поръчката си от K-FOOD. Сигурно плащане с карта чрез Stripe. Доставка на корейска храна в цяла България.',
    keywords: 'завършване поръчка, плащане корейска храна, Stripe плащане, K-FOOD поръчка, корейски продукти доставка',
    canonical: '/checkout',
    ogType: 'website',
  });

  useEffect(() => {
    let current = true;
    setCheckingCart(true); setCartError('');
    void syncCartPrices().then(fresh => { validateCartForCheckout(fresh); }).catch(err => {
      if (current) setCartError(err instanceof Error ? err.message : 'Не успяхме да проверим количката.');
    }).finally(() => { if (current) setCheckingCart(false); });
    // Meta Pixel: InitiateCheckout
    if (items.length > 0 && !initiated.current) {
      initiated.current = true;
      trackInitiateCheckout({
        content_ids: items.map(i => String(i.id)),
        value: finalPriceEur,
        currency: 'EUR',
        num_items: items.reduce((s, i) => s + i.quantity, 0),
      });
    }
    return () => { current = false; };
  }, [syncCartPrices, revision]); // Existing analytics event remains an estimate, not payment confirmation.

  const isBelowMinimum = finalPriceEur < MIN_ORDER_EUR;
  const remaining = Math.max(0, MIN_ORDER_EUR - finalPriceEur);

  const callCreateCheckout = async (customerEmail: string, customerPhone: string, fresh: StoredCartItem[]) => {
    const subtotal = subtotalMinor(fresh);
    const percent = subtotal >= 10000 ? 10 : subtotal >= 5000 ? 5 : 0;
    const body = {
      items: fresh.map(item => ({ id: item.id, quantity: item.quantity })).sort((a, b) => a.id - b.id),
      promoCode: promoCode?.code || null,
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.replace(/\s/g, ''),
      expectedTotalMinor: discountedMinor(subtotal, percent),
    };
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
    const fingerprint = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    let attempt;
    try { attempt = getCheckoutAttempt(fingerprint, sessionStorage); }
    catch { throw new Error('Браузърът не може да запази потвърждението на поръчката. Разрешете съхранението за сайта или използвайте друг браузър.'); }
    const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
      body: { ...body, attemptId: attempt.id, statusToken: attempt.token }, timeout: 20000,
    });
    if (fnError) {
      let message = 'Временен проблем с плащането. Опитайте отново със същата поръчка.';
      if (fnError.context instanceof Response) {
        try { message = (await fnError.context.json()).error || message; } catch { /* use fallback text */ }
      }
      throw new Error(message);
    }
    const redirect = checkoutRedirect(data);
    try {
      sessionStorage.setItem(`order-proof:${redirect.orderNumber}`, attempt.token);
      sessionStorage.setItem(`order-cart:${redirect.orderNumber}`, cartSignature(fresh));
    } catch { throw new Error('Линкът за плащане е получен, но браузърът не запази потвърждението. Разрешете съхранението и опитайте със същата количка.'); }
    return redirect;
  };

  const handlePayNow = async () => {
    if (isBelowMinimum || checkingCart || cartError || promoCode || !submission.current.acquire()) return;
    setEmailError(''); setPhoneError(''); setError('');

    const validEmail = emailValid(email);
    const validPhone = phoneValid(phone);

    if (!validEmail) setEmailError('Моля, въведете валиден имейл адрес');
    if (!validPhone) setPhoneError('Моля, въведете валиден български телефон');
    if (!validEmail || !validPhone) {
      submission.current.release();
      document.getElementById(!validEmail ? 'checkout-email' : 'checkout-phone')?.focus();
      return;
    }

    setIsProcessing(true);
    try {
      const fresh = await syncCartPrices();
      validateCartForCheckout(fresh);
      const subtotal = subtotalMinor(fresh);
      const percent = subtotal >= 10000 ? 10 : subtotal >= 5000 ? 5 : 0;
      if (discountedMinor(subtotal, percent) < MIN_ORDER_EUR * 100) throw new Error('Минималната сума за поръчка не е достигната.');
      if (subtotal !== subtotalMinor(items)) throw new Error('Цените са обновени. Прегледайте новата сума преди да продължите.');
      const data = await callCreateCheckout(email, phone, fresh);
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error('Не получихме линк за плащане');
    } catch (err: any) {
      setError(err.message || 'Грешка при плащането. Моля, опитайте отново.');
    } finally {
      setIsProcessing(false);
      submission.current.release();
    }
  };

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="customer-page min-h-screen bg-gray-50">
      <Header />

      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-40 lg:pb-10">
        <Link to="/cart" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-red-700">← Обратно към количката</Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Завършване на поръчка</h1>
        <p className="mb-5 text-sm leading-relaxed text-gray-600">Поръчвате без регистрация. В Stripe ще въведете адреса за доставка и ще изберете начин на плащане.</p>
        {checkingCart && <p role="status" className="mb-4 rounded-xl bg-white p-4 text-sm text-gray-700">Проверяваме цените и наличностите…</p>}
        {cartError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{cartError}</p><button type="button" onClick={() => setRevision(value => value + 1)} className="mt-2 min-h-11 font-semibold underline">Провери отново</button></div>}

        {error && (
          <div role="alert" className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-xl p-2.5 sm:p-3 flex items-start gap-2">
            <i aria-hidden="true" className="ri-error-warning-line text-red-600 flex-shrink-0 mt-0.5"></i>
            <p className="text-xs sm:text-sm text-red-800">{error}</p>
          </div>
        )}

        {promoCode && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>Промо кодовете временно не се приемат за плащане с карта.</p>
            <button onClick={removePromoCode} className="mt-2 font-semibold underline">Премахни кода и продължи</button>
          </div>
        )}

        {/* Order Summary - compact on mobile */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Вашата поръчка</h2>
          <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 max-h-48 sm:max-h-64 overflow-y-auto">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 border-b border-gray-50 last:border-0">
                <img src={item.image} alt={item.name} className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 break-words">{item.name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">x{item.quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm font-bold text-red-600">€{(item.price * item.quantity).toFixed(2)}</p>
                  
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm border-t pt-2 sm:pt-3">
            <div className="flex justify-between text-gray-600">
              <span>Продукти</span>
              <span className="font-medium">€{totalPriceEur.toFixed(2)}</span>
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
              <span className="font-medium text-gray-500 text-[10px] sm:text-xs">При получаване</span>
            </div>
            <div className="flex justify-between font-bold text-sm sm:text-lg border-t pt-1.5 sm:pt-2">
              <span>Общо</span>
              <div className="text-right">
                {(discountTier || promoCode) && <div className="text-[10px] sm:text-xs text-gray-400 line-through font-normal">€{totalPriceEur.toFixed(2)}</div>}
                <span className="text-red-600">€{finalPriceEur.toFixed(2)}</span>
                
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details Form */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Данни за връзка</h2>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="checkout-email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Имейл адрес <span className="text-red-500">*</span>
              </label>
              <input
                id="checkout-email"
                type="email"
                autoComplete="email"
                disabled={isProcessing}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'checkout-email-error' : undefined}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="email@example.com"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${emailError ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-gray-200 focus:ring-red-100 focus:border-red-400'}`}
              />
              {emailError && <p id="checkout-email-error" className="mt-1 text-sm text-red-600">{emailError}</p>}
            </div>
            <div>
              <label htmlFor="checkout-phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                id="checkout-phone"
                type="tel"
                autoComplete="tel"
                disabled={isProcessing}
                aria-invalid={!!phoneError}
                aria-describedby="checkout-phone-help"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                placeholder="0899 123 456"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${phoneError ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-gray-200 focus:ring-red-100 focus:border-red-400'}`}
              />
              {phoneError && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><i aria-hidden="true" className="ri-error-warning-line"></i>{phoneError}</p>}
              <p id="checkout-phone-help" className="mt-1 text-sm text-gray-600">Български формат: 0899 123 456 или +359 899 123 456</p>
            </div>
          </div>
        </div>

        {/* Min order warning */}
        {isBelowMinimum && (
          <div className="mb-3 sm:mb-4 bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-amber-800 font-medium">Минимална поръчка €{MIN_ORDER_EUR.toFixed(2)} — текущо €{finalPriceEur.toFixed(2)}</p>
            <p className="text-[10px] sm:text-xs text-amber-700 mt-1">Добавете още €{remaining.toFixed(2)} за да продължите.</p>
          </div>
        )}

        {/* Desktop Pay Button */}
        <button onClick={handlePayNow} disabled={isProcessing || checkingCart || !!cartError || isBelowMinimum || !!promoCode} className="hidden lg:block w-full p-4 sm:p-5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 touch-target">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i aria-hidden="true" className="ri-bank-card-line text-xl sm:text-2xl"></i>
              </div>
              <div className="text-left">
                <div className="font-bold text-sm sm:text-base whitespace-nowrap">Към плащане</div>
                <div className="text-[10px] sm:text-xs text-red-100">Карта / Apple Pay / Google Pay</div>
              </div>
            </div>
            <div className="text-right">
              {(discountTier || promoCode) && <div className="text-[10px] sm:text-xs text-red-300 line-through">€{totalPriceEur.toFixed(2)}</div>}
              <div className="font-bold text-lg sm:text-xl">€{finalPriceEur.toFixed(2)}</div>
              
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 bg-white/10 rounded-lg py-2">
            <i aria-hidden="true" className="ri-visa-line text-lg sm:text-xl"></i>
            <i aria-hidden="true" className="ri-mastercard-line text-lg sm:text-xl"></i>
            <i aria-hidden="true" className="ri-apple-line text-sm sm:text-base"></i>
            <span className="text-[10px] sm:text-xs font-medium">Google Pay</span>
          </div>
          {isProcessing && <div className="mt-3 flex items-center justify-center gap-2 text-xs sm:text-sm"><i aria-hidden="true" className="ri-loader-4-line animate-spin"></i> Пренасочване към Stripe...</div>}
        </button>

        {/* Mobile Sticky Pay Button */}
        <button onClick={handlePayNow} disabled={isProcessing || checkingCart || !!cartError || isBelowMinimum || !!promoCode} className="lg:hidden fixed left-3 right-3 sm:left-4 sm:right-4 p-3 sm:p-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] touch-target" style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))', zIndex: 60 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i aria-hidden="true" className="ri-bank-card-line text-lg sm:text-xl"></i>
              <div>
                <div className="font-bold text-xs sm:text-sm whitespace-nowrap">Към плащане</div>
                <div className="text-[10px] text-red-100">Карта / Apple Pay</div>
              </div>
            </div>
            <div className="text-right">
              {(discountTier || promoCode) && <div className="text-[10px] text-red-300 line-through">€{totalPriceEur.toFixed(2)}</div>}
              <div className="font-bold text-base sm:text-lg">€{finalPriceEur.toFixed(2)}</div>
            </div>
          </div>
          {isProcessing && <div className="mt-2 flex items-center justify-center gap-2 text-[10px] sm:text-xs"><i aria-hidden="true" className="ri-loader-4-line animate-spin"></i> Пренасочване...</div>}
        </button>

        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-gray-400">
          <i aria-hidden="true" className="ri-shield-check-line"></i>
          <span>Сигурно плащане чрез Stripe</span>
        </div>

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-xl border border-gray-100 text-xs sm:text-sm text-gray-600 space-y-1.5 sm:space-y-2">
          <p className="flex items-center gap-2"><i aria-hidden="true" className="ri-truck-line text-red-600"></i>Доставка се заплаща при получаване</p>
          <p className="flex items-center gap-2"><i aria-hidden="true" className="ri-map-pin-line text-red-600"></i>Адресът за доставка ще бъде поискан при плащането</p>
          <p className="flex items-center gap-2"><i aria-hidden="true" className="ri-customer-service-2-line text-red-600"></i>Поддръжка: 0899 897 566</p>
        </div>
      </main>
    </div>
  );
}
