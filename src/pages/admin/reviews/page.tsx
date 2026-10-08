import { useAdminAction } from '@/hooks/useAdminAction';
import { useAdminRead } from '@/hooks/useAdminRead';
import { checkedData, confirmedRecord } from '@/utils/admin';
import AdminFeedback from '@/pages/admin/components/AdminFeedback';
import AdminHeader from '../components/AdminHeader';
import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminAccess from '@/pages/admin/components/AdminAccess';
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
        <i aria-hidden="true" key={s} className={`ri-star-fill text-base ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { isAdmin, loading: authLoading, error: authError, retry: retryAuth } = useAdminAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const { loading, error: loadError, load } = useAdminRead();
  const action = useAdminAction();

  useEffect(() => {
    if (isAdmin) {
      fetchReviews();
    }
  }, [isAdmin, filter]);

  const fetchReviews = useCallback(() => load(async () => {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('is_approved', false);
    if (filter === 'approved') query = query.eq('is_approved', true);
    return checkedData(await query) as Review[];
  }, setReviews), [filter, load]);

  const approve = (id: string) => action.run(`approve:${id}`, async () => {
    confirmedRecord(await supabase.from('reviews').update({ is_approved: true }).eq('id', id).select('id').single(), id);
    await fetchReviews();
  }, 'Ревюто е одобрено.');

  const remove = async (id: string) => {
    if (action.pending || !confirm('Сигурни ли сте, че искате да изтриете това ревю?')) return;
    await action.run(`delete:${id}`, async () => {
      confirmedRecord(await supabase.from('reviews').delete().eq('id', id).select('id').single(), id);
      await fetchReviews();
    }, 'Ревюто е изтрито.');
  };

  const pending = reviews.filter((r) => !r.is_approved).length;

  if (authLoading || authError) return <AdminAccess error={authError} onRetry={retryAuth} />;

  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="admin-page min-h-screen bg-gray-50">
      <AdminHeader />
      <main id="admin-content" tabIndex={-1} className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-bold text-slate-900">Управление на ревюта</h1><p className="mt-1 text-sm text-slate-500">Преглед и одобряване на клиентски отзиви</p></div>
          {!loading && !loadError && pending > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{pending} чакат одобрение в списъка</span>}
        </div>
        <AdminFeedback message={loadError ? { type: 'error', text: loadError } : null} onRetry={fetchReviews} />
        <AdminFeedback message={action.message} onDismiss={action.clearMessage} />
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
            <i aria-hidden="true" className="ri-loader-4-line animate-spin text-3xl text-emerald-500" />
          </div>
        ) : loadError ? null : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <i aria-hidden="true" className="ri-star-line text-5xl mb-3 block" />
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
                        <i aria-hidden="true" className="ri-shopping-bag-2-line text-emerald-500" />
                        <span>{review.product_name}</span>
                      </div>
                    )}

                    <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!review.is_approved && (
                      <button
                        disabled={!!action.pending} onClick={() => approve(review.id)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i aria-hidden="true" className="ri-checkbox-circle-line" />
                        Одобри
                      </button>
                    )}
                    <button
                      disabled={!!action.pending} onClick={() => remove(review.id)}
                      className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap border border-red-100"
                    >
                      <i aria-hidden="true" className="ri-delete-bin-line" />
                      Изтрий
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}