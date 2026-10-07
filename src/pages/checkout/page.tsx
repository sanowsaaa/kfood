import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../home/components/Header';
import { useCart, MIN_ORDER_EUR } from '../../contexts/CartContext';
import { supabase } from '../../utils/supabase';
import { useSEO } from '../../utils/seo';
import { trackInitiateCheckout } from '../../utils/metaPixel';

export default function Checkout() {
  const { items, totalPriceEur, discountTier, discountAmountEur, promoCode, promoDiscountAmountEur, finalPriceEur, finalPrice, syncCartPrices } = useCart();
  const navigate = useNavigate();
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
    syncCartPrices();
    // Meta Pixel: InitiateCheckout
    if (items.length > 0) {
      trackInitiateCheckout({
        content_ids: items.map(i => String(i.id)),
        value: finalPriceEur,
        currency: 'EUR',
        num_items: items.reduce((s, i) => s + i.quantity, 0),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isBelowMinimum = finalPriceEur < MIN_ORDER_EUR;
  const remaining = Math.max(0, MIN_ORDER_EUR - finalPriceEur);

  const validateEmail = (value: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value.trim());
  };

  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\s/g, '');
    const regex = /^(\+359\d{8,9}|0\d{9})$/;
    return regex.test(cleaned);
  };

  const callCreateCheckout = async (customerEmail: string, customerPhone: string) => {
    const body = {
      items: items.map(item => ({
        id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image,
      })),
      discountPercent: discountTier?.percent || 0,
      promoCode: promoCode?.code || null,
      promoDiscountPercent: promoCode?.discountPercent || 0,
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.replace(/\s/g, ''),
    };

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', { body });
      if (!fnError && data?.url) return data;
    } catch { /* fallback */ }

    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурацията липсва');

    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let responseData;
    try { responseData = JSON.parse(responseText); } catch {
      throw new Error(`Сървърът върна грешка ${response.status}`);
    }
    if (!response.ok) throw new Error(responseData.error || `Сървър грешка: ${response.status}`);
    if (!responseData.url) throw new Error('Не получихме линк за плащане от сървъра');
    return responseData;
  };

  const handlePayNow = async () => {
    if (isBelowMinimum) return;
    setEmailError(''); setPhoneError(''); setError('');

    const emailValid = validateEmail(email);
    const phoneValid = validatePhone(phone);

    if (!emailValid) setEmailError('Моля, въведете валиден имейл адрес');
    if (!phoneValid) setPhoneError('Моля, въведете валиден български телефон');
    if (!emailValid || !phoneValid) return;

    setIsProcessing(true);
    // Save order total for Meta Pixel Purchase event
    sessionStorage.setItem('order_total', String(finalPriceEur));
    try {
      const data = await callCreateCheckout(email, phone);
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error('Не получихме линк за плащане');
    } catch (err: any) {
      setError(err.message || 'Грешка при плащането. Моля, опитайте отново.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-10 pb-40 sm:pb-44 md:pb-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Завършване на поръчка</h1>

        {error && (
          <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-xl p-2.5 sm:p-3 flex items-start gap-2">
            <i className="ri-error-warning-line text-red-600 flex-shrink-0 mt-0.5"></i>
            <p className="text-xs sm:text-sm text-red-800">{error}</p>
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
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
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
                <span className="flex items-center gap-1"><i className="ri-gift-line"></i>Отстъпка {discountTier.percent}%</span>
                <span>-€{discountAmountEur.toFixed(2)}</span>
              </div>
            )}
            {promoCode && (
              <div className="flex justify-between text-amber-600 font-semibold">
                <span className="flex items-center gap-1"><i className="ri-gamepad-line"></i>Промо {promoCode.discountPercent}%</span>
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
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="email@example.com"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${emailError ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-gray-200 focus:ring-red-100 focus:border-red-400'}`}
              />
              {emailError && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><i className="ri-error-warning-line"></i>{emailError}</p>}
            </div>
            <div>
              <label htmlFor="checkout-phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                id="checkout-phone"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                placeholder="0899 123 456"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${phoneError ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-gray-200 focus:ring-red-100 focus:border-red-400'}`}
              />
              {phoneError && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><i className="ri-error-warning-line"></i>{phoneError}</p>}
              <p className="mt-1 text-[10px] sm:text-xs text-gray-400">Български формат: 0899 123 456 или +359 899 123 456</p>
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
        <button onClick={handlePayNow} disabled={isProcessing || isBelowMinimum} className="hidden lg:block w-full p-4 sm:p-5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 touch-target">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-bank-card-line text-xl sm:text-2xl"></i>
              </div>
              <div className="text-left">
                <div className="font-bold text-sm sm:text-base whitespace-nowrap">Плати сега</div>
                <div className="text-[10px] sm:text-xs text-red-100">Карта / Apple Pay / Google Pay</div>
              </div>
            </div>
            <div className="text-right">
              {(discountTier || promoCode) && <div className="text-[10px] sm:text-xs text-red-300 line-through">€{totalPriceEur.toFixed(2)}</div>}
              <div className="font-bold text-lg sm:text-xl">€{finalPriceEur.toFixed(2)}</div>
              
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 bg-white/10 rounded-lg py-2">
            <i className="ri-visa-line text-lg sm:text-xl"></i>
            <i className="ri-mastercard-line text-lg sm:text-xl"></i>
            <i className="ri-apple-line text-sm sm:text-base"></i>
            <span className="text-[10px] sm:text-xs font-medium">Google Pay</span>
          </div>
          {isProcessing && <div className="mt-3 flex items-center justify-center gap-2 text-xs sm:text-sm"><i className="ri-loader-4-line animate-spin"></i> Пренасочване към Stripe...</div>}
        </button>

        {/* Mobile Sticky Pay Button */}
        <button onClick={handlePayNow} disabled={isProcessing || isBelowMinimum} className="lg:hidden fixed left-3 right-3 sm:left-4 sm:right-4 p-3 sm:p-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] touch-target" style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))', zIndex: 60 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-bank-card-line text-lg sm:text-xl"></i>
              <div>
                <div className="font-bold text-xs sm:text-sm whitespace-nowrap">Плати сега</div>
                <div className="text-[10px] text-red-100">Карта / Apple Pay</div>
              </div>
            </div>
            <div className="text-right">
              {(discountTier || promoCode) && <div className="text-[10px] text-red-300 line-through">€{totalPriceEur.toFixed(2)}</div>}
              <div className="font-bold text-base sm:text-lg">€{finalPriceEur.toFixed(2)}</div>
            </div>
          </div>
          {isProcessing && <div className="mt-2 flex items-center justify-center gap-2 text-[10px] sm:text-xs"><i className="ri-loader-4-line animate-spin"></i> Пренасочване...</div>}
        </button>

        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-gray-400">
          <i className="ri-shield-check-line"></i>
          <span>256-bit SSL · Сигурно плащане чрез Stripe</span>
        </div>

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-xl border border-gray-100 text-xs sm:text-sm text-gray-600 space-y-1.5 sm:space-y-2">
          <p className="flex items-center gap-2"><i className="ri-truck-line text-red-600"></i>Доставка се заплаща при получаване</p>
          <p className="flex items-center gap-2"><i className="ri-map-pin-line text-red-600"></i>Адресът за доставка ще бъде поискан при плащането</p>
          <p className="flex items-center gap-2"><i className="ri-customer-service-2-line text-red-600"></i>Поддръжка: 0899 897 566</p>
        </div>
      </div>
    </div>
  );
}