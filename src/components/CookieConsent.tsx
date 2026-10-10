import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminDialog as useDialog } from '../hooks/useAdminDialog';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let consent: string | null = null;
    try { consent = localStorage.getItem('cookieConsent'); } catch { /* Still let the customer choose. */ }
    if (!consent) {
      // Малко забавяне за по-добро UX
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (showBanner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showBanner]);

  const handleAccept = () => {
    try { localStorage.setItem('cookieConsent', 'accepted'); localStorage.setItem('cookieConsentDate', new Date().toISOString()); } catch { /* Storage may be unavailable. */ }
    window.dispatchEvent(new Event('kfood:consent-changed'));
    setShowBanner(false);
  };

  const handleDecline = () => {
    try { localStorage.setItem('cookieConsent', 'declined'); localStorage.setItem('cookieConsentDate', new Date().toISOString()); } catch { /* Storage may be unavailable. */ }
    setShowBanner(false);
  };

  const dialog = useDialog(showBanner, false, handleDecline);
  if (!showBanner) return null;

  return (
    <div
      className="customer-shell"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="consent-title" tabIndex={-1} className="bg-white rounded-2xl w-full p-5 sm:p-8 max-h-[calc(100dvh-32px)] overflow-y-auto" style={{ maxWidth: '520px' }}>
        {/* Икона */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <i className="ri-shield-check-line text-3xl text-emerald-600"></i>
          </div>
        </div>

        {/* Заглавие */}
        <h2 id="consent-title" className="text-2xl font-bold text-gray-900 text-center mb-3">
          Използваме бисквитки
        </h2>

        <p className="text-gray-600 text-center text-sm leading-relaxed mb-6">
          Използваме бисквитки, за да подобрим вашето преживяване на сайта, да анализираме трафика и да запомним вашите предпочитания. Можете да приемете всички бисквитки или да откажете незадължителните.
        </p>

        {/* Видове бисквитки */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-settings-3-line text-emerald-600 text-sm"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Задължителни</p>
              <p className="text-xs text-gray-500">Необходими за работата на сайта (количка, сесия)</p>
            </div>
            <span className="ml-auto text-xs text-emerald-600 font-medium whitespace-nowrap">Винаги активни</span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-bar-chart-line text-amber-600 text-sm"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Аналитични</p>
              <p className="text-xs text-gray-500">Помагат ни да разберем как използвате сайта</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-megaphone-line text-rose-600 text-sm"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Маркетингови</p>
              <p className="text-xs text-gray-500">За персонализирани реклами и оферти</p>
            </div>
          </div>
        </div>

        {/* Бутони */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 px-5 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            Само задължителни
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-5 py-3 bg-brand-primary text-white text-sm font-bold rounded-xl hover:bg-brand-hover transition-colors whitespace-nowrap cursor-pointer"
          >
            Приемам всички
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Научете повече в нашата{' '}
          <Link to="/privacy" onClick={() => setShowBanner(false)} className="text-emerald-700 hover:underline">
            Политика за поверителност
          </Link>
        </p>
      </div>
    </div>
  );
}
