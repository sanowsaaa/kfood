import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useB2B, type B2BProduct } from '@/contexts/B2BContext';
import { supabase } from '@/utils/supabase';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import { useCustomerRead } from '@/hooks/useCustomerRead';
import CustomerReadError from '@/components/CustomerReadError';

const businessTypeLabels: Record<string, string> = {
  restaurant: 'Ресторант', asian_store: 'Азиатски магазин', supermarket: 'Супермаркет',
  distributor: 'Дистрибутор', wholesaler: 'Търговец на едро', online_shop: 'Онлайн магазин',
  hotel: 'Хотел', cafe: 'Кафене', retail_store: 'Магазин', other: 'Друг',
};

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

// ===== Not authenticated → redirect to /b2b/login =====
function B2BNotLoggedIn() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="ri-building-2-line text-3xl text-white"></i>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 font-heading mb-2">B2B Портал</h1>
        <p className="text-gray-500 text-sm mb-6">Влезте в акаунта си за достъп до каталога и поръчките.</p>
        <Link
          to="/b2b/login"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap text-sm"
        >
          <i className="ri-login-box-line text-lg"></i>
          Вход в портала
        </Link>
        <p className="text-center text-xs text-gray-400 mt-4">
          Първо влизане?{' '}
          <Link to="/b2b/register" className="text-emerald-600 hover:underline font-medium">
            Активирайте акаунта си
          </Link>
        </p>
      </div>
    </div>
  );
}

// ===== Dashboard Content =====
export default function B2BDashboardPage() {
  const { company, companyId, loading, sessionLoading, disconnect } = useB2B();
  const [searchQuery, setSearchQuery] = useState('');
  const load = useCallback(async (signal: AbortSignal) => {
    if (!companyId) return { orders: [] as Order[], products: [] as B2BProduct[], orderCount: 0 };
    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('id, order_number, total_amount, status, created_at', { count: 'exact' }).eq('b2b_company_id', companyId).order('created_at', { ascending: false }).limit(10).abortSignal(signal),
      supabase.from('products').select('id, name, price, wholesale_price, carton_price, image, category, sku, stock, in_stock, moq, moq_unit, pieces_per_carton, slug').order('category').order('name').abortSignal(signal),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (productsRes.error) throw productsRes.error;
    return { orders: (ordersRes.data || []) as Order[], products: (productsRes.data || []) as B2BProduct[], orderCount: ordersRes.count ?? ordersRes.data?.length ?? 0 };
  }, [companyId]);
  const { data: { orders, products, orderCount }, loading: ordersLoading, error: readError, retry } = useCustomerRead(load, { orders: [], products: [], orderCount: 0 });

  const filteredProducts = products.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending: 'Изчаква', pending_review: 'За преглед', approved: 'Одобрена', confirmed: 'Потвърдена', processing: 'Обработва се', shipped: 'Изпратена', delivered: 'Доставена', cancelled: 'Отказана' };
    return labels[status] || status;
  };

  const getOrderStatusColor = (status: string) => {
    if (status === 'delivered' || status === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'processing') return 'bg-amber-100 text-amber-700';
    if (status === 'pending_review') return 'bg-yellow-100 text-yellow-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-600';
    return 'bg-gray-100 text-gray-600';
  };

  // Show loader while checking session
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
          <p className="text-gray-500 text-sm mt-3">Проверка на достъпа...</p>
        </div>
      </div>
    );
  }

  // NOT authenticated
  if (!companyId) {
    return <B2BNotLoggedIn />;
  }

  // Authenticated but loading company data
  if (loading && !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
          <p className="text-gray-500 text-sm mt-3">Зареждане на профила...</p>
        </div>
      </div>
    );
  }

  // Company not found
  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl text-red-500"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Компанията не е намерена</h2>
          <p className="text-gray-500 text-sm mb-4">Проверете ID-то или се свържете с администратор.</p>
          <button onClick={disconnect} className="text-emerald-600 hover:underline font-medium cursor-pointer text-sm whitespace-nowrap">Обратно към вход</button>
        </div>
      </div>
    );
  }

  // Company not active
  if (company.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-lock-line text-3xl text-amber-600"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Акаунтът е суспендиран</h2>
          <p className="text-gray-500 text-sm">Свържете се с вашия акаунт мениджър.</p>
        </div>
      </div>
    );
  }

  // ===== FULL DASHBOARD =====
  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />

      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">B2B Dashboard</p>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 font-heading">
                Добре дошли, {company.company_name}!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {businessTypeLabels[company.business_type] || company.business_type} · {company.city}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <StatCard icon="ri-price-tag-3-line" label="Тип цени" value="Цени на едро" />
            <StatCard icon="ri-building-2-line" label="Тип бизнес" value={businessTypeLabels[company.business_type] || company.business_type} />
            <StatCard icon="ri-shopping-cart-2-line" label="Поръчки" value={ordersLoading || readError ? '—' : `${orderCount}`} />
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <QuickActions />
            <CompanyInfoCard company={company} />
          </div>

          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {readError && <CustomerReadError message={readError} onRetry={retry} />}
            {/* Orders */}
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Последни поръчки</h3>
                {orders.length > 0 && (
                  <Link to="/b2b/orders" className="text-emerald-600 text-xs hover:underline">Виж всички</Link>
                )}
              </div>
              {ordersLoading ? (
                <div className="p-8 text-center"><i className="ri-loader-4-line text-2xl text-gray-300 animate-spin"></i></div>
              ) : readError ? null : orders.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="ri-inbox-line text-3xl text-gray-300 mb-3"></i>
                  <p className="text-gray-500 text-sm">Все още нямате поръчки</p>
                  <Link to="/b2b/products" className="text-emerald-600 font-medium text-xs hover:underline mt-2 inline-block">
                    Направете първата си поръчка
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.slice(0, 5).map(order => {
                    return (
                    <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm break-all">#{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('bg-BG')}</p>
                      </div>
                      <div className="text-right flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getOrderStatusColor(order.status)}`}>{getOrderStatusLabel(order.status)}</span>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* Products Quick View */}
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-bold text-gray-900 text-sm">Продукти</h3>
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    aria-label="Търси продукт в таблото"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Търси продукт..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-48 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="p-4">
                {ordersLoading ? <p role="status" className="p-4 text-center text-sm text-gray-500">Зареждане на продуктите…</p> : readError ? null : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-price-tag-3-line text-3xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500 text-sm">Няма налични продукти</p>
                    <p className="text-gray-400 text-xs mt-1">Свържете се с вашия акаунт мениджър за актуален каталог</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto">
                    {filteredProducts.slice(0, 10).map(p => {
                      const isCarton = p.pieces_per_carton > 0;
                      return (
                        <Link
                          key={p.id}
                          to={`/b2b/product/${p.slug || p.id}`}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <img src={p.image} alt={p.name} className="w-14 h-14 sm:w-12 sm:h-12 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {p.sku && <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>}
                              {isCarton && (
                                <span className="text-[10px] text-emerald-600">
                                  <i className="ri-archive-line mr-0.5"></i>кашон x{p.pieces_per_carton}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">{p.category}</span>
                            </div>
                          </div>
                          <i className="ri-arrow-right-s-line text-gray-300"></i>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {!readError && !ordersLoading && filteredProducts.length > 10 && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Показани 10 от {filteredProducts.length}.{' '}
                    <Link to="/b2b/products" className="text-emerald-600 hover:underline font-medium">Виж всички</Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gray-400">K-FOOD B2B Портал &copy; {new Date().getFullYear()} · Всички права запазени</p>
        </div>
      </footer>
    </div>
  );
}

// ===== Sub-components =====
function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <i className={`${icon} text-emerald-600 text-sm`}></i>
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-bold text-gray-900 text-sm mb-3">Бързи действия</h3>
      <div className="space-y-1.5">
        <Link to="/b2b/quick-order" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"><i className="ri-flashlight-line text-white text-sm"></i></div>
          <div><p className="font-semibold text-gray-900 text-xs">Бързо поръчване</p><p className="text-[10px] text-gray-500">По SKU или баркод</p></div>
        </Link>
        <Link to="/b2b/products" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><i className="ri-store-2-line text-gray-600 text-sm"></i></div>
          <div><p className="font-semibold text-gray-900 text-xs">Каталог</p><p className="text-[10px] text-gray-500">Разгледай продукти</p></div>
        </Link>
        <Link to="/b2b/documents" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><i className="ri-folder-line text-gray-600 text-sm"></i></div>
          <div><p className="font-semibold text-gray-900 text-xs">Документи</p><p className="text-[10px] text-gray-500">Ценови листи</p></div>
        </Link>
      </div>
    </div>
  );
}

function CompanyInfoCard({ company }: { company: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-bold text-gray-900 text-sm mb-3">Профил</h3>
      <div className="space-y-2 text-xs">
        <InfoRow label="Име" value={company.company_name} />
        <InfoRow label="Email" value={company.email} />
        <InfoRow label="Телефон" value={company.phone} />
        <InfoRow label="Град" value={company.city} />
        <InfoRow label="Тип" value={businessTypeLabels[company.business_type] || company.business_type} />
        <InfoRow label="Партньор от" value={new Date(company.created_at).toLocaleDateString('bg-BG')} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 text-xs shrink-0">{label}</span>
      <span className="text-gray-700 text-xs font-medium text-right min-w-0 break-words">{value}</span>
    </div>
  );
}
