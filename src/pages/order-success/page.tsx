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
  const [params] = useSearchParams();
  const orderNumber = params.get('orderNumber') || '';
  const { items, clearCart } = useCart();
  const cartRef = useRef({ items, clearCart });
  cartRef.current = { items, clearCart };
  const [state, setState] = useState<PaymentState>('checking');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  useSEO({ title: 'Статус на поръчката | K-FOOD', description: 'Проверете потвърждението на плащането си в K-FOOD.',
    canonical: '/order-success', ogType: 'website' });

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    setError(''); setTimedOut(false); setState('checking');
    const poll = async () => {
      try {
        const token = sessionStorage.getItem(`order-proof:${orderNumber}`);
        if (!orderNumber || !token) {
          setState('unknown');
          setError('Няма достъп до потвърждението в този браузър. Свържете се с магазина с номера на поръчката.');
          return;
        }
        const { data, error: requestError } = await supabase.functions.invoke('checkout-status', {
          body: { orderNumber, statusToken: token },
        });
        if (disposed) return;
        if (requestError || !data || data.orderNumber !== orderNumber) throw new Error('Потвърждението още не е достъпно.');
        const known = ['pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'review'];
        if (!known.includes(data.paymentState)) throw new Error('Неочакван статус. Свържете се с магазина.');
        setState(data.paymentState);
        setError('');
        if (['paid', 'failed', 'expired'].includes(data.paymentState)) clearCheckoutAttempt(token, sessionStorage);
        if (data.paymentState === 'paid') {
          const cart = cartRef.current;
          if (sessionStorage.getItem(`order-cart:${orderNumber}`) === cartSignature(cart.items)) cart.clearCart();
          if (!sessionStorage.getItem(`purchase-tracked:${orderNumber}`) && data.totalAmountMinor > 0) {
            // Only server-confirmed payment and amount can produce a Purchase.
            sessionStorage.setItem(`purchase-tracked:${orderNumber}`, '1');
            trackPurchase({ transaction_id: data.orderNumber, value: data.totalAmountMinor / 100, currency: data.currency });
          }
          return;
        }
        if (['failed', 'expired', 'review'].includes(data.paymentState)) return;
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : 'Временен проблем при проверката.');
      }
      if (++polls < 30) timer = setTimeout(poll, 2000);
      else setTimedOut(true);
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [orderNumber, retry]);

  const paid = state === 'paid';
  const ended = state === 'failed' || state === 'expired';
  const title = paid ? 'Плащането е потвърдено!' : ended ? 'Плащането не е завършено' :
    state === 'review' ? 'Поръчката се проверява от екипа' : state === 'unknown' ? 'Проверете поръчката с магазина' : 'Проверяваме плащането';
  const message = paid ? 'Благодарим ви! Екипът ще обработи поръчката ви.' : ended ?
    'Този опит за плащане е приключил. Ако виждате удържана сума, свържете се с магазина, преди да платите отново.' :
    state === 'review' ? 'Екипът трябва да провери плащането и наличностите. Не правете повторно плащане.' :
    'Изчакваме потвърждение от платежната система. Не правете повторно плащане.';
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
          {error && <p className="bg-amber-50 rounded-xl p-3 text-amber-900 mb-4">{error}</p>}
          {timedOut && <p className="text-sm text-gray-600 mb-4">Потвърждението се забавя. Можете да проверите отново или да се свържете с магазина.</p>}
          {timedOut && <button onClick={() => setRetry(value => value + 1)} className="px-6 py-3 rounded-lg bg-red-600 text-white mb-6">Провери отново</button>}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg">Обратно към началото</Link>
            <Link to="/products" className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg">Продължи с пазаруването</Link>
          </div>
          <p className="text-gray-600 mt-8">За въпроси относно поръчката: <a href="mailto:kfoodtarnovo@gmail.com" className="text-red-600 underline">kfoodtarnovo@gmail.com</a></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
