import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useState } from 'react';

export default function RecentlyViewed() {
  const { recentProducts } = useRecentlyViewed();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  if (recentProducts.length === 0) return null;

  const handleAddToCart = (e: React.MouseEvent, product: typeof recentProducts[0]) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock) return;
    if (product.category === 'Алкохол') {
      let verified = false;
      try { verified = sessionStorage.getItem('ageVerified') === 'true'; } catch { /* Keep the existing age gate. */ }
      if (!verified) { navigate(`/product/${product.slug || product.id}`); return; }
    }
    addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category, slug: product.slug, in_stock: product.in_stock });
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  return (
    <section className="py-10 md:py-16 bg-white section-below-fold">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="flex items-end justify-between mb-7 md:mb-9">
          <div>
            <p className="text-[10px] md:text-xs font-medium tracking-[0.2em] uppercase text-brand-primary mb-2">История</p>
            <h2 className="font-heading text-lg md:text-2xl font-light text-gray-900 tracking-tight flex items-center gap-2">
              <i aria-hidden="true" className="ri-history-line text-brand-primary text-xl"></i>
              Последно разгледани
            </h2>
          </div>
          <Link to="/products" className="text-[11px] font-semibold text-gray-500 hover:text-brand-primary transition-colors whitespace-nowrap uppercase tracking-wider">
            Всички <i aria-hidden="true" className="ri-arrow-right-line"></i>
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible md:pb-0 md:mx-0 md:px-0 scrollbar-hide" data-product-shop>
          {recentProducts.slice(0, 6).map(product => (
            <div key={product.id} className="customer-product-card flex-shrink-0 w-44 sm:w-48 md:w-auto snap-start group rounded-xl overflow-hidden">
              <Link to={`/product/${product.slug || product.id}`} className="customer-product-image">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="transition-transform duration-300"
                />
                {!product.in_stock && (
                  <div className="customer-product-unavailable absolute inset-0 flex items-center justify-center">
                    <span className="bg-white text-gray-900 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">Изчерпан</span>
                  </div>
                )}
              </Link>
              <div className="customer-product-body p-3">
                <Link to={`/product/${product.slug || product.id}`}>
                  <h3 className="customer-product-name font-semibold text-gray-900 mb-2 group-hover:text-brand-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <div className="customer-product-actions flex items-center justify-between gap-2">
                  <div className="customer-product-price font-bold text-brand-hover">€{product.price.toFixed(2)}</div>
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={!product.in_stock}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                      product.in_stock ? 'bg-brand-primary text-white hover:bg-brand-hover active:scale-90 shadow-sm cursor-pointer' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                    aria-label="Добави в количката"
                  >
                    {addedIds.has(product.id) ? <i aria-hidden="true" className="ri-check-line text-[11px]"></i> : <i aria-hidden="true" className="ri-add-line text-[11px]"></i>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
