import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';
import { supabase } from '@/utils/supabase';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import { useCustomerRead } from '@/hooks/useCustomerRead';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku: string | null;
  carton_price: number;
  pieces_per_carton: number;
  line_total_minor?: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  created_at: string;
  admin_discount_percent: number | null;
  discount_notes: string | null;
}

const statusLabels: Record<string, string> = {
  pending: 'Чакаща',
  pending_review: 'За преглед',
  approved: 'Одобрена',
  confirmed: 'Потвърдена',
  processing: 'Обработва се',
  shipped: 'Изпратена',
  delivered: 'Доставена',
  cancelled: 'Отказана',
};

const statusColors: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-amber-100 text-amber-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

export default function B2BOrdersPage() {
  const { companyId, company, sessionLoading } = useB2B();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal): Promise<Order[]> => {
    if (!companyId) return [];
    const { data, error } = await supabase.from('orders')
      .select('id, order_number, total_amount, status, items, created_at, admin_discount_percent, discount_notes')
      .eq('b2b_company_id', companyId).order('created_at', { ascending: false }).abortSignal(signal);
    if (error) throw error;
    return (data || []) as Order[];
  }, [companyId]);
  const { data: orders, loading, error, retry: fetchOrders } = useCustomerRead(load, []);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <B2BHeader />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="ri-building-2-line text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 font-heading mb-2">B2B Портал</h1>
          <p className="text-gray-500 text-sm mb-6">Влезте в акаунта си за достъп до поръчките.</p>
          <Link
            to="/b2b/login"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap text-sm"
          >
            <i className="ri-login-box-line text-lg"></i>
            Вход в портала
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
          <h1 className="text-xl font-extrabold text-gray-900 font-heading">История на поръчките</h1>
          <p className="text-gray-500 text-sm mt-1">
            {company?.company_name} · {orders.length} поръчки
          </p>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <i className="ri-information-line"></i>
            Крайният асортимент се потвърждава с вашия мениджър преди доставка.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div role="status" className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <i className="ri-loader-4-line text-3xl text-gray-300 animate-spin"></i>
            <p className="text-gray-500 text-sm mt-3">Зареждане на поръчките...</p>
          </div>
        ) : error ? (
          <div role="alert" className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <p className="text-gray-700 text-sm mb-4">{error}</p>
            <button
              onClick={fetchOrders}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line"></i> Опитай отново
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-inbox-line text-3xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Все още нямате поръчки</h3>
            <p className="text-gray-500 text-sm mb-6">Направете първата си поръчка от каталога.</p>
            <Link
              to="/b2b/products"
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-store-2-line"></i> Към каталога
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const isExpanded = expandedId === order.id;
              const items = Array.isArray(order.items) ? order.items.filter(item => item && typeof item === 'object') : [];
              const itemCount = items.length;
              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    aria-expanded={isExpanded}
                    aria-controls={`order-${order.id}`}
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-file-list-3-line text-emerald-600 text-lg"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm font-mono break-all">#{order.order_number}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('bg-BG')} · {itemCount} артикула
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                      <span className="font-bold text-gray-900 text-sm whitespace-nowrap">€{Number(order.total_amount).toFixed(2)}</span>
                      <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </div>
                  </button>

                  {isExpanded && (
                    <div id={`order-${order.id}`} className="border-t border-gray-100 px-5 py-4">
                      {/* Items */}
                      <div className="space-y-3">
                        {items.map((item, i) => {
                          const hasCarton = item.pieces_per_carton > 0;
                          const cartons = hasCarton ? Math.floor(item.quantity / item.pieces_per_carton) : 0;
                          const unitPrice = Number.isFinite(Number(item.price)) ? Number(item.price) : 0;
                          const lineTotal = Number.isSafeInteger(item.line_total_minor) && item.line_total_minor! >= 0
                            ? item.line_total_minor! / 100 : unitPrice * (Number(item.quantity) || 0);
                          return (
                            <div key={i} className="flex items-center gap-3">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <i className="ri-image-line text-gray-400"></i>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.name}</p>
                                <p className="text-[10px] text-gray-400">
                                  {hasCarton
                                    ? `${cartons} кашон${cartons !== 1 ? 'а' : ''} × ${item.pieces_per_carton} бр. · €${unitPrice.toFixed(2)}/бр.`
                                    : `${item.quantity} бр. · €${unitPrice.toFixed(2)}/бр.`}
                                </p>
                                {item.sku && (
                                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Кат. № {item.sku}</p>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">€{lineTotal.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {order.admin_discount_percent && order.admin_discount_percent > 0
                            ? `Одобрена с ${order.admin_discount_percent}% отстъпка`
                            : 'Междинна сума'}
                        </span>
                        <span className="font-bold text-gray-900 text-sm">€{Number(order.total_amount).toFixed(2)}</span>
                      </div>

                      {order.discount_notes && (
                        <p className="mt-3 text-[11px] text-gray-500 italic">Бележка: {order.discount_notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <B2BFooter />
    </div>
  );
}
