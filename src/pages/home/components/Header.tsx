import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!isMenuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setIsMenuOpen(false); document.getElementById('customer-menu-toggle')?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isMenuOpen]);

  const navLinks = [
    { to: '/', label: 'Начало', icon: 'ri-home-4-line', activeIcon: 'ri-home-4-fill' },
    { to: '/products', label: 'Продукти', icon: 'ri-store-2-line', activeIcon: 'ri-store-2-fill' },
    { to: '/categories', label: 'Категории', icon: 'ri-grid-line', activeIcon: 'ri-grid-fill' },
    { to: '/b2b', label: 'B2B', icon: 'ri-building-2-line', activeIcon: 'ri-building-2-fill' },
    { to: '/blog', label: 'Блог', icon: 'ri-article-line', activeIcon: 'ri-article-fill' },
    { to: '/about', label: 'За нас', icon: 'ri-information-line', activeIcon: 'ri-information-fill' },
  ];

  const bottomNavLinks = [
    { to: '/', label: 'Начало', icon: 'ri-home-4-line', activeIcon: 'ri-home-4-fill' },
    { to: '/products', label: 'Продукти', icon: 'ri-store-2-line', activeIcon: 'ri-store-2-fill' },
    { to: '/categories', label: 'Категории', icon: 'ri-grid-line', activeIcon: 'ri-grid-fill' },
    { to: '/cart', label: 'Количка', icon: 'ri-shopping-cart-line', activeIcon: 'ri-shopping-cart-fill' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Announcement Bar - compact on mobile */}
      <div className="bg-brand-primary text-white text-center py-1.5 sm:py-2 md:py-2.5 text-[11px] md:text-[13px] font-medium tracking-wide overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-center gap-2 animate-pulse-slow">
          <i aria-hidden="true" className="ri-percent-line text-sm md:text-base"></i>
          <span>Намаление 5% за поръчки над 50€</span>
          <span className="hidden sm:inline text-white/70">|</span>
          <span className="hidden sm:inline">Намаление 10% за поръчки над 100€</span>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`brand-header sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/[0.98] backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
            : 'bg-white'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="flex items-center justify-between h-[56px] sm:h-[64px] md:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center cursor-pointer flex-shrink-0">
              <img
                src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp"
                alt="K-FOOD"
                className="h-8 sm:h-9 md:h-11 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav aria-label="Основна навигация" className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                  className={`relative px-3.5 py-2 text-[13px] font-medium tracking-wide transition-colors whitespace-nowrap rounded-lg ${
                    isActive(link.to)
                      ? 'text-brand-primary bg-brand-blush'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              <a
                href="tel:+359899897566"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-brand-primary transition-colors whitespace-nowrap rounded-lg hover:bg-gray-50"
              >
                <i aria-hidden="true" className="ri-phone-line text-base"></i>
                <span className="hidden xl:inline">0899 897 566</span>
              </a>

              <Link
                to="/cart"
                className="relative p-2 sm:p-2.5 text-gray-700 hover:text-brand-primary transition-colors rounded-lg hover:bg-brand-blush touch-target-sm"
                aria-label="Количка"
              >
                <i aria-hidden="true" className="ri-shopping-cart-2-line text-xl"></i>
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center leading-none px-1 shadow-sm">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>

              <button
                id="customer-menu-toggle"
                type="button"
                aria-expanded={isMenuOpen}
                aria-controls="customer-menu"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2.5 text-gray-700 hover:text-brand-primary transition-colors rounded-lg touch-target-sm"
                aria-label="Меню"
              >
                <i aria-hidden="true" className={`text-xl ${isMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Red accent line */}
        <div className="h-[2px] bg-gradient-to-r from-brand-primary via-brand-primary to-brand-primary"></div>

        {/* Mobile Dropdown */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-up">
            <nav id="customer-menu" aria-label="Мобилно меню" className="px-4 py-3 sm:py-4 grid grid-cols-2 gap-1.5">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 sm:px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
                    isActive(link.to)
                      ? 'text-brand-primary bg-brand-blush'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i aria-hidden="true" className={`${isActive(link.to) ? link.activeIcon : link.icon} text-lg`}></i>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 pb-3 sm:pb-4">
              <a
                href="tel:+359899897566"
                className="flex items-center gap-2.5 px-3 sm:px-4 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-brand-blush hover:text-brand-primary transition-all w-full touch-target"
              >
                <i aria-hidden="true" className="ri-phone-line text-lg"></i>
                0899 897 566
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation - better safe area handling */}
      <nav aria-label="Бърза навигация" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/[0.98] backdrop-blur-md border-t border-gray-100 safe-area-bottom">
        <div className="grid grid-cols-4 h-[60px]">
          {bottomNavLinks.map(link => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative touch-target ${
                  active ? 'text-brand-primary' : 'text-gray-400'
                }`}
              >
                {link.to === '/cart' && totalItems > 0 && (
                  <span className="absolute top-1 right-[calc(50%-16px)] sm:right-[calc(50%-18px)] bg-brand-primary text-white text-[9px] sm:text-[10px] font-bold rounded-full min-w-[15px] h-[15px] sm:min-w-[16px] sm:h-[16px] flex items-center justify-center leading-none px-1">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
                <div className="w-5 h-5 flex items-center justify-center">
                  <i aria-hidden="true" className={`${active ? link.activeIcon : link.icon} text-base sm:text-lg`}></i>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </>
  );
}
