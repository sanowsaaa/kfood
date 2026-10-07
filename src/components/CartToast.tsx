import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface CartToastProps {
  product: { name: string; image: string; price: number } | null;
  onClose: () => void;
}

export default function CartToast({ product, onClose }: CartToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (product) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {/* Green progress bar */}
        <div className="h-1 bg-emerald-600 animate-shrink-bar"></div>

        <div className="flex items-center gap-3 p-3">
          {/* Product image */}
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
            <img src={product.image} alt={product.name} className="w-full h-full object-contain object-center" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-check-line text-white text-xs"></i>
              </div>
              <span className="text-xs font-semibold text-emerald-700">Добавено в количката</span>
            </div>
            <p className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</p>
            <p className="text-xs text-gray-500">€{product.price.toFixed(2)}</p>
          </div>

          {/* CTA */}
          <Link
            to="/cart"
            onClick={onClose}
            className="flex-shrink-0 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            Към количката
          </Link>
        </div>
      </div>
    </div>
  );
}
