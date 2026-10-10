import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  stock: number;
  slug?: string;
}

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { addToCart } = useCart();
  const modalRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open animation
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    if (product) {
      closeTimer.current = null;
      setQuantity(1);
      setAdded(false);
      setIsClosing(false);
      setSwipeOffset(0);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => setIsVisible(true));
    }
    return () => {
      document.body.style.overflow = overflow;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (previous?.isConnected) previous.focus();
    };
  }, [product]);

  // Close with animation
  const handleClose = useCallback(() => {
    if (closeTimer.current) return;
    setIsClosing(true);
    setIsVisible(false);
    closeTimer.current = setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, product]);

  // Focus trap
  useEffect(() => {
    if (!product) return;
    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    modal.addEventListener('keydown', handleTab);
    first?.focus();
    return () => modal.removeEventListener('keydown', handleTab);
  }, [product]);

  // Touch handlers for swipe to close (mobile only)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 200));
    }
  };

  const handleTouchEnd = () => {
    const diff = touchCurrentY.current - touchStartY.current;
    if (diff > 100) {
      handleClose();
    } else {
      setSwipeOffset(0);
    }
  };

  if (!product) return null;

  const handleAddToCart = () => {
    if (!product.in_stock) return;
    addToCart(
      { ...product },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const modalContent = (
    <div
      className="customer-shell fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 9999 }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        className="relative bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-2xl sm:rounded-xl overflow-y-auto overscroll-contain transition-transform duration-300 ease-out"
        style={{
          maxHeight: 'calc(100dvh - 24px)',
          transform: isClosing
            ? 'translateY(100%)'
            : isVisible
              ? `translateY(${swipeOffset > 0 ? swipeOffset : 0}px)`
              : 'translateY(100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="sticky top-3 z-10 ml-auto mr-3 mt-3 -mb-14 w-11 h-11 bg-white/90 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
          aria-label="Затвори"
        >
          <i aria-hidden="true" className="ri-close-line text-lg text-gray-600"></i>
        </button>

        {/* Drag handle - mobile only */}
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Image - left side on desktop */}
          <div className="sm:w-[45%] flex-shrink-0 bg-white relative flex items-center justify-center">
            <div className="customer-product-image customer-quick-image">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain object-center"
              />
            </div>
            {product.badge && (
              <span className="absolute top-3 left-3 bg-brand-primary text-white px-2.5 py-1 rounded-full text-xs font-bold">
                {product.badge}
              </span>
            )}
            {!product.in_stock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm">Изчерпан</span>
              </div>
            )}
          </div>

          {/* Content - right side on desktop */}
          <div className="sm:w-[55%] p-5 sm:p-6 flex flex-col">
            {/* Category tag */}
            <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider mb-2">
              {product.category}
            </span>

            {/* Title */}
            <h2 id="quick-view-title" className="customer-product-name text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-snug">
              {product.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <i aria-hidden="true"
                  key={i}
                  className={
                    i < Math.round(product.rating)
                      ? 'ri-star-fill text-amber-400 text-sm'
                      : 'ri-star-line text-gray-300 text-sm'
                  }
                ></i>
              ))}
              <span className="text-xs text-gray-500 ml-1">
                {product.rating} ({product.reviews} отзива)
              </span>
            </div>

            {/* Price */}
            <div className="mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-brand-primary">
                  €{product.price.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
              {product.description}
            </p>

            {/* Stock indicator */}
            {product.in_stock && product.stock > 0 && product.stock < 15 && (
              <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                <i aria-hidden="true" className="ri-fire-line"></i>
                <span>Само {product.stock} бр. в наличност!</span>
              </div>
            )}

            {/* Quantity + Add to cart */}
            {product.in_stock && (
              <div className="mt-auto">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      aria-label="Намали количество"
                    >
                      <i aria-hidden="true" className="ri-subtract-line text-sm text-gray-600"></i>
                    </button>
                    <span className="w-10 text-center font-semibold text-sm text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                      className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      aria-label="Увеличи количество"
                    >
                      <i aria-hidden="true" className="ri-add-line text-sm text-gray-600"></i>
                    </button>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 min-w-[140px] min-h-12 px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      added
                        ? 'bg-green-100 text-green-700'
                        : 'bg-brand-primary text-white hover:bg-brand-hover'
                    }`}
                  >
                    {added ? (
                      <>
                        <i aria-hidden="true" className="ri-check-line"></i>
                        Добавено
                      </>
                    ) : (
                      <>
                        <i aria-hidden="true" className="ri-shopping-cart-line"></i>
                        Добави в количката
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* View full page link */}
            <Link
              to={`/product/${product.slug || product.id}`}
              onClick={handleClose}
              className="text-center text-sm text-brand-primary font-medium hover:text-brand-hover flex items-center justify-center gap-1 cursor-pointer py-2 border-t border-gray-100 mt-2"
            >
              Виж пълната страница
              <i aria-hidden="true" className="ri-arrow-right-line"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
