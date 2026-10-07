import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/utils/supabase';

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  product_name: string | null;
  is_approved: boolean;
  created_at: string;
}

type Filter = 'pending' | 'approved' | 'all';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s} className={`ri-star-fill text-base ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/login');
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchReviews();
    }
  }, [isAdmin, filter]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('is_approved', false);
    if (filter === 'approved') query = query.eq('is_approved', true);
    const { data } = await query;
    setReviews((data as Review[]) || []);
    setLoading(false);
  }, [filter]);

  const approve = async (id: string) => {
    await supabase.from('reviews').update({ is_approved: true }).eq('id', id);
    showToast('Ревюто е одобрено и ще се покаже на сайта!');
    fetchReviews();
  };

  const remove = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id);
    showToast('Ревюто е изтрито.');
    fetchReviews();
  };

  const pending = reviews.filter((r) => !r.is_approved).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Проверка на достъпа...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <i className="ri-arrow-left-line text-xl" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Управление на ревюта</h1>
            <p className="text-xs text-gray-400">Преглед и одобряване на клиентски отзиви</p>
          </div>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-semibold px-4 py-2 rounded-lg">
            <i className="ri-time-line" />
            {pending} чакат одобрение
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl border border-gray-100 p-1.5 w-fit">
          {(['pending', 'approved', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filter === f ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {f === 'pending' ? 'Чакащи' : f === 'approved' ? 'Одобрени' : 'Всички'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <i className="ri-loader-4-line animate-spin text-3xl text-emerald-500" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <i className="ri-star-line text-5xl mb-3 block" />
            <p className="font-medium">Няма ревюта в тази категория</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`bg-white rounded-xl border p-5 ${
                  review.is_approved ? 'border-emerald-100' : 'border-orange-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        {review.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{review.name}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString('bg-BG', {
                            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                      {review.is_approved ? (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                          Одобрено
                        </span>
                      ) : (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-semibold">
                          Чака одобрение
                        </span>
                      )}
                    </div>

                    {review.product_name && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <i className="ri-shopping-bag-2-line text-emerald-500" />
                        <span>{review.product_name}</span>
                      </div>
                    )}

                    <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!review.is_approved && (
                      <button
                        onClick={() => approve(review.id)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-checkbox-circle-line" />
                        Одобри
                      </button>
                    )}
                    <button
                      onClick={() => remove(review.id)}
                      className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap border border-red-100"
                    >
                      <i className="ri-delete-bin-line" />
                      Изтрий
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-xl z-50 flex items-center gap-2">
          <i className="ri-checkbox-circle-fill text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}