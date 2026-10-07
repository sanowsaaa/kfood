import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { scrollToTop } from '@/utils/scrollToTop';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  price_euro: number;
  wholesale_price: number;
  carton_price: number;
  image: string;
  category: string;
  badge: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  stock: number;
  weight: string | null;
  volume: string | null;
  sku: string | null;
  cost_price: number;
  moq: number;
  moq_unit: string;
  pieces_per_carton: number;
}

interface ProductEditModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductEditModal({ product, onClose, onSuccess }: ProductEditModalProps) {
  const [formData, setFormData] = useState(() => ({
    ...product,
    price_euro: product.price || 0,
    cost_price: product.cost_price || 0,
    wholesale_price: product.wholesale_price || 0,
    carton_price: product.carton_price || 0,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    scrollToTop();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const updatePriceEuro = (val: string) => {
    const eur = parseFloat(val) || 0;
    setFormData((f) => ({ ...f, price_euro: eur, price: eur }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('products').update({
        name: formData.name,
        description: formData.description,
        price: formData.price,
        price_euro: formData.price_euro,
        wholesale_price: formData.wholesale_price || 0,
        carton_price: formData.carton_price || 0,
        image: formData.image,
        category: formData.category,
        badge: formData.badge,
        rating: formData.rating,
        reviews: formData.reviews,
        in_stock: formData.in_stock,
        stock: formData.stock,
        weight: formData.weight || null,
        volume: formData.volume || null,
        sku: formData.sku || null,
        cost_price: formData.cost_price || 0,
        moq: formData.moq || 1,
        moq_unit: formData.moq_unit || 'бр.',
        pieces_per_carton: formData.pieces_per_carton || 0,
        visibility: (formData as any).visibility || 'retail',
        updated_at: new Date().toISOString()
      }).eq('id', product.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch {
      alert('Грешка при запазване на промените');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col my-4">
        <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Редактиране на продукт</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Име на продукта <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Каталожен номер (SKU)</label>
                <input type="text" value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="напр. 801329" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono" />
                <p className="text-[10px] text-gray-400 mt-0.5">Задължителен за издаване на фактура</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена (€) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={formData.price_euro || ''} onChange={(e) => updatePriceEuro(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>

            {/* B2B Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <i className="ri-briefcase-line text-teal-600"></i>
                B2B / Цени на едро
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Доставна цена (€) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0" value={formData.cost_price || ''} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Мин. B2B цена: +35% марж</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена на едро (€)</label>
                  <input type="number" step="0.01" min="0" value={formData.wholesale_price || ''} onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена на кашон (€)</label>
                  <input type="number" step="0.01" min="0" value={formData.carton_price || ''} onChange={(e) => setFormData({ ...formData, carton_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MOQ</label>
                  <input type="number" min="1" value={formData.moq || 1} onChange={(e) => setFormData({ ...formData, moq: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Единица MOQ</label>
                  <select value={formData.moq_unit || 'бр.'} onChange={(e) => setFormData({ ...formData, moq_unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                    <option value="бр.">бр.</option>
                    <option value="кашон">кашон</option>
                    <option value="палет">палет</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Бр. в кашон</label>
                  <input type="number" min="0" value={formData.pieces_per_carton || ''} onChange={(e) => setFormData({ ...formData, pieces_per_carton: parseInt(e.target.value) || 0 })} placeholder="напр. 24" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Видимост</label>
                <select value={(formData as any).visibility || 'retail'} onChange={(e) => setFormData({ ...formData, visibility: e.target.value } as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                  <option value="retail">Retail (на дребно)</option>
                  <option value="wholesale">Wholesale (на едро)</option>
                  <option value="restaurant">Restaurant (ресторанти)</option>
                  <option value="distributor">Distributor (дистрибутори)</option>
                  <option value="vip">VIP (вип партньори)</option>
                  <option value="hidden">Hidden (скрит)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Определя в кои канали продуктът е видим. Hidden = само админ.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория <span className="text-red-500">*</span></label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                  <option value="Корейска козметика">Корейска козметика</option>
                  <option value="Алкохол">Алкохол</option>
                  <option value="Нудъли и Рамен">Нудъли и Рамен</option>
                  <option value="Продукти за готвене">Продукти за готвене</option>
                  <option value="Десерти">Десерти</option>
                  <option value="Сосове и Масла">Сосове и Масла</option>
                  <option value="Замразени продукти">Замразени продукти</option>
                  <option value="Напитки">Напитки</option>
                  <option value="Нехранителни стоки">Нехранителни стоки</option>
                  <option value="Снакс и Чай">Снакс и Чай</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Етикет</label>
                <input type="text" value={formData.badge} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} placeholder="Популярно, Ново, Промо..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тегло</label>
                <input type="text" value={formData.weight || ''} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="напр. 100г" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Обем</label>
                <input type="text" value={formData.volume || ''} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} placeholder="напр. 350мл" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Рейтинг</label>
                <input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Отзиви</label>
                <input type="number" value={formData.reviews} onChange={(e) => setFormData({ ...formData, reviews: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL на снимка <span className="text-red-500">*</span></label>
              <input type="url" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" id="in_stock" checked={formData.in_stock} onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })} className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer" />
              <label htmlFor="in_stock" className="text-sm font-medium text-gray-700 cursor-pointer">Продуктът е в наличност</label>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Отказ</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer">
              {saving ? 'Запазване...' : 'Запази промените'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}