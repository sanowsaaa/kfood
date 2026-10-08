import { useAdminAction } from '@/hooks/useAdminAction';
import { useAdminRead } from '@/hooks/useAdminRead';
import { checkedData, confirmedRecord } from '@/utils/admin';
import AdminFeedback from '@/pages/admin/components/AdminFeedback';
import AdminHeader from '../components/AdminHeader';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Navigate, Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminAccess from '@/pages/admin/components/AdminAccess';

interface Application {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  city: string;
  business_type: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_mobile: string;
  status: string;
  created_at: string;
  bulstat: string;
  vat_number: string;
  mol: string;
  address: string;
  postal_code: string;
  country: string;
  website: string;
  contact_position: string;
  contact_email: string;
  years_in_business: number;
  number_of_locations: number;
  estimated_monthly_value: string;
  estimated_monthly_volume: string;
  existing_brands: string;
  imports_products: boolean;
  requires_pallets: boolean;
  additional_notes: string;
  review_notes: string;
  reviewed_at: string;
  accept_terms: boolean;
  accept_privacy: boolean;
  confirm_accurate: boolean;
  company_id: string;
}

interface Company {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  city: string;
  business_type: string;
  status: string;
  created_at: string;
  credit_limit: number;
}

export default function AdminB2BPage() {
  const { isAdmin, loading: authLoading, error: authError, retry: retryAuth } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'companies' | 'order_rules' | 'payment_rules'>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const { loading, error: fetchError, load } = useAdminRead();
  const action = useAdminAction();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const processing = !!action.pending;
  const [orderRules, setOrderRules] = useState<any[]>([]);
  const [paymentRules, setPaymentRules] = useState<any[]>([]);
  const [newOrderRule, setNewOrderRule] = useState({ company_id: '', min_order_value: 0, min_cart_quantity: 1, max_order_value: 0 });
  const [newPaymentRule, setNewPaymentRule] = useState({ company_id: '', payment_method: 'bank_transfer' });

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, statusFilter]);

  const fetchData = () => load(async () => {
    const results = await Promise.all([
      supabase.from('b2b_applications').select('*').eq('status', statusFilter).order('created_at', { ascending: false }),
      supabase.from('b2b_companies').select('*').order('created_at', { ascending: false }),
      supabase.from('b2b_order_rules').select('*'),
      supabase.from('b2b_payment_rules').select('*'),
    ]);
    return results.map(result => checkedData(result));
  }, ([apps, firms, rules, payments]) => {
    setApplications(apps); setCompanies(firms); setOrderRules(rules); setPaymentRules(payments);
  });

  const handleApprove = (app: Application) => action.run(`approve:${app.id}`, async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('Няма активна сесия. Влезте отново.');
    const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/approve-b2b`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: app.id, review_notes: reviewNotes }),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.error || 'Одобрението не е потвърдено. Обновете данните преди нов опит.');
    action.setMessage(result.email_sent
      ? { type: 'success', text: `Кандидатурата е одобрена. Имейлът е приет за изпращане на ${app.contact_email || app.email}.` }
      : { type: 'info', text: 'Кандидатурата е одобрена, но изпращането на имейла не е потвърдено. Не одобрявайте повторно — проверете изпращането.' });
    setSelectedApp(null); setReviewNotes('');
    await fetchData();
  });

  const reviewApplication = async (appId: string, status: 'rejected' | 'more_info') => {
    if (processing || (status === 'rejected' && !confirm('Сигурни ли сте, че искате да отхвърлите тази апликация?'))) return;
    await action.run(`${status}:${appId}`, async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Няма активна сесия. Влезте отново.');
      confirmedRecord(await supabase.from('b2b_applications').update({
        status, reviewer_id: user.id, review_notes: reviewNotes, reviewed_at: new Date().toISOString(),
      }).eq('id', appId).select('id').single(), appId);
      setSelectedApp(null); setReviewNotes('');
      if (status === 'rejected') {
        const notification = await supabase.from('b2b_notifications').insert({
          type: 'new_application', title: 'Отхвърлена B2B апликация', message: `Апликация ${appId.slice(0, 8)} е отхвърлена.`,
        }).select('id').single();
        if (notification.error || !notification.data) action.setMessage({ type: 'info', text: 'Кандидатурата е отхвърлена. Вътрешното известие не е потвърдено; не отхвърляйте повторно.' });
        else action.setMessage({ type: 'success', text: 'Кандидатурата е отхвърлена.' });
      } else action.setMessage({ type: 'success', text: 'Статусът е променен на „Още информация“.' });
      await fetchData();
    });
  };
  const handleReject = (id: string) => reviewApplication(id, 'rejected');
  const handleRequestInfo = (id: string) => reviewApplication(id, 'more_info');

  const setCompanyStatus = (id: string, status: 'active' | 'suspended') => action.run(`company:${id}`, async () => {
    confirmedRecord(await supabase.from('b2b_companies').update({ status }).eq('id', id).select('id').single(), id);
    await fetchData();
  }, status === 'active' ? 'Компанията е възстановена.' : 'Компанията е суспендирана.');
  const handleSuspendCompany = (id: string) => {
    if (!processing && confirm('Сигурни ли сте, че искате да суспендирате тази компания?')) return setCompanyStatus(id, 'suspended');
  };
  const handleRestoreCompany = (id: string) => setCompanyStatus(id, 'active');

  const handleAddOrderRule = () => action.run('add-order-rule', async () => {
    const payload: Record<string, string | number> = { min_order_value: newOrderRule.min_order_value, min_cart_quantity: newOrderRule.min_cart_quantity };
    if (newOrderRule.company_id) payload.company_id = newOrderRule.company_id;
    if (newOrderRule.max_order_value) payload.max_order_value = newOrderRule.max_order_value;
    confirmedRecord(await supabase.from('b2b_order_rules').insert(payload).select('id').single());
    setNewOrderRule({ company_id: '', min_order_value: 0, min_cart_quantity: 1, max_order_value: 0 });
    await fetchData();
  }, 'Правилото за поръчки е добавено.');
  const handleDeleteOrderRule = (id: string) => action.run(`delete-order-rule:${id}`, async () => {
    confirmedRecord(await supabase.from('b2b_order_rules').delete().eq('id', id).select('id').single(), id);
    await fetchData();
  }, 'Правилото е изтрито.');
  const handleAddPaymentRule = () => {
    if (!newPaymentRule.company_id) return;
    return action.run('add-payment-rule', async () => {
      confirmedRecord(await supabase.from('b2b_payment_rules').insert(newPaymentRule).select('id').single());
      setNewPaymentRule({ company_id: '', payment_method: 'bank_transfer' });
      await fetchData();
    }, 'Правилото за плащане е добавено.');
  };
  const handleDeletePaymentRule = (id: string) => action.run(`delete-payment-rule:${id}`, async () => {
    confirmedRecord(await supabase.from('b2b_payment_rules').delete().eq('id', id).select('id').single(), id);
    await fetchData();
  }, 'Правилото е изтрито.');

  const paymentMethodLabels: Record<string, string> = {
    bank_transfer: 'Банков превод', cod: 'Наложен платеж', card: 'Онлайн карта',
    net7: 'Net 7', net15: 'Net 15', net30: 'Net 30', net60: 'Net 60',
  };

  const businessTypeLabels: Record<string, string> = {
    restaurant: 'Ресторант',
    asian_store: 'Азиатски магазин',
    supermarket: 'Супермаркет',
    distributor: 'Дистрибутор',
    wholesaler: 'Търговец на едро',
    online_shop: 'Онлайн магазин',
    hotel: 'Хотел',
    cafe: 'Кафене',
    retail_store: 'Магазин',
    other: 'Друг',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Изчаква',
    approved: 'Одобрен',
    rejected: 'Отхвърлен',
    more_info: 'Още информация',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    more_info: 'bg-blue-100 text-blue-800',
  };

  if (authLoading || authError) return <AdminAccess error={authError} onRetry={retryAuth} />;

  if (!isAdmin) return <Navigate to="/login" replace />;

  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.company_name || id.slice(0, 8);

  return (
    <div className="admin-page min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader />

      <main id="admin-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6"><h1 className="text-3xl font-bold text-slate-900">B2B партньори</h1><p className="mt-1 text-sm text-slate-500">Кандидатури, компании и съществуващи правила</p></div>
        <AdminFeedback message={fetchError ? { type: 'error', text: fetchError } : null} onRetry={fetchData} />
        <AdminFeedback message={action.message} onDismiss={action.clearMessage} />
        <fieldset disabled={processing || loading} hidden={!!fetchError} aria-busy={processing || loading} className="min-w-0">

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex max-w-full overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'applications' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i aria-hidden="true" className="ri-file-list-3-line mr-1.5"></i>
              Апликации
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'companies' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i aria-hidden="true" className="ri-building-2-line mr-1.5"></i>
              Компании
            </button>
            <button
              onClick={() => setActiveTab('order_rules')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'order_rules' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i aria-hidden="true" className="ri-scales-line mr-1.5"></i>
              Правила за поръчки
            </button>
            <button
              onClick={() => setActiveTab('payment_rules')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'payment_rules' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i aria-hidden="true" className="ri-bank-card-line mr-1.5"></i>
              Правила за плащане
            </button>
          </div>

          {activeTab === 'applications' && (
            <div className="flex gap-2 flex-wrap">
              {['pending', 'approved', 'rejected', 'more_info'].map(s => (
                <button
                  key={s}
                  onClick={() => { setSelectedApp(null); setReviewNotes(''); setStatusFilter(s); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {statusLabels[s]}{s === statusFilter && !loading ? ` (${applications.length})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Application List */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Апликации — {statusLabels[statusFilter]}</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <i aria-hidden="true" className="ri-loader-4-line text-2xl text-emerald-600 animate-spin"></i>
                    <p className="text-sm text-gray-600 mt-2">Зареждане...</p>
                  </div>
                ) : fetchError ? (
                  <div className="p-8 text-center">
                    <i aria-hidden="true" className="ri-error-warning-line text-3xl text-red-400 mb-2"></i>
                    <p className="text-sm text-red-600 mb-3">{fetchError}</p>
                    <button onClick={fetchData} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                      <i aria-hidden="true" className="ri-refresh-line mr-1"></i> Опитай отново
                    </button>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="p-8 text-center">
                    <i aria-hidden="true" className="ri-inbox-line text-3xl text-gray-300 mb-2"></i>
                    <p className="text-sm text-gray-600">Няма апликации</p>
                  </div>
                ) : (
                  applications.map(app => (
                    <button
                      key={app.id}
                      onClick={() => { setSelectedApp(app); setReviewNotes(''); }}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedApp?.id === app.id ? 'bg-emerald-50 border-l-2 border-l-emerald-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{app.company_name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{app.city} — {businessTypeLabels[app.business_type] || app.business_type}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[app.status]}`}>
                          {statusLabels[app.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(app.created_at).toLocaleDateString('bg-BG')} — {app.contact_first_name} {app.contact_last_name}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Application Detail */}
            <div className="lg:col-span-2">
              {selectedApp ? (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">{selectedApp.company_name}</h3>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[selectedApp.status]}`}>
                      {statusLabels[selectedApp.status]}
                    </span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Company Info */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Информация за компанията</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <DetailItem label="Име" value={selectedApp.company_name} />
                        <DetailItem label="БУЛСТАТ" value={selectedApp.bulstat || '—'} />
                        <DetailItem label="ДДС номер" value={selectedApp.vat_number || '—'} />
                        <DetailItem label="МОЛ" value={selectedApp.mol || '—'} />
                        <DetailItem label="Адрес" value={selectedApp.address || '—'} />
                        <DetailItem label="Град" value={selectedApp.city} />
                        <DetailItem label="Пощенски код" value={selectedApp.postal_code || '—'} />
                        <DetailItem label="Държава" value={selectedApp.country || '—'} />
                        <DetailItem label="Телефон" value={selectedApp.phone} />
                        <DetailItem label="Email" value={selectedApp.email} />
                        <DetailItem label="Уебсайт" value={selectedApp.website || '—'} />
                      </div>
                    </div>

                    {/* Contact Person */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Лице за контакт</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <DetailItem label="Име" value={`${selectedApp.contact_first_name} ${selectedApp.contact_last_name}`} />
                        <DetailItem label="Длъжност" value={selectedApp.contact_position || '—'} />
                        <DetailItem label="Мобилен" value={selectedApp.contact_mobile || '—'} />
                        <DetailItem label="Email" value={selectedApp.contact_email || '—'} />
                      </div>
                    </div>

                    {/* Business Info */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Бизнес информация</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <DetailItem label="Тип бизнес" value={businessTypeLabels[selectedApp.business_type] || selectedApp.business_type} />
                        <DetailItem label="Години в бизнеса" value={selectedApp.years_in_business ? `${selectedApp.years_in_business}` : '—'} />
                        <DetailItem label="Брой локации" value={`${selectedApp.number_of_locations || 1}`} />
                        <DetailItem label="Месечна стойност" value={selectedApp.estimated_monthly_value || '—'} />
                        <DetailItem label="Месечен обем" value={selectedApp.estimated_monthly_volume || '—'} />
                        <DetailItem label="Внася продукти" value={selectedApp.imports_products ? 'Да' : 'Не'} />
                        <DetailItem label="Палетни количества" value={selectedApp.requires_pallets ? 'Да' : 'Не'} />
                      </div>
                      {selectedApp.existing_brands && (
                        <div className="mt-3">
                          <span className="text-xs text-gray-400">Съществуващи брандове:</span>
                          <p className="text-sm text-gray-700 mt-0.5">{selectedApp.existing_brands}</p>
                        </div>
                      )}
                      {selectedApp.additional_notes && (
                        <div className="mt-3">
                          <span className="text-xs text-gray-400">Допълнителна информация:</span>
                          <p className="text-sm text-gray-700 mt-0.5">{selectedApp.additional_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Legal */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Правна информация</h4>
                      <div className="flex flex-wrap gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${selectedApp.accept_terms ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {selectedApp.accept_terms ? '✓' : '✗'} Общи условия
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${selectedApp.accept_privacy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {selectedApp.accept_privacy ? '✓' : '✗'} Поверителност
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${selectedApp.confirm_accurate ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {selectedApp.confirm_accurate ? '✓' : '✗'} Потвърдена информация
                        </span>
                      </div>
                    </div>

                    {/* Review Notes */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Бележки от преглед</h4>
                      <textarea
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder="Вътрешни бележки (видими само за администратори)..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                    </div>

                    {/* Success / Error messages */}
                    {selectedApp.status === 'pending' && (
                      <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleApprove(selectedApp)}
                          disabled={processing}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer"
                        >
                          <i aria-hidden="true" className="ri-check-line"></i> Одобри
                        </button>
                        <button
                          onClick={() => handleRequestInfo(selectedApp.id)}
                          disabled={processing}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer"
                        >
                          <i aria-hidden="true" className="ri-question-line"></i> Поискай още информация
                        </button>
                        <button
                          onClick={() => handleReject(selectedApp.id)}
                          disabled={processing}
                          className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer"
                        >
                          <i aria-hidden="true" className="ri-close-line"></i> Отхвърли
                        </button>
                      </div>
                    )}

                    {processing && (
                      <div className="text-center text-sm text-gray-600">
                        <i aria-hidden="true" className="ri-loader-4-line animate-spin mr-1"></i> Обработка...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <i aria-hidden="true" className="ri-file-search-line text-5xl text-gray-300 mb-4"></i>
                  <p className="text-gray-600">Изберете апликация от списъка</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div>
            {loading ? (
              <div className="p-12 text-center">
                <i aria-hidden="true" className="ri-loader-4-line text-3xl text-emerald-600 animate-spin"></i>
                <p className="text-sm text-gray-600 mt-2">Зареждане...</p>
              </div>
            ) : fetchError ? (
              <div className="p-12 text-center">
                <i aria-hidden="true" className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
                <p className="text-sm text-red-600 mb-3">{fetchError}</p>
                <button onClick={fetchData} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                  <i aria-hidden="true" className="ri-refresh-line mr-1"></i> Опитай отново
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <i aria-hidden="true" className="ri-building-2-line text-5xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">Все още няма одобрени компании</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Компания</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Тип</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Статус</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Дата</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {companies.map(company => (
                        <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div>
                              <Link to={`/admin/b2b/companies/${company.id}`} className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors cursor-pointer">
                                {company.company_name}
                              </Link>
                              <p className="text-xs text-gray-600">{company.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-gray-600">{businessTypeLabels[company.business_type] || '—'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              company.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              company.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {company.status === 'active' ? 'Активен' :
                               company.status === 'suspended' ? 'Суспендиран' :
                               company.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600">
                            {new Date(company.created_at).toLocaleDateString('bg-BG')}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              {company.status === 'active' ? (
                                <button
                                  onClick={() => handleSuspendCompany(company.id)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Суспендирай"
                                >
                                  <i aria-hidden="true" className="ri-pause-circle-line"></i>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreCompany(company.id)}
                                  className="text-emerald-500 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Възстанови"
                                >
                                  <i aria-hidden="true" className="ri-play-circle-line"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Rules Tab */}
        {activeTab === 'order_rules' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Правила за поръчки</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Добави правило</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Компания</label>
                  <select value={newOrderRule.company_id} onChange={e => setNewOrderRule(r => ({ ...r, company_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                    <option value="">Глобално</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Мин. стойност (€)</label>
                  <input type="number" value={newOrderRule.min_order_value} onChange={e => setNewOrderRule(r => ({ ...r, min_order_value: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Мин. артикули</label>
                  <input type="number" value={newOrderRule.min_cart_quantity} onChange={e => setNewOrderRule(r => ({ ...r, min_cart_quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Макс. стойност (€)</label>
                  <input type="number" value={newOrderRule.max_order_value} onChange={e => setNewOrderRule(r => ({ ...r, max_order_value: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddOrderRule} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer">
                  <i aria-hidden="true" className="ri-add-line mr-1"></i> Добави
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">За</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Мин. стойност</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Мин. артикули</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Макс. стойност</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {orderRules.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Няма зададени правила</td></tr>
                  ) : orderRules.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">{r.company_id ? getCompanyName(r.company_id) : 'Глобално'}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{r.min_order_value || 0} €</td>
                      <td className="px-4 py-3 text-xs">{r.min_cart_quantity || 1}</td>
                      <td className="px-4 py-3 text-xs">{r.max_order_value ? `${r.max_order_value} €` : 'Без лимит'}</td>
                      <td className="px-4 py-3"><button onClick={() => handleDeleteOrderRule(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><i aria-hidden="true" className="ri-delete-bin-line"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Rules Tab */}
        {activeTab === 'payment_rules' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Правила за плащане</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Добави метод на плащане за компания</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Компания</label>
                  <select value={newPaymentRule.company_id} onChange={e => setNewPaymentRule(r => ({ ...r, company_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                    <option value="">Избери компания</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Метод</label>
                  <select value={newPaymentRule.payment_method} onChange={e => setNewPaymentRule(r => ({ ...r, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                    {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddPaymentRule} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer w-full">
                    <i aria-hidden="true" className="ri-add-line mr-1"></i> Добави
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Компания</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Метод</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentRules.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Няма зададени правила</td></tr>
                  ) : paymentRules.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-semibold">{getCompanyName(r.company_id)}</td>
                      <td className="px-4 py-3 text-xs">{paymentMethodLabels[r.payment_method] || r.payment_method}</td>
                      <td className="px-4 py-3"><button onClick={() => handleDeletePaymentRule(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><i aria-hidden="true" className="ri-delete-bin-line"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </fieldset>
      </main>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="text-gray-900 font-medium text-sm">{value}</p>
    </div>
  );
}