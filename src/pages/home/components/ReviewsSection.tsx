import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/utils/supabase';

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  product_name: string | null;
  created_at: string;
}

const STATIC_REVIEWS: Review[] = [
  { id: 's1', name: 'Ava Klein', rating: 5, text: 'Really nice store with many interesting foods to try. There is the option of trying instant ramen directly in the shop and eating them on the balcony with a beautiful view! They also carry basics like gochujang.', product_name: null, created_at: '2024-09-01T00:00:00Z' },
  { id: 's2', name: 'Andrei Serghie', rating: 5, text: 'Nice place where you can find Korean food, like noodles, sauces and so on.', product_name: null, created_at: '2024-11-01T00:00:00Z' },
  { id: 's3', name: 'Jordan Georgiev', rating: 5, text: 'Доста добре зареден магазин с азиатска храна.', product_name: null, created_at: '2024-01-10T00:00:00Z' },
  { id: 's4', name: 'Simeon Olev', rating: 5, text: 'Най-готиният персонал! Магазинът е страхотен — голям избор от корейски продукти и много приятна атмосфера.', product_name: null, created_at: '2025-01-15T00:00:00Z' },
  { id: 's5', name: 'Amal Vilpe', rating: 5, text: '쉽게 찾아볼 수 없는 한국 및 아시아 음식들이 많은 한인마트!', product_name: null, created_at: '2024-04-10T00:00:00Z' },
  { id: 's6', name: 'Денис Денис', rating: 4, text: 'Има добра храна, изключителна, произведена в Корея. Добра селекция от автентични продукти.', product_name: null, created_at: '2024-03-05T00:00:00Z' },
];

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('');
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} className={`text-xs ${star <= rating ? 'ri-star-fill text-amber-500' : 'ri-star-fill text-gray-200'}`} />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'днес';
  if (days < 30) return `преди ${days} дни`;
  const months = Math.floor(days / 30);
  if (months < 12) return `преди ${months} месеца`;
  return `преди ${Math.floor(months / 12)} год.`;
}

export default function ReviewsSection() {
  const [dbReviews, setDbReviews] = useState<Review[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    supabase
      .from('reviews')
      .select('id, name, rating, text, product_name, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data && data.length > 0) setDbReviews(data as Review[]);
      });
  }, []);

  const all = [...dbReviews, ...STATIC_REVIEWS];
  const visibleCount = 3;
  const pages = Math.max(1, all.length - visibleCount + 1);
  const visible = all.slice(activeIndex, activeIndex + visibleCount);
  const totalRating = all.reduce((s, r) => s + r.rating, 0);
  const avgRating = all.length > 0 ? (totalRating / all.length).toFixed(1) : '5.0';

  return (
    <section className="py-16 md:py-24 bg-gray-50/80 section-below-fold" aria-label="Отзиви от клиенти">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-6">
          <div>
            <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-red-500 mb-3">Отзиви</p>
            <h2 className="font-heading text-2xl md:text-4xl font-light text-gray-900 tracking-tight">Какво казват клиентите</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-heading font-bold text-red-600">{avgRating}</div>
              <div className="flex gap-0.5 justify-end mb-0.5">
                {[1,2,3,4,5].map(s => <i key={s} className="ri-star-fill text-amber-500 text-[10px]"></i>)}
              </div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">{all.length}+ отзива</div>
            </div>
            <Link
              to="/leave-review"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-red-700 transition-all whitespace-nowrap cursor-pointer rounded-lg"
            >
              <i className="ri-star-line text-sm" />
              Остави ревю
            </Link>
          </div>
        </div>

        {/* Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-8">
          {visible.map((review) => (
            <article key={review.id} className="bg-white rounded-xl border border-gray-100 p-6 md:p-7 flex flex-col gap-4 hover:border-red-100 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {getInitials(review.name)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{review.name}</div>
                  <div className="text-[11px] text-gray-400 font-light">{timeAgo(review.created_at)}</div>
                </div>
              </div>
              <StarRating rating={review.rating} />
              <p className="text-sm text-gray-600 leading-relaxed font-light line-clamp-5">
                &ldquo;{review.text}&rdquo;
              </p>
            </article>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex justify-center gap-3 mb-8">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-[3px] rounded-full transition-all cursor-pointer ${
                  activeIndex === i ? 'bg-red-600 w-8' : 'bg-gray-300 w-3 hover:bg-gray-400'
                }`}
                aria-label={`Страница ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="text-center">
          <a
            href="https://www.google.com/search?q=K-FOOD+Велико+Търново+отзиви"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-red-600 transition-colors cursor-pointer tracking-wide uppercase"
          >
            <i className="ri-google-line text-sm" />
            Виж всички отзиви в Google
          </a>
        </div>
      </div>
    </section>
  );
}