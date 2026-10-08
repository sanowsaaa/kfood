import { Suspense, useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './router';
import { CartProvider } from './contexts/CartContext';
import { useCart } from './contexts/CartContext';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';
import CartToast from './components/CartToast';
import { trackPageView } from './utils/metaPixel';
import { B2BProvider } from './contexts/B2BContext';
import './customer.css';

function SiteFrame() {
  const location = useLocation();
  const staffOrPartner = location.pathname.startsWith('/admin') || location.pathname.startsWith('/b2b');
  return <div className={staffOrPartner ? undefined : 'customer-shell customer-root'}>
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
