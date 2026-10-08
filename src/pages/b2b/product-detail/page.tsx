import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useB2B, type B2BProduct } from '@/contexts/B2BContext';
import { supabase } from '@/utils/supabase';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

export default function B2BProductDetailPage() {
  const { id: slugOrId } = useParams();
  const navigate = useNavigate();
  const { addToB2BCart, calculateB2BPrice, calculateCartonPrice, loading: b2bLoading, sessionLoading } = useB2B();
  const [product, setProduct] = useState<B2BProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartons, setCartons] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!slugOrId) return;
    setLoading(true);
    const numericId = parseInt(slugOrId);
    const query = supabase
      .from('products')
      .select('id, name, description, price, wholesale_price, carton_price, image, category, badge, rating, reviews, in_stock, stock, weight, volume, sku, slug, moq, moq_unit, pieces_per_carton');

    const doQuery = async () => {
      // Try by slug first (most common case)
      let { data } = await query.eq('slug', slugOrId).single();
      // Fallback to ID if slug fails and it's a valid number
      if (!data && !isNaN(numericId)) {
        const { data: idData } = await query.eq('id', numericId).single();
        data = idData;
      }
      if (data) {
        setProduct(data);
        setCartons(1);
      }
      setLoading(false);
    };
    doQuery();
  }, [slugOrId]);

  if (sessionLoading || b2bLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <B2BHeader />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <i className="ri-error-warning-line text-4xl text-gray-400 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Продуктът не е намерен</h2>
          <p className="text-gray-500 text-sm mb-4">Този продукт може да не е наличен или да е премахнат.</p>
          <Link to="/b2b/products" className="text-emerald-600 font-medium text-sm hover:underline">← Към каталога</Link>
        </div>
        <B2BFooter />
      </div>
    );
  }

  const isCarton = product.pieces_per_carton > 0;
  const cartonPrice = calculateCartonPrice(product);
  const unitPrice = calculateB2BPrice(product);
  const maxCartons = 9999;
  const minCartons = 1;
  const totalPieces = isCarton ? cartons * product.pieces_per_carton : cartons;
  const stockCartons = isCarton
    ? Math.floor((product.in_stock ? product.stock : 0) / product.pieces_per_carton)
    : 0;

  const handleAddToInquiry = () => {
    const piecesQty = isCarton ? cartons * product.pieces_per_carton : cartons;
    addToB2BCart(product, piecesQty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleGoToInquiry = () => {
    const piecesQty = isCarton ? cartons * product.pieces_per_carton : cartons;
    addToB2BCart(product, piecesQty);
    navigate('/b2b/cart');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <Link to="/b2b/products" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-6 transition-colors">
          <i className="ri-arrow-left-line"></i> Обратно към каталога
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: '1 / 1' }}>
            {!product.in_stock && (
              <div className="absolute top-3 left-3 z-10 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5">
                <i className="ri-time-line"></i> За заявка · 10–20 дни
              </div>
            )}
            <img src={product.image} alt={product.name} className="w-full h-full object-contain p-8" />
          </div>

          {/* Info */}
          <div className="space-y-5">
            {product.badge && (
              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                <i className="ri-fire-fill"></i> {product.badge}
              </span>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 font-heading">{product.name}</h1>

            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className={`${i < Math.floor(product.rating) ? 'ri-star-fill' : 'ri-star-line'} text-amber-500 text-sm`}></i>
                ))}
              </div>
              <span className="text-gray-500 text-xs">{product.rating} ({product.reviews})</span>
            </div>

            {/* Price Block */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-price-tag-3-line text-emerald-600"></i>
                <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Цени на едро · без ДДС</p>
              </div>
              <div className="space-y-2">
                {isCarton ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Цена на кашон</span>
                      <span className="text-gray-900 font-bold text-xl">€{cartonPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Единична цена (1 бр.)</span>
                      <span className="text-gray-700 font-semibold">€{unitPrice.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Цена на едро</span>
                    <span className="text-gray-900 font-bold text-xl">€{cartonPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-1 border-t border-emerald-200">
                  <i className="ri-checkbox-circle-fill text-emerald-600 text-sm mt-0.5"></i>
                  <span className="text-gray-700 text-sm font-medium">
                    {isCarton ? `Минимална поръчка: 1 кашон (${product.pieces_per_carton} бр.)` : `Минимална поръчка: ${product.moq || 1} ${product.moq_unit || 'бр.'}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Stock */}
            <div className="flex flex-wrap items-center gap-2">
              {product.in_stock ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                    <i className="ri-checkbox-circle-fill"></i> В наличност
                    {isCarton
                      ? ` (${stockCartons} кашон${stockCartons !== 1 ? 'а' : ''} / ${product.stock} бр.)`
                      : ` (${product.stock} бр.)`}
                  </span>
                  {stockCartons <= 3 && isCarton && (
                    <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-full">
                      <i className="ri-fire-fill mr-1"></i> Само {stockCartons} кашон{stockCartons !== 1 ? 'а' : ''}!
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 text-sm font-semibold">
                  <i className="ri-time-line"></i> За заявка · доставка 10–20 дни
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs space-y-2">
              <InfoRow label="Категория" value={product.category} />
              <InfoRow label="Каталожен №" value={product.sku || '—'} />
              {product.weight && <InfoRow label="Тегло" value={product.weight} />}
              {product.volume && <InfoRow label="Обем" value={product.volume} />}
              {isCarton && (
                <InfoRow label="Брой в кашон" value={`${product.pieces_per_carton} бр.`} />
              )}
              <InfoRow label="Минимална поръчка" value={isCarton ? '1 кашон' : `${product.moq || 1} ${product.moq_unit || 'бр.'}`} />
            </div>

            {/* Quantity + Add */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-gray-900 font-semibold text-sm whitespace-nowrap">
                    {isCarton ? 'Кашони:' : 'Количество:'}
                  </span>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => setCartons(Math.max(minCartons, cartons - 1))}
                      disabled={cartons <= minCartons}
                      className="px-3 md:px-4 py-2.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 cursor-pointer transition-colors text-gray-700 active:scale-95"
                    ><i className="ri-subtract-line text-base md:text-lg"></i></button>
                    <input
                      type="number"
                      value={cartons}
                      onChange={e => setCartons(Math.max(minCartons, Math.min(maxCartons, parseInt(e.target.value) || minCartons)))}
                      className="w-14 md:w-20 text-center bg-white text-gray-900 font-bold text-sm border-x border-gray-300 py-2.5 focus:outline-none"
                      min={minCartons}
                      max={maxCartons}
                    />
                    <button
                      onClick={() => setCartons(Math.min(maxCartons, cartons + 1))}
                      className="px-3 md:px-4 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors text-gray-700 active:scale-95"
                    ><i className="ri-add-line text-base md:text-lg"></i></button>
                  </div>
                </div>

                {/* Carton equivalent */}
                {isCarton && (
                  <p className="text-xs text-gray-500">
                    <i className="ri-archive-line mr-1 text-emerald-600"></i>
                    {cartons} кашон{cartons !== 1 ? 'а' : ''} = <span className="text-gray-700 font-semibold">{totalPieces} бр.</span>
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToInquiry}
                    className="flex-1 py-3.5 md:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {added ? (
                      <><i className="ri-check-line"></i> Добавено!</>
                    ) : (
                      <><i className="ri-shopping-cart-line"></i> Добави в количка</>
                    )}
                  </button>
                  <button
                    onClick={handleGoToInquiry}
                    className="flex-1 py-3.5 md:py-3 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <i className="ri-shopping-cart-line"></i> Към количката
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      <B2BFooter />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}
