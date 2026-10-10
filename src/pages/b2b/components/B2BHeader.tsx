import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';

export default function B2BHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { company, cartItemsCount, disconnect, cartError, storageWarning } = useB2B();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !menuButtonRef.current?.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    if (mobileMenuOpen) { document.addEventListener('mousedown', handleClickOutside); document.addEventListener('keydown', handleEscape); }
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEscape); };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/b2b/dashboard', label: 'Табло', icon: 'ri-dashboard-line' },
    { to: '/b2b/products', label: 'Продукти', icon: 'ri-store-2-line' },
    { to: '/b2b/quick-order', label: 'Бързо поръчване', icon: 'ri-flashlight-line' },
    { to: '/b2b/orders', label: 'Поръчки', icon: 'ri-file-list-3-line' },
    { to: '/b2b/cart', label: 'Количка', icon: 'ri-shopping-cart-line' },
  ];

  const isActive = (path: string) => location.pathname === path || (path === '/b2b/products' && location.pathname.startsWith('/b2b/product/'));

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-200' : 'bg-white border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[56px] sm:h-[64px]">
            {/* Logo */}
            <Link
              to="/b2b/dashboard"
              className="flex items-center gap-3 cursor-pointer flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                <i className="ri-building-2-line text-white text-lg"></i>
              </div>
              <div>
                <span className="text-gray-900 font-bold text-sm sm:text-base tracking-tight">B2B Портал</span>
                {company && (
                  <span className="hidden sm:block text-emerald-700 text-xs leading-tight max-w-44 truncate">{company.company_name}</span>
                )}
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav aria-label="B2B навигация" className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                  className={`relative px-3.5 py-2 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg ${
                    isActive(link.to)
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className={`${link.icon} mr-1.5`}></i>
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-2">
              <Link
                to="/b2b/cart"
                aria-label={`Количка (${cartItemsCount})`}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
              >
                <i className="ri-shopping-cart-line text-xl"></i>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none px-1">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Link>
              <button
                onClick={disconnect}
                className="hidden sm:inline-flex items-center gap-1 text-gray-500 hover:text-red-600 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-logout-box-line"></i>
                Изход
              </button>
              <button
                ref={menuButtonRef}
                aria-label="Меню"
                aria-expanded={mobileMenuOpen}
                aria-controls="b2b-mobile-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg"
              >
                <i className={`text-xl ${mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div ref={menuRef} id="b2b-mobile-menu" className="lg:hidden border-t border-gray-200 bg-white animate-fade-up">
            <nav className="px-4 py-3 grid grid-cols-2 gap-1.5">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className={`${link.icon} text-lg`}></i>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 pb-4">
              <button
                onClick={disconnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                <i className="ri-logout-box-line text-lg"></i>
                Изход от портала
              </button>
            </div>
          </div>
        )}
      </header>
      {cartError && <p role="alert" className="mx-auto max-w-7xl px-4 py-3 bg-red-50 text-red-800 text-sm">{cartError}</p>}
      {storageWarning && <p role="status" className="mx-auto max-w-7xl px-4 py-3 bg-amber-50 text-amber-800 text-sm">{storageWarning}</p>}
    </>
  );
}
