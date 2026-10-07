import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import { supabase } from '../../../utils/supabase';

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

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedProducts, setAddedProducts] = useState<Set<number>>(new Set());
  const { addToCart } = useCart();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('rating', { ascending: false })
        .limit(8);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Грешка при зареждане на продуктите:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });

    setAddedProducts(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 2000);
  };

  if (loading) {
    return (
      <section className="py-10 md:py-16 lg:py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-shimmer rounded-lg">
                <div className="aspect-square sm:aspect-[3/4] bg-gray-100 rounded-lg"></div>
                <div className="p-3 md:p-4 space-y-2">
                  <div className="h-3.5 md:h-4 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16 lg:py-24 bg-white section-below-fold">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 md:mb-10 lg:mb-14">
          <div>
            <p className="text-[11px] sm:text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-red-500 mb-2 md:mb-3">
              Селекция
            </p>
            <h2 className="font-heading text-xl sm:text-2xl md:text-4xl font-light text-gray-900 tracking-tight">
              Топ продукти
            </h2>
          </div>
          <Link
            to="/products"
            className="text-xs sm:text-[13px] font-medium text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap flex items-center gap-1.5 tracking-wide uppercase"
          >
            Виж всички
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>

        {/* Grid - better mobile: 2 cols with larger cards, bigger gap on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5" data-product-shop>
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="bg-white group cursor-pointer contain-layout rounded-xl border border-gray-100 hover:border-red-200 transition-all duration-300 overflow-hidden"
            >
              {/* Image - square on mobile for bigger touch area, 3/4 on desktop */}
              <Link to={`/product/${product.slug || product.id}`} className="block relative overflow-hidden bg-white flex items-center justify-center" style={{ aspectRatio: '3 / 4' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  loading={idx < 4 ? 'eager' : 'lazy'}
                  className="w-full h-full object-contain object-center group-hover:scale-[1.04] transition-transform duration-500"
                />
                {product.badge && (
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider shadow-sm whitespace-nowrap">
                    {product.badge}
                  </span>
                )}
                {!product.in_stock && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-gray-900 px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap">
                      Изчерпан
                    </span>
                  </div>
                )}
              </Link>

              {/* Content - tighter on mobile */}
              <div className="p-3 sm:p-4 md:p-5">
                <Link to={`/product/${product.slug || product.id}`}>
                  <h3 className="text-xs sm:text-sm md:text-[15px] font-semibold text-gray-900 mb-1 sm:mb-1.5 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-1 mb-2 sm:mb-3">
                  <i className="ri-star-fill text-amber-500 text-[10px] sm:text-[11px]"></i>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">{product.rating}</span>
                  <span className="text-[10px] text-gray-400">({product.reviews})</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">
                      €{product.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Bigger touch target button on mobile */}
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={!product.in_stock}
                    className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg transition-all flex-shrink-0 touch-target-sm ${
                      product.in_stock
                        ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-sm shadow-red-200 cursor-pointer'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                    aria-label="Добави в количката"
                  >
                    {addedProducts.has(product.id) ? (
                      <i className="ri-check-line text-xs sm:text-sm"></i>
                    ) : (
                      <i className="ri-add-line text-base sm:text-lg"></i>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 border-2 border-red-600 text-red-600 text-sm font-bold tracking-wide uppercase hover:bg-red-600 hover:text-white transition-all whitespace-nowrap cursor-pointer rounded-xl touch-target"
          >
            Виж всички продукти
            <i className="ri-arrow-right-line text-lg"></i>
          </Link>
        </div>
      </div>
    </section>
  );
}