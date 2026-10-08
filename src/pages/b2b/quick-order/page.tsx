import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useB2B, type B2BProduct } from '@/contexts/B2BContext';
import { supabase } from '@/utils/supabase';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

export default function B2BQuickOrderPage() {
  const { calculateB2BPrice, calculateCartonPrice, cart, addToB2BCart, addCarton, updateB2BCartQty, removeFromB2BCart, cartTotal, cartItemsCount, sessionLoading } = useB2B();
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'name' | 'sku'>('name');
  const [bulkInput, setBulkInput] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, price, wholesale_price, carton_price, image, category, sku, stock, in_stock, moq, moq_unit, pieces_per_carton, slug')
      .order('category').order('name')
      .then(({ data }) => {
        if (data) setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    if (searchMode === 'sku') return p.sku?.toLowerCase().includes(q);
    return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
  }).slice(0, 15);

  const handleBulkInput = () => {
    const lines = bulkInput.trim().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const parts = line.split(/[\t,;]/).map(s => s.trim());
      const skuOrName = parts[0];
      const qty = parseInt(parts[1]) || 1;
      const product = products.find(p =>
        (p.sku && p.sku.toLowerCase() === skuOrName.toLowerCase()) ||
        p.name.toLowerCase().includes(skuOrName.toLowerCase())
      );
      if (product) {
        const piecesPerUnit = product.pieces_per_carton > 0 ? product.pieces_per_carton : 1;
        addToB2BCart(product, qty * piecesPerUnit);
      }
    });
    setBulkInput('');
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then(text => setBulkInput(text)).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery && searchMode === 'sku') {
      e.preventDefault();
      const product = products.find(p => p.sku?.toLowerCase() === searchQuery.toLowerCase());
      if (product) {
        addCarton(product, 1);
        setSearchQuery('');
        searchRef.current?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />

      <section className="bg-white border-b border-gray-200 py-6 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/b2b/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors">
            <i className="ri-arrow-left-line"></i> Обратно към таблото
          </Link>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 font-heading">Бързо поръчване</h1>
          <p className="text-gray-500 text-sm mt-1">Търсене по каталожен №, име или пастване на списък · Количеството е в кашони · Цените са без ДДС</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
                  <button onClick={() => setSearchMode('name')}
                    className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${searchMode === 'name' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    <i className="ri-search-line mr-1"></i> Име
                  </button>
                  <button onClick={() => setSearchMode('sku')}
                    className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${searchMode === 'sku' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    <i className="ri-barcode-line mr-1"></i> Кат. №
                  </button>
                </div>
                <div className="relative flex-1">
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={searchMode === 'sku' ? 'Въведи каталожен № и натисни Enter...' : 'Търси по име...'}
                    className="w-full px-4 py-3 sm:py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                      <i className="ri-close-circle-line"></i>
                    </button>
                  )}
                </div>
              </div>

              {searchQuery && filteredProducts.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredProducts.map(p => {
                    const isCarton = p.pieces_per_carton > 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 hover:bg-emerald-50/50 rounded-lg transition-colors">
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {isCarton
                              ? <>€{calculateCartonPrice(p).toFixed(2)} / кашон <span className="text-gray-400 font-normal">(€{calculateB2BPrice(p).toFixed(2)} / бр.)</span></>
                              : <>€{calculateB2BPrice(p).toFixed(2)} / бр.</>
                            }
                          </p>
                          <div className="flex items-center gap-2 text-[10px]">
                            {p.sku && <span className="text-gray-400 font-mono">{p.sku}</span>}
                            {isCarton && (
                              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                <i className="ri-archive-line"></i> кашон x{p.pieces_per_carton}
                              </span>
                            )}
                            <span className="text-gray-500">{p.category}</span>
                            {!p.in_stock && (
                              <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                <i className="ri-time-line"></i> за заявка
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">{isCarton ? 'каш.' : 'бр.'}</span>
                            <input
                              type="number"
                              min={1}
                              defaultValue={1}
                              className="w-16 px-2 py-2 sm:py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                              id={`qty-b2b-${p.id}`}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const input = document.getElementById(`qty-b2b-${p.id}`) as HTMLInputElement;
                              const val = parseInt(input?.value || '1') || 1;
                              if (isCarton) addCarton(p, val);
                              else addToB2BCart(p, val);
                            }}
                            className="px-4 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap active:scale-[0.98]"
                          >Добави</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery && filteredProducts.length === 0 && (
                <p className="text-center text-sm text-gray-400 mt-4 py-4">Няма намерени продукти</p>
              )}
            </div>

            {/* Bulk Input */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3">
                <i className="ri-file-list-3-line text-emerald-600 mr-1.5"></i>
                Пастни списък със SKU-та
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Всеки ред: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-emerald-700 text-[10px]">SKU[таб/запетая]кашони</code>
              </p>
              <textarea
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                rows={5}
                placeholder={`KR-001\t10\nKR-002\t5\nSamyang Ramen\t3`}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-mono placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={handleBulkInput} disabled={!bulkInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:cursor-not-allowed">
                  <i className="ri-play-list-add-line mr-1"></i> Обработи
                </button>
                <button onClick={handlePaste}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold cursor-pointer">
                  <i className="ri-clipboard-line mr-1"></i> От клипборд
                </button>
                <button onClick={() => setBulkInput('')} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer">Изчисти</button>
              </div>
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl sticky top-24">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <i className="ri-shopping-cart-line text-emerald-600"></i>
                  Количка ({cartItemsCount})
                </h3>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="ri-mail-send-line text-3xl text-gray-300 mb-3"></i>
                  <p className="text-gray-500 text-sm">Няма добавени продукти</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                    {cart.map(item => {
                      const isCarton = item.product.pieces_per_carton > 0;
                      const cartons = isCarton ? Math.round(item.quantity / item.product.pieces_per_carton) : item.quantity;
                      const step = isCarton ? item.product.pieces_per_carton : 1;
                      return (
                        <div key={item.product.id} className="px-4 py-3 flex items-center gap-2.5">
                          <img src={item.product.image} alt={item.product.name} className="w-9 h-9 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-900 truncate">{item.product.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {isCarton ? `${cartons} кашон${cartons !== 1 ? 'а' : ''} × ${item.product.pieces_per_carton} бр.` : `${item.quantity} бр.`}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <button onClick={() => updateB2BCartQty(item.product.id, item.quantity - step)}
                                className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 cursor-pointer">−</button>
                              <input
                                type="number"
                                value={isCarton ? cartons : item.quantity}
                                onChange={e => updateB2BCartQty(item.product.id, (parseInt(e.target.value) || 1) * step)}
                                className="w-10 text-center bg-white text-xs text-gray-900 border border-gray-300 rounded py-0.5 focus:outline-none"
                                min={1}
                              />
                              <button onClick={() => updateB2BCartQty(item.product.id, item.quantity + step)}
                                className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 cursor-pointer">+</button>
                            </div>
                          </div>
                          <button onClick={() => removeFromB2BCart(item.product.id)}
                            className="text-gray-400 hover:text-red-500 text-[10px] cursor-pointer">
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">Общо</span>
                      <span className="text-base font-bold text-emerald-600">{cartItemsCount}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">Междинен сбор</span>
                      <span className="text-sm font-bold text-gray-900">€{cartTotal.toFixed(2)}</span>
                    </div>
                    <Link
                      to="/b2b/cart"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="ri-shopping-cart-line"></i>
                      Към количката
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <B2BFooter />
    </div>
  );
}
