import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO } from '../../utils/seo';
import { supabase } from '../../utils/supabase';

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    full_name?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    notes?: string;
  };
  items: Array<{ name: string; quantity: number; price: number; }>;
  total_amount: number;
  currency: string;
  stripe_session_id?: string;
  status: string;
  tracking_notes?: string;
  estimated_delivery?: string;
  created_at: string;
}

const statusConfig = {
  pending: { label: 'Получена', icon: 'ri-time-line', color: 'bg-sky-100 text-sky-700 border-sky-200', description: 'Вашата поръчка е получена и се обработва' },
  confirmed: { label: 'Потвърдена', icon: 'ri-checkbox-circle-line', color: 'bg-green-100 text-green-700 border-green-200', description: 'Поръчката е потвърдена и се подготвя за изпращане' },
  preparing: { label: 'Подготвя се', icon: 'ri-box-3-line', color: 'bg-amber-100 text-amber-700 border-amber-200', description: 'Продуктите се опаковат за изпращане' },
  shipped: { label: 'Изпратена', icon: 'ri-truck-line', color: 'bg-violet-100 text-violet-700 border-violet-200', description: 'Поръчката е предадена на куриер' },
  delivered: { label: 'Доставена', icon: 'ri-check-double-line', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: 'Поръчката е успешно доставена' },
  cancelled: { label: 'Отказана', icon: 'ri-close-circle-line', color: 'bg-red-100 text-red-700 border-red-200', description: 'Поръчката е отказана' },
  processing: { label: 'Обработва се', icon: 'ri-settings-3-line', color: 'bg-purple-100 text-purple-700 border-purple-200', description: 'Поръчката се обработва' },
};

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useSEO({
    title: 'Проследяване на Поръчка - K-FOOD Велико Търново',
    description: 'Проследете статуса на вашата поръчка от K-FOOD. Въведете номер на поръчка и имейл и вижте къде се намира вашата пратка.',
    keywords: 'проследяване поръчка, статус поръчка, K-FOOD доставка, проследи пратка Econt Speedy, корейска храна поръчка статус',
    canonical: '/track-order',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com'}/track-order`,
          url: `${import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com'}/track-order`,
          name: 'Проследяване на Поръчка - K-FOOD Велико Търново',
          description: 'Проследете статуса на вашата поръчка от K-FOOD онлайн магазин за корейска храна.',
          inLanguage: 'bg-BG',
          isPartOf: { '@id': `${import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com'}/#website` },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Начало', item: import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com' },
            { '@type': 'ListItem', position: 2, name: 'Проследяване на Поръчка', item: `${import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com'}/track-order` },
          ],
        },
      ],
    },
  });

  useEffect(() => {
    const orderParam = searchParams.get('order');
    const emailParam = searchParams.get('email');
    if (orderParam) setOrderNumber(orderParam);
    if (emailParam) setEmail(emailParam);
    if (orderParam && emailParam) searchOrder(orderParam, emailParam);
  }, [searchParams]);

  const searchOrder = async (number: string, emailVal: string) => {
    if (!number.trim()) { setError('Моля, въведете номер на поръчка'); return; }
    if (!emailVal.trim()) { setError('Моля, въведете имейл адрес'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal.trim())) {
      setError('Моля, въведете валиден имейл адрес');
      return;
    }

    setLoading(true); setError(''); setOrder(null);

    try {
      // Търсим по номер И имейл - двойна верификация
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', number.trim().toUpperCase())
        .eq('customer_email', emailVal.trim().toLowerCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Поръчка с този номер и имейл не е намерена. Моля, проверете данните и опитайте отново. Имейлът трябва да съвпада с този, с който е направена поръчката.');
      } else {
        setOrder(data as Order);
      }
    } catch {
      setError('Възникна грешка при търсенето. Моля, опитайте отново.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchOrder(orderNumber, email);
  };

  const getStatusSteps = (currentStatus: string) => {
    const steps = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(currentStatus);
    if (currentStatus === 'cancelled') return steps.map(s => ({ status: s, completed: false, active: false }));
    return steps.map((step, index) => ({ status: step, completed: index < currentIndex, active: index === currentIndex }));
  };

  const getStatusInfo = (status: string) => statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <>
      <Header />
      <section className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-map-pin-line text-5xl text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Проследяване на Поръчка</h1>
          <p className="text-xl text-emerald-50 max-w-2xl mx-auto">Въведете номера на поръчката и имейла, с който е направена</p>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-gray-50 to-teal-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search box */}
          <div className="bg-white rounded-2xl p-8 border border-emerald-100">
            {/* Security notice */}
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ri-shield-check-line text-emerald-600 text-lg"></i>
              </div>
              <p className="text-sm text-emerald-800">
                За вашата сигурност, трябва да въведете и номера на поръчката, и имейла, с който е направена. Само вие имате достъп до вашите поръчки.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-5">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Номер на поръчка *</label>
                <div className="relative">
                  <input
                    type="text"
                    id="order-number"
                    name="order-number"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value)}
                    placeholder="Например: ORD-20260318-1234"
                    className="w-full px-5 py-3.5 pl-12 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                  <i className="ri-barcode-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Номерът е в имейла за потвърждение на поръчката</p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Имейл адрес *</label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ivan@gmail.com"
                    className="w-full px-5 py-3.5 pl-12 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                  <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Имейлът, с който е направена поръчката</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
                  <i className="ri-error-warning-line text-xl text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Търсене...</span></>
                  : <><i className="ri-search-line text-xl" /><span>Проследи поръчка</span></>
                }
              </button>
            </form>
          </div>

          {/* Order result */}
          {order && (
            <div className="mt-8 space-y-6">
              {/* Status card */}
              <div className="bg-white rounded-2xl p-8 border border-emerald-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Статус на поръчката</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.stripe_session_id ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <i className="ri-bank-card-line mr-1"></i>Платено онлайн
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                        <i className="ri-truck-line mr-1"></i>Наложен платеж
                      </span>
                    )}
                    <span className={`px-4 py-2 rounded-full font-semibold border-2 whitespace-nowrap ${getStatusInfo(order.status).color}`}>
                      <i className={`${getStatusInfo(order.status).icon} mr-2`} />
                      {getStatusInfo(order.status).label}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mb-8">{getStatusInfo(order.status).description}</p>

                {order.status !== 'cancelled' && (
                  <div className="relative">
                    <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-500"
                        style={{ width: `${(getStatusSteps(order.status).filter(s => s.completed).length / 4) * 100}%` }}
                      />
                    </div>
                    <div className="relative flex justify-between">
                      {getStatusSteps(order.status).map(step => (
                        <div key={step.status} className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 bg-white transition-all ${step.completed || step.active ? 'border-emerald-600 text-emerald-600' : 'border-gray-300 text-gray-400'}`}>
                            <i className={`${statusConfig[step.status as keyof typeof statusConfig]?.icon || 'ri-time-line'} text-xl`} />
                          </div>
                          <span className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${step.completed || step.active ? 'text-gray-900' : 'text-gray-500'}`}>
                            {statusConfig[step.status as keyof typeof statusConfig]?.label || step.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.tracking_notes && (
                  <div className="mt-8 bg-sky-50 border-2 border-sky-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <i className="ri-information-line text-xl text-sky-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-sky-900 mb-1">Допълнителна информация</p>
                        <p className="text-sky-800 text-sm">{order.tracking_notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {order.estimated_delivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center space-x-3">
                    <i className="ri-calendar-line text-xl text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">Очаквана доставка</p>
                      <p className="text-amber-800 text-sm">
                        {new Date(order.estimated_delivery).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Order details */}
              <div className="bg-white rounded-2xl p-8 border border-emerald-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Детайли на поръчката</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Номер на поръчка</p>
                    <p className="font-semibold text-gray-900 font-mono">{order.order_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Дата</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Получател</p>
                    <p className="font-semibold text-gray-900">{order.shipping_address?.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Телефон</p>
                    <p className="font-semibold text-gray-900">{order.customer_phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Адрес за доставка</p>
                    <p className="font-semibold text-gray-900">
                      {[order.shipping_address?.address, order.shipping_address?.city, order.shipping_address?.postal_code].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-900 mb-4">Поръчани продукти</h4>
                  <div className="space-y-3">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">Количество: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">€{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Обща сума:</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-600 block">€{(Number(order.total_amount)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Help */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="ri-customer-service-2-line text-2xl text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Нужда от помощ?</h4>
                    <p className="text-gray-700 mb-4">Ако имате въпроси относно вашата поръчка, нашият екип е на разположение.</p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="tel:+359899897566"
                        className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors whitespace-nowrap cursor-pointer border border-emerald-200"
                      >
                        <i className="ri-phone-line" /><span>Обади се</span>
                      </a>
                      <a
                        href={`mailto:kfoodtarnovo@gmail.com?subject=Въпрос за поръчка ${order.order_number}`}
                        className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors whitespace-nowrap cursor-pointer border border-emerald-200"
                      >
                        <i className="ri-mail-line" /><span>Изпрати имейл</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!order && !loading && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <i className="ri-question-line text-2xl text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Къде да намеря номера?</h3>
                <p className="text-gray-600 text-sm">Номерът на поръчката е изпратен на вашия имейл веднага след завършване на поръчката.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <i className="ri-time-line text-2xl text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Колко време отнема?</h3>
                <p className="text-gray-600 text-sm">Обикновено доставяме в рамките на 1-2 работни дни за Велико Търново и региона.</p>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
