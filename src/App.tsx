import { Suspense, useEffect } from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { AppRoutes } from './router';
import { CartProvider } from './contexts/CartContext';
import { useCart } from './contexts/CartContext';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';
import CartToast from './components/CartToast';
import { trackPageView } from './utils/metaPixel';
import { B2BProvider, useB2B } from './contexts/B2BContext';
import CustomerReadError from './components/CustomerReadError';
import './customer.css';
import './b2b.css';

function SiteFrame() {
  const location = useLocation();
  const { profileError, refreshData } = useB2B();
  const staffOrPartner = location.pathname.startsWith('/admin') || location.pathname.startsWith('/b2b');
  const partnerWorkspace = /^\/b2b\/(dashboard|products|product|quick-order|cart|checkout|orders|documents)(\/|$)/.test(location.pathname);
  if (partnerWorkspace && profileError) return <div className="b2b-shell min-h-screen bg-gray-50 px-4 py-12">
    <CustomerReadError message={profileError} onRetry={() => void refreshData()} />
    <Link to="/b2b/login" className="block text-center mt-4 text-emerald-700 underline">Към входа в портала</Link>
  </div>;
  return <div className={partnerWorkspace ? 'b2b-shell' : staffOrPartner ? undefined : 'customer-shell customer-root'}>
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white" role="status"><p className="text-base text-gray-700">Зареждане…</p></div>}>
      <AppRoutes />
    </Suspense>
  </div>;
}

function CartToastWrapper() {
  const { toastProduct, clearToast } = useCart();
  const location = useLocation();
  useEffect(() => { clearToast(); }, [location.pathname, clearToast]);
  return <CartToast product={toastProduct} onClose={clearToast} />;
}

function MetaPixelPageTracker() {
  const location = useLocation();
  useEffect(() => {
    window.dispatchEvent(new Event('kfood:consent-changed'));
    trackPageView(window.location.href);
  }, [location.pathname, location.search]);
  return null;
}

function App() {
  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <CartProvider>
        <B2BProvider>
        <MetaPixelPageTracker />
        <ScrollToTop />
        <SiteFrame />
        </B2BProvider>
        <CookieConsent />
        <CartToastWrapper />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
