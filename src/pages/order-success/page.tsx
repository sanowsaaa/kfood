import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO } from '../../utils/seo';
import { supabase } from '../../utils/supabase';
import { trackPurchase } from '../../utils/metaPixel';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');
  const sessionId = searchParams.get('session_id');
  const [orderUpdated, setOrderUpdated] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const safeOrderNumber = orderNumber ?? '';

  useSEO({
    title: 'Поръчката е Приета | K-FOOD Велико Търново - Корейска Храна',
    description: 'Вашата поръчка от K-FOOD е приета успешно. Благодарим ви за доверието! Доставка на корейска храна в цяла България.',
    keywords: 'поръчка приета, K-FOOD поръчка успешна, корейска храна доставка, благодарим за поръчката',
    canonical: '/order-success',
    ogType: 'website',
  });

  const callUpdateStripeOrder = async (sid: string, orderNum: string) => {
    const body = { sessionId: sid, orderNumber: orderNum };

    // Method 1: supabase.functions.invoke
    try {
      const { error } = await supabase.functions.invoke('update-stripe-order', { body });
      if (!error) return;
    } catch {
      // Try fallback
    }

    // Method 2: direct fetch fallback
    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase конфигурацията липсва');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/update-stripe-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch { /* ignore */ }
      throw new Error(json?.error || `Сървър грешка: ${response.status}`);
    }
  };

  useEffect(() => {
    if (sessionId && safeOrderNumber && !orderUpdated) {
      callUpdateStripeOrder(sessionId, safeOrderNumber)
        .then(() => {
          setOrderUpdated(true);
          // Meta Pixel: Purchase
          const orderTotal = parseFloat(sessionStorage.getItem('order_total') || '0');
          if (orderTotal > 0) {
            trackPurchase({
              transaction_id: safeOrderNumber,
              value: orderTotal,
              currency: 'EUR',
            });
            sessionStorage.removeItem('order_total');
          }
        })
        .catch((err: any) => setUpdateError(err.message || 'Грешка при обновяване на поръчката'));
    }
  }, [sessionId, safeOrderNumber]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-check-line text-5xl text-green-600" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Поръчката е приета!
          </h1>

          {safeOrderNumber && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 inline-block">
              <p className="text-sm text-red-700 mb-1">Номер на поръчка</p>
              <p className="text-2xl font-bold text-red-900">{safeOrderNumber}</p>
            </div>
          )}

          {updateError && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              {updateError}
            </div>
          )}

          <p className="text-xl text-gray-600 mb-8">
            Благодарим ви за поръчката! Ще се свържем с вас скоро за потвърждение.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-4 text-left">
              <i className="ri-information-line text-2xl text-red-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Какво следва?</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <i className="ri-check-line text-green-600 mr-2" />
                    Ще получите потвърждение по имейл
                  </li>
                  <li className="flex items-center">
                    <i className="ri-check-line text-green-600 mr-2" />
                    Нашият екип ще обработи поръчката ви
                  </li>
                  <li className="flex items-center">
                    <i className="ri-check-line text-green-600 mr-2" />
                    Доставката ще пристигне в рамките на 1-2 работни дни
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {safeOrderNumber && (
              <Link
                to={`/track-order?order=${encodeURIComponent(safeOrderNumber)}`}
                className="px-8 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center space-x-2"
              >
                <i className="ri-map-pin-line" />
                <span>Проследи поръчка</span>
              </Link>
            )}
            <Link
              to="/"
              className="px-8 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Обратно към началото
            </Link>
            <Link
              to="/products"
              className="px-8 py-4 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Продължи с пазаруването
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t">
            <p className="text-gray-600 mb-4">Имате въпроси относно поръчката?</p>
            <a
              href="mailto:kfoodtarnovo@gmail.com"
              className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
            >
              Свържете се с нас <i className="ri-arrow-right-line ml-1" />
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}