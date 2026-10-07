import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../../utils/supabase';
import { scrollToTop } from '../../../utils/scrollToTop';

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProductModal({ onClose, onSuccess }: AddProductModalProps) {
  const categories = [
    'Корейска козметика',
    'Алкохол',
    'Нудъли и Рамен',
    'Продукти за готвене',
    'Десерти',
    'Сосове и Масла',
    'Замразени продукти',
    'Напитки',
    'Нехранителни стоки',
    'Снакс и Чай'
  ];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    price_euro: '',
    wholesale_price: '',
    carton_price: '',
    image: '',
    category: categories[0],
    badge: '',
    rating: '4.5',
    reviews: '0',
    in_stock: true,
    stock: '100',
    weight: '',
    volume: '',
    sku: '',
    cost_price: '',
    moq: '1',
    moq_unit: 'бр.',
    pieces_per_carton: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    scrollToTop();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const updatePriceEuro = (val: string) => {
    const eur = parseFloat(val) || 0;
    setFormData((f) => ({ ...f, price_euro: val, price: String(eur) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) { setError('Моля, въведете име на продукта'); return; }
    if (!formData.price || parseFloat(formData.price) <= 0) { setError('Моля, въведете валидна цена'); return; }
    if (!formData.image.trim()) { setError('Моля, въведете URL на снимка'); return; }

    setSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        price_euro: parseFloat(formData.price_euro) || 0,
        wholesale_price: parseFloat(formData.wholesale_price) || 0,
        carton_price: parseFloat(formData.carton_price) || 0,
        image: formData.image.trim(),
        category: formData.category,
        badge: formData.badge.trim() || null,
        rating: parseFloat(formData.rating) || 4.5,
        reviews: parseInt(formData.reviews) || 0,
        in_stock: formData.in_stock,
        stock: parseInt(formData.stock) || 0,
        weight: formData.weight.trim() || null,
        volume: formData.volume.trim() || null,
        sku: formData.sku.trim() || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        moq: parseInt(formData.moq) || 1,
        moq_unit: formData.moq_unit || 'бр.',
        pieces_per_carton: parseInt(formData.pieces_per_carton) || 0
      };

      const { data, error: insertError } = await supabase.from('products').insert([productData]).select();
      if (insertError) throw new Error(insertError.message);
      if (!data || data.length === 0) throw new Error('Продуктът не беше добавен');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Грешка при добавяне на продукта. Моля, опитайте отново.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col my-4">
        <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Добавяне на нов продукт</h2>
          <button onClick={onClose} type="button" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <i className="ri-error-warning-fill text-red-600 text-xl flex-shrink-0 mt-0.5"></i>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Име на продукта <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Shin Ramyun Noodle Soup" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Каталожен номер (SKU)</label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="напр. 801329" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono" />
                <p className="text-[10px] text-gray-400 mt-0.5">Задължителен за издаване на фактура</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Кратко описание на продукта..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена (€) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={formData.price_euro} onChange={(e) => updatePriceEuro(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
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
                  <input type="number" step="0.01" min="0" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Мин. B2B цена: +35% марж</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена на едро (€)</label>
                  <input type="number" step="0.01" min="0" value={formData.wholesale_price} onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена на кашон (€)</label>
                  <input type="number" step="0.01" min="0" value={formData.carton_price} onChange={(e) => setFormData({ ...formData, carton_price: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MOQ</label>
                  <input type="number" min="1" value={formData.moq} onChange={(e) => setFormData({ ...formData, moq: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Единица MOQ</label>
                  <select value={formData.moq_unit} onChange={(e) => setFormData({ ...formData, moq_unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                    <option value="бр.">бр.</option>
                    <option value="кашон">кашон</option>
                    <option value="палет">палет</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Бр. в кашон</label>
                  <input type="number" min="0" value={formData.pieces_per_carton} onChange={(e) => setFormData({ ...formData, pieces_per_carton: e.target.value })} placeholder="напр. 24" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория <span className="text-red-500">*</span></label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Етикет</label>
                <input type="text" value={formData.badge} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} placeholder="Популярно, Ново, Промо" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тегло</label>
                <input type="text" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="напр. 120г" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Обем</label>
                <input type="text" value={formData.volume} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} placeholder="напр. 350мл" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Рейтинг</label>
                <input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Отзиви</label>
                <input type="number" min="0" value={formData.reviews} onChange={(e) => setFormData({ ...formData, reviews: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL на снимка <span className="text-red-500">*</span></label>
              <input type="url" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              {formData.image && (
                <div className="mt-2">
                  <img src={formData.image} alt="Преглед" className="w-24 h-24 object-cover rounded-lg border border-gray-200" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/100?text=Invalid+URL'; }} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" id="in_stock_add" checked={formData.in_stock} onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })} className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer" />
              <label htmlFor="in_stock_add" className="text-sm font-medium text-gray-700 cursor-pointer">Продуктът е в наличност</label>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Отказ</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer">
              {saving ? <><i className="ri-loader-4-line animate-spin"></i> Добавяне...</> : <><i className="ri-add-line"></i> Добави продукт</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}