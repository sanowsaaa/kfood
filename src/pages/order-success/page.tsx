import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO } from '../../utils/seo';
import { supabase } from '../../utils/supabase';
import { trackPurchase } from '../../utils/metaPixel';
import { useCart } from '../../contexts/CartContext';
import { cartSignature, clearCheckoutAttempt } from '../../utils/checkoutAttempt';

type PaymentState = 'checking' | 'pending' | 'awaiting_payment' | 'paid' | 'failed' | 'expired' | 'review' | 'unknown';
export default function OrderSuccess() {
  const [params, setParams] = useSearchParams();
  const orderNumber = params.get('orderNumber') || '';
  useEffect(() => {
    if (params.has('session_id')) setParams(previous => { const next = new URLSearchParams(previous); next.delete('session_id'); return next; }, { replace: true });
  }, [params, setParams]);
  const { items, clearCart } = useCart();
  const cartRef = useRef({ items, clearCart });
  cartRef.current = { items, clearCart };
  const [state, setState] = useState<PaymentState>('checking');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [testMode, setTestMode] = useState(false);
  useSEO({ title: 'Статус на поръчката | K-FOOD', description: 'Проверете потвърждението на плащането си в K-FOOD.',
    canonical: '/order-success', ogType: 'website' });

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    const deadline = Date.now() + 60000;
    const controller = new AbortController();
    setError(''); setTimedOut(false); setState('checking');
    const poll = async () => {
      try {
        let token: string | null = null;
        try { token = sessionStorage.getItem(`order-proof:${orderNumber}`); } catch { /* Continue with the existing guest tracking screen. */ }
        if (!orderNumber || !token) {
          setState('unknown');
          setError('В този браузър няма запазено потвърждение. Проверете поръчката с нейния номер и имейл.');
          return;
        }
        const { data, error: requestError } = await supabase.functions.invoke('checkout-status', {
          body: { orderNumber, statusToken: token },
          signal: controller.signal, timeout: 10000,
        });
        if (disposed) return;
        if (requestError || !data || data.orderNumber !== orderNumber) throw new Error('Потвърждението още не е достъпно.');
        const known = ['pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'review'];
        if (!known.includes(data.paymentState)) throw new Error('Неочакван статус. Свържете се с магазина.');
        if (data.paymentState === 'paid' && (!Number.isSafeInteger(data.totalAmountMinor) || data.totalAmountMinor <= 0 || data.currency !== 'EUR'))
          throw new Error('Сумата на плащането не е потвърдена. Свържете се с магазина.');
        setState(data.paymentState);
        setTestMode(data.livemode === false);
        setError('');
        try { if (['paid', 'failed', 'expired'].includes(data.paymentState)) clearCheckoutAttempt(token, sessionStorage); } catch { /* Storage failure cannot undo a confirmed payment. */ }
        if (data.paymentState === 'paid') {
          const cart = cartRef.current;
          try {
            if (sessionStorage.getItem(`order-cart:${orderNumber}`) === cartSignature(cart.items)) cart.clearCart();
            if (data.livemode === true && !sessionStorage.getItem(`purchase-tracked:${orderNumber}`) && localStorage.getItem('cookieConsent') === 'accepted') {
              // Test payments must not be recorded as real marketing purchases.
              sessionStorage.setItem(`purchase-tracked:${orderNumber}`, '1');
              trackPurchase({ transaction_id: data.orderNumber, value: data.totalAmountMinor / 100, currency: data.currency });
            }
          } catch { /* The authoritative paid state still renders. */ }
          return;
        }
        if (['failed', 'expired', 'review'].includes(data.paymentState)) return;
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : 'Временен проблем при проверката.');
      }
      if (++polls < 30 && Date.now() < deadline) timer = setTimeout(poll, 2000);
      else setTimedOut(true);
    };
    void poll();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); };
  }, [orderNumber, retry]);

  const paid = state === 'paid';
  const ended = state === 'failed' || state === 'expired';
  const title = paid ? 'Плащането е потвърдено!' : ended ? 'Плащането не е завършено' :
    state === 'review' ? 'Поръчката се проверява от екипа' : state === 'unknown' ? 'Проверете статуса на поръчката' : timedOut ? 'Потвърждението се забавя' : 'Проверяваме плащането';
  const message = paid ? 'Благодарим ви! Екипът ще обработи поръчката ви.' : ended ?
    'Този опит за плащане е приключил. Ако виждате удържана сума, свържете се с магазина, преди да платите отново.' :
    state === 'review' ? 'Екипът трябва да провери плащането и наличностите. Не правете повторно плащане.' :
    state === 'unknown' ? 'Използвайте номера и имейла от поръчката за проследяване или се свържете с магазина.' :
    'Изчакваме потвърждение от платежната система. Не правете повторно плащане.';
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-12 text-center" aria-live="polite">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${paid ? 'bg-green-100' : 'bg-amber-100'}`}>
            <i className={`text-4xl ${paid ? 'ri-check-line text-green-600' : 'ri-time-line text-amber-700'}`} aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          {orderNumber && <div className="bg-red-50 rounded-xl p-4 mb-6 break-all">
            <p className="text-sm text-red-700 mb-1">Номер на поръчка</p>
            <p className="text-lg font-bold text-red-900">{orderNumber}</p>
          </div>}
          <p className="text-lg text-gray-600 mb-6">{message}</p>
          {testMode && <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Това е тестово плащане в Stripe.</p>}
          {error && <p className="bg-amber-50 rounded-xl p-3 text-amber-900 mb-4">{error}</p>}
          {timedOut && <p className="text-sm text-gray-600 mb-4">Потвърждението се забавя. Можете да проверите отново или да се свържете с магазина.</p>}
          {timedOut && <button onClick={() => setRetry(value => value + 1)} className="px-6 py-3 rounded-lg bg-red-600 text-white mb-6">Провери отново</button>}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={'/track-order' + (orderNumber ? '?order=' + encodeURIComponent(orderNumber) : '')} className="customer-primary">Проследи поръчката</Link>
            <Link to="/products" className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg">Продължи с пазаруването</Link>
          </div>
          <p className="text-gray-600 mt-8">За въпроси относно поръчката: <a href="mailto:kfoodtarnovo@gmail.com" className="text-red-600 underline">kfoodtarnovo@gmail.com</a></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
