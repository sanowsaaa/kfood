import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

export default function B2BCartPage() {
  const navigate = useNavigate();
  const { cart, cartItemsCount, cartTotal, updateB2BCartQty, removeFromB2BCart, clearB2BCart, calculateB2BPrice, calculateCartonPrice, company, sessionLoading } = useB2B();
  const [notes, setNotes] = useState('');

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <B2BHeader />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-shopping-cart-line text-3xl text-gray-400"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Количката е празна</h2>
          <p className="text-gray-500 text-sm mb-6">Добавете продукти от каталога, за да изпратите поръчка</p>
          <Link to="/b2b/products"
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all cursor-pointer">
            <i className="ri-store-2-line"></i>
            Към каталога
          </Link>
        </div>
        <B2BFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />

      <section className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-extrabold text-gray-900 font-heading">Количка</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
            <p className="text-gray-500 text-sm">{cartItemsCount} артикула · {company?.company_name}</p>
            <span className="hidden sm:block text-gray-300">·</span>
            <p className="text-emerald-600/80 text-xs flex items-center gap-1">
              <i className="ri-archive-line"></i>
              Минимална поръчка: 1 кашон на продукт
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-3 mb-6">
          {cart.map(item => {
            const isCarton = item.product.pieces_per_carton > 0;
            const step = isCarton ? item.product.pieces_per_carton : 1;
            const cartons = isCarton ? Math.round(item.quantity / step) : item.quantity;
            const cartonPrice = calculateCartonPrice(item.product);
            return (
              <div key={item.product.id} className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                <Link to={`/b2b/product/${item.product.slug || item.product.id}`} className="flex-shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain bg-gray-50" />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/b2b/product/${item.product.slug || item.product.id}`}>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-emerald-700 transition-colors">{item.product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.product.sku && <span className="text-[10px] text-gray-400 font-mono">{item.product.sku}</span>}
                    {isCarton && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <i className="ri-archive-line mr-0.5"></i>
                        {cartons} кашон{cartons !== 1 ? 'а' : ''} × {item.product.pieces_per_carton} бр.
                      </span>
                    )}
                    {!isCarton && (
                      <span className="text-[10px] text-gray-500">{item.quantity} бр.</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-emerald-600 font-bold text-sm">€{(calculateB2BPrice(item.product) * item.quantity).toFixed(2)}</span>
                    {isCarton ? (
                      <span className="text-gray-400 text-[10px]">€{cartonPrice.toFixed(2)} / кашон</span>
                    ) : (
                      <span className="text-gray-400 text-[10px]">€{calculateB2BPrice(item.product).toFixed(2)} / бр.</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start mt-1 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateB2BCartQty(item.product.id, item.quantity - step)}
                      disabled={item.quantity <= step}
                      className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 flex items-center justify-center text-sm cursor-pointer transition-colors active:scale-95">−</button>
                    <div className="text-center">
                      <input
                        type="number"
                        value={isCarton ? cartons : item.quantity}
                        onChange={e => updateB2BCartQty(item.product.id, (parseInt(e.target.value) || 1) * step)}
                        className="w-16 sm:w-14 text-center bg-white text-gray-900 font-bold text-sm border border-gray-300 rounded-lg py-2 sm:py-1.5 focus:outline-none focus:border-emerald-500/60"
                        min={1}
                      />
                      <p className="text-[9px] text-gray-400 mt-0.5">{isCarton ? 'кашони' : 'бр.'}</p>
                    </div>
                    <button
                      onClick={() => updateB2BCartQty(item.product.id, item.quantity + step)}
                      className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-sm cursor-pointer transition-colors active:scale-95">+</button>
                  </div>

                  <button
                    onClick={() => removeFromB2BCart(item.product.id)}
                    className="text-gray-400 hover:text-red-500 text-base sm:text-sm cursor-pointer transition-colors flex-shrink-0 ml-0 sm:ml-2"
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={clearB2BCart} className="text-gray-400 hover:text-red-500 text-xs cursor-pointer transition-colors inline-flex items-center gap-1">
            <i className="ri-delete-bin-line"></i> Изчисти всички
          </button>
        </div>

        {/* Notes + Submit */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">
            <i className="ri-chat-3-line text-emerald-600 mr-1.5"></i>
            Допълнителна информация
          </h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Специални изисквания, срокове за доставка, въпроси относно продуктите..."
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
            <span className="text-gray-500 text-sm">Междинен сбор</span>
            <span className="text-gray-900 font-bold text-lg">€{cartTotal.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Всички цени са без ДДС · Окончателната сума се потвърждава в офертата</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Link
              to="/b2b/products"
              className="flex-1 py-3.5 sm:py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <i className="ri-store-2-line"></i>
              Добави още продукти
            </Link>
            <button
              onClick={() => {
                sessionStorage.setItem('b2b_order_notes', notes);
                navigate('/b2b/checkout');
              }}
              className="flex-1 py-3.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <i className="ri-check-line"></i>
              Продължи към поръчка
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4 flex items-center justify-center gap-1.5">
            <i className="ri-information-line"></i>
            Ще получите потвърждение на посочения имейл
          </p>
        </div>
      </main>

      <B2BFooter />
    </div>
  );
}