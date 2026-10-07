import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/utils/supabase';
import QRCodeDisplay from './components/QRCodeDisplay';
import { useSEO } from '@/utils/seo';

type Step = 'form' | 'success';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="w-10 h-10 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
          aria-label={`${star} звезди`}
        >
          <i
            className={`ri-star-fill text-3xl transition-colors ${
              star <= (hovered || value) ? 'text-yellow-400' : 'text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Много лошо',
  2: 'Лошо',
  3: 'Средно',
  4: 'Добро',
  5: 'Отлично!',
};

export default function LeaveReviewPage() {
  const [step, setStep] = useState<Step>('form');
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [productName, setProductName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useSEO({
    title: 'Остави Ревю | K-FOOD Велико Търново - Корейска Храна',
    description: 'Оставете ревю за продуктите на K-FOOD. Споделете вашето мнение за корейската храна и помогнете на други клиенти.',
    keywords: 'ревю K-FOOD, отзив корейска храна, мнение продукти, K-FOOD ревюта',
    canonical: '/leave-review',
    ogType: 'website',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Моля, избери оценка от 1 до 5 звезди.');
      return;
    }
    if (!name.trim() || !text.trim()) {
      setError('Моля, попълни всички задължителни полета.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { error: dbError } = await supabase.from('reviews').insert({
        name: name.trim(),
        rating,
        text: text.trim(),
        product_name: productName.trim() || null,
      });
      if (dbError) throw dbError;
      setStep('success');
    } catch {
      setError('Нещо се обърка. Опитай пак след малко.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex flex-col">
      {/* Top bar */}
      <div className="w-full py-4 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img
            src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp"
            alt="K-FOOD"
            className="h-10 w-auto object-contain"
          />
        </Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer flex items-center gap-1">
          <i className="ri-arrow-left-line" />
          Към магазина
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {step === 'form' ? (
          <div className="w-full max-w-lg">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <i className="ri-star-smile-line text-4xl text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Остави ревю</h1>
              <p className="text-gray-500 text-base">
                Твоето мнение ни помага да ставаме по-добри.<br />
                Отнема само 1 минута!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Обща оценка <span className="text-red-400">*</span>
                </label>
                <StarPicker value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="mt-2 text-sm font-medium text-emerald-600 animate-pulse">
                    {RATING_LABELS[rating]}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Твоето име <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="reviewer-name"
                  name="reviewer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="напр. Мария Иванова"
                  maxLength={80}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Product */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Продукт (по избор)
                </label>
                <input
                  type="text"
                  id="product-name"
                  name="product-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="напр. Samyang Buldak 2x Spicy"
                  maxLength={120}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Твоят отзив <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  placeholder="Разкажи ни за опита си с продукта или магазина..."
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
                <div className="text-right text-xs text-gray-400 mt-1">{text.length}/500</div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  <i className="ri-error-warning-line" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition-colors text-base cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin" />
                    Изпращане...
                  </span>
                ) : (
                  'Изпрати ревюто'
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Ревютата се преглеждат от нас преди публикуване.
              </p>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-lg text-center">
            <div className="bg-white rounded-2xl p-10 border border-gray-100">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="ri-checkbox-circle-line text-5xl text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Благодарим ти!</h2>
              <p className="text-gray-500 mb-2">
                Твоето ревю беше изпратено успешно и ще бъде публикувано след преглед.
              </p>
              <div className="flex gap-1 justify-center my-5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <i key={s} className={`ri-star-fill text-2xl ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <blockquote className="text-gray-600 italic mb-8 bg-gray-50 rounded-lg px-5 py-4 text-sm">
                &ldquo;{text}&rdquo;
              </blockquote>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-home-4-line" />
                Към начало
              </Link>
            </div>

            {/* Gentle ask for Google Review */}
            <div className="mt-6 bg-white rounded-xl border border-yellow-100 p-5 text-left flex items-start gap-4">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <i className="ri-google-fill text-2xl text-yellow-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm mb-1">Хареса ли ти? Остави ни ревю и в Google!</p>
                <p className="text-xs text-gray-500 mb-3">Помага ни да достигнем до повече хора, търсещи корейска храна.</p>
                <a
                  href="https://search.google.com/local/writereview?placeid=ChIJy4WT0pjxqkAR6DtMdNKb19E"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-star-fill" />
                  Оцени ни в Google
                </a>
              </div>
            </div>
          </div>
        )}

        {/* QR Code section */}
        <div className="mt-12 w-full max-w-lg">
          <QRCodeDisplay />
        </div>
      </div>
    </div>
  );
}
