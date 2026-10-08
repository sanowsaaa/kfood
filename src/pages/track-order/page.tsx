import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO } from '../../utils/seo';
import { supabase } from '../../utils/supabase';
import { emailValid } from '../../utils/customer';

interface Order {
  order_number: string; status: string; total_amount: number; currency: string; original_total_amount?: number;
  customer_phone?: string; created_at: string; payment_method?: string;
  shipping_address?: { full_name?: string; address?: string; city?: string; postal_code?: string };
  items: Array<{ name: string; quantity: number; price: number }>;
  tracking_notes?: string; estimated_delivery?: string;
}
const statuses: Record<string, { label: string; description: string; step: number }> = {
  pending: { label: 'Получена', description: 'Поръчката е записана. Потвърждението на плащането е отделно от доставката.', step: 0 },
  confirmed: { label: 'Потвърдена', description: 'Поръчката е потвърдена и предстои подготовка.', step: 1 },
  processing: { label: 'Обработва се', description: 'Екипът обработва поръчката.', step: 2 },
  preparing: { label: 'Подготвя се', description: 'Продуктите се подготвят за изпращане.', step: 2 },
  shipped: { label: 'Изпратена', description: 'Поръчката е предадена на куриер.', step: 3 },
  delivered: { label: 'Доставена', description: 'Поръчката е доставена.', step: 4 },
  cancelled: { label: 'Отказана', description: 'Поръчката е отказана. При въпроси за плащане се свържете с магазина.', step: -1 },
  payment_review: { label: 'Проверка на плащането', description: 'Екипът проверява плащането. Не плащайте повторно.', step: -1 },
};
const deliverySteps = ['Получена', 'Потвърдена', 'Подготвя се', 'Изпратена', 'Доставена'];
function formatDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Date(value).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TrackOrder() {
  const [params, setParams] = useSearchParams();
  const [number, setNumber] = useState(params.get('order') || '');
  const [email, setEmail] = useState(params.get('email') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentState, setPaymentState] = useState('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<{ id: number; controller?: AbortController }>({ id: 0 });
  const autoSearch = useRef('');
  useSEO({ title: 'Проследяване на поръчка | K-FOOD', description: 'Проверете статуса на вашата поръчка с номер и имейл, без регистрация.', canonical: '/track-order', ogType: 'website' });

  const invalidate = () => {
    request.current.controller?.abort(); request.current.id++;
    setOrder(null); setError(''); setLoading(false);
  };
  useEffect(() => () => {
    request.current.id++; request.current.controller?.abort();
    autoSearch.current = '';
  }, []);
  const search = useCallback(async (orderNumber: string, customerEmail: string) => {
    if (request.current.controller && !request.current.controller.signal.aborted) return;
    if (!/^[a-z0-9-]{3,100}$/i.test(orderNumber.trim()) || !emailValid(customerEmail)) {
      setError('Въведете валиден номер на поръчка и имейла, използван при поръчката.'); return;
    }
    const id = ++request.current.id, controller = new AbortController();
    request.current.controller = controller;
    setLoading(true); setError(''); setOrder(null);
    try {
      const { data, error: requestError } = await supabase.functions.invoke('checkout-status', {
        body: { orderNumber: orderNumber.trim(), email: customerEmail.trim().toLowerCase() },
        signal: controller.signal, timeout: 20000,
      });
      if (id !== request.current.id) return;
      if (requestError) {
        let message = 'Проследяването временно не е достъпно. Опитайте отново или се свържете с магазина.';
        if (requestError.context instanceof Response) {
          try { const body = await requestError.context.json(); if (typeof body.error === 'string' && /[А-Яа-я]/.test(body.error)) message = body.error; } catch { /* Safe fallback. */ }
        }
        throw new Error(message);
      }
      if (!data?.order || typeof data.order.order_number !== 'string' || data.order.order_number.toLowerCase() !== orderNumber.trim().toLowerCase() || !Array.isArray(data.order.items) || !Number.isFinite(Number(data.order.total_amount)))
        throw new Error('Сървърът не върна потвърден статус. Опитайте отново.');
      setOrder(data.order); setPaymentState(data.paymentState || 'unknown');
    } catch (err) {
      if (id === request.current.id) setError(err instanceof Error ? err.message : 'Не успяхме да проверим поръчката.');
    } finally {
      if (id === request.current.id) { setLoading(false); request.current.controller = undefined; }
    }
  }, []);

  useEffect(() => {
    const orderParam = params.get('order'), emailParam = params.get('email');
    if (orderParam) setNumber(orderParam);
    if (orderParam && emailParam && autoSearch.current !== orderParam + ':' + emailParam) {
      autoSearch.current = orderParam + ':' + emailParam; setEmail(emailParam); void search(orderParam, emailParam);
    }
    // Honor existing email links once, then remove personal data from the visible URL.
    if (emailParam) setParams(previous => { const next = new URLSearchParams(previous); next.delete('email'); return next; }, { replace: true });
  }, [params, search, setParams]);

  const info = order ? statuses[order.status] || { label: 'Проверява се', description: 'Свържете се с екипа за актуална информация.', step: -1 } : null;
  const online = order?.payment_method === 'stripe';
  const paid = paymentState === 'paid';
  return <div className="min-h-screen bg-gray-50">
    <Header />
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link to="/products" className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-red-700">← Към магазина</Link>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-700">Вашата поръчка</p>
      <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-4xl">Проследяване на поръчка</h1>
      <p className="mt-3 mb-7 text-base leading-relaxed text-gray-600">Въведете номера и имейла от поръчката. Не е необходим вход.</p>
      <form onSubmit={event => { event.preventDefault(); void search(number, email); }} className="customer-card space-y-5 p-5 sm:p-7">
        <div><label htmlFor="tracking-number" className="mb-2 block text-sm font-semibold text-gray-800">Номер на поръчка</label>
          <input id="tracking-number" name="order" autoComplete="off" value={number} maxLength={100} required
            onChange={event => { invalidate(); setNumber(event.target.value); }} placeholder="ORD-…" className="customer-input font-mono" />
          <p className="mt-2 text-sm text-gray-600">Използвайте номера от потвърждението на поръчката.</p></div>
        <div><label htmlFor="tracking-email" className="mb-2 block text-sm font-semibold text-gray-800">Имейл от поръчката</label>
          <input id="tracking-email" name="email" type="email" autoComplete="email" value={email} maxLength={254} required
            onChange={event => { invalidate(); setEmail(event.target.value); }} placeholder="email@example.com" className="customer-input" /></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900">{error}</p>}
        <button type="submit" disabled={loading} className="customer-primary w-full">{loading ? 'Проверяваме поръчката…' : 'Проследи поръчка'}</button>
        <p role="status" className="sr-only">{loading ? 'Зареждане на статуса' : order ? 'Статусът е зареден' : ''}</p>
      </form>

      {order && info && <div className="mt-6 space-y-5" aria-live="polite">
        <section className="customer-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="mb-1 text-sm text-gray-600">Статус на поръчката</p><h2 className="text-2xl font-bold text-gray-900">{info.label}</h2></div>
            <span className={'rounded-full px-3 py-2 text-sm font-semibold ' + (paid ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700')}>
              {paid ? 'Плащането е потвърдено' : online ? 'Онлайн плащане' : order.payment_method === 'cod' ? 'Наложен платеж' : 'Плащане чрез магазина'}
            </span>
          </div>
          <p className="mt-3 text-base leading-relaxed text-gray-600">{info.description}</p>
          {online && !paid && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{paymentState === 'failed' || paymentState === 'expired' ? 'Този опит за плащане не е завършен.' : 'Този екран още не потвърждава платен статус. При удържана сума не плащайте повторно; свържете се с магазина.'}</p>}
          {info.step >= 0 && <ol aria-label="Етапи на доставката" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
            {deliverySteps.map((label, index) => <li key={label} aria-current={index === info.step ? 'step' : undefined}
              className={'flex items-center gap-3 rounded-xl border p-3 sm:flex-col sm:text-center ' + (index <= info.step ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-200 text-gray-600')}>
              <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ' + (index <= info.step ? 'bg-red-600 text-white' : 'bg-gray-100')}>{index < info.step ? '✓' : index + 1}</span>
              <span className="text-sm font-medium">{label}</span></li>)}
          </ol>}
          {order.tracking_notes && <div className="mt-5 rounded-xl bg-gray-50 p-4"><h3 className="mb-1 text-sm font-semibold text-gray-900">Информация от магазина</h3><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{order.tracking_notes}</p></div>}
          {order.estimated_delivery && !['delivered', 'cancelled'].includes(order.status) && <p className="mt-4 text-sm text-gray-700">Очаквана доставка: <strong>{formatDate(order.estimated_delivery)}</strong></p>}
        </section>
        <section className="customer-card p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-bold text-gray-900">Детайли на поръчката</h2>
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            <div><dt className="mb-1 text-gray-600">Номер</dt><dd className="break-all font-mono font-semibold text-gray-900">{order.order_number}</dd></div>
            <div><dt className="mb-1 text-gray-600">Дата</dt><dd className="text-gray-900">{formatDate(order.created_at)}</dd></div>
            <div><dt className="mb-1 text-gray-600">Получател</dt><dd className="break-words text-gray-900">{order.shipping_address?.full_name || '—'}</dd></div>
            <div><dt className="mb-1 text-gray-600">Телефон</dt><dd className="text-gray-900">{order.customer_phone || '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="mb-1 text-gray-600">Адрес</dt><dd className="break-words text-gray-900">{[order.shipping_address?.address, order.shipping_address?.city, order.shipping_address?.postal_code].filter(Boolean).join(', ') || 'Предстои потвърждение от магазина'}</dd></div>
          </dl>
          <ul className="mt-6 divide-y border-t border-gray-100">
            {order.items.map((item, index) => <li key={index} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0"><p className="break-words text-sm font-semibold text-gray-900">{item.name}</p><p className="mt-1 text-sm text-gray-600">Количество: {item.quantity}</p></div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">€{(Number(item.price) * Number(item.quantity)).toFixed(2)}</span></li>)}
          </ul>
          {Number(order.original_total_amount) > Number(order.total_amount) && <p className="mt-3 flex justify-between text-sm text-red-700"><span>Отстъпка</span><span>−€{(Number(order.original_total_amount) - Number(order.total_amount)).toFixed(2)}</span></p>}
          <div className="mt-3 flex items-center justify-between border-t pt-5"><span className="font-semibold text-gray-900">Общо продукти</span><strong className="text-xl tabular-nums text-red-700">€{Number(order.total_amount).toFixed(2)}</strong></div>
          <p className="mt-2 text-sm text-gray-600">Доставката се заплаща при получаване.</p>
        </section>
      </div>}
      <aside className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-gray-900">Помощ с поръчката</h2>
        <p className="mt-2 mb-4 text-sm leading-relaxed text-gray-600">При липсващо потвърждение или въпрос за доставката посочете номера на поръчката на екипа.</p>
        <div className="flex flex-wrap gap-3"><a href="tel:+359899897566" className="customer-secondary">0899 897 566</a><a href={'mailto:kfoodtarnovo@gmail.com?subject=' + encodeURIComponent('Въпрос за поръчка ' + number)} className="customer-secondary">Пиши на магазина</a></div>
      </aside>
    </main><Footer />
  </div>;
}
