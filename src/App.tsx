import { Suspense, useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './router';
import { CartProvider } from './contexts/CartContext';
import { useCart } from './contexts/CartContext';
import { supabase } from './utils/supabase';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';
import CartToast from './components/CartToast';
import { trackPageView } from './utils/metaPixel';
import { B2BProvider } from './contexts/B2BContext';

function CartToastWrapper() {
  const { toastProduct, clearToast } = useCart();
  return <CartToast product={toastProduct} onClose={clearToast} />;
}

function MetaPixelPageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(window.location.href);
  }, [location.pathname, location.search]);
  return null;
}

function App() {
  useEffect(() => {
    const slugGenDone = localStorage.getItem('slugGenDone');
    if (slugGenDone) return;

    supabase.functions.invoke('generate-product-slugs', { body: {} })
      .then(({ data, error }) => {
        if (!error && data?.success) {
          localStorage.setItem('slugGenDone', '1');
          console.log('Slugs generated:', data.updated);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <CartProvider>
        <B2BProvider>
        <MetaPixelPageTracker />
        <ScrollToTop />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-white">
            <i className="ri-loader-4-line text-4xl text-amber-500 animate-spin"></i>
          </div>
        }>
          <AppRoutes />
        </Suspense>
        </B2BProvider>
        <CookieConsent />
        <CartToastWrapper />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;