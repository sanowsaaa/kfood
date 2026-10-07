import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminHeader from '../components/AdminHeader';

const REVIEW_ORDER_URL = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/review-b2b-order';
const GENERATE_INVOICE_URL = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/generate-b2b-invoice';

interface ShippingAddress {
  full_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  notes?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string | null;
}

interface B2BCompanyInfo {
  company_name: string;
  bulstat: string;
  vat_number: string;
  mol: string;
  address: string;
  city: string;
  postal_code: string;
  email: string;
  phone: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  total_amount: number;
  original_total_amount: number | null;
  currency: string;
  stripe_session_id?: string;
  b2b_company_id?: string;
  is_b2b_order?: boolean;
  payment_method?: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  tracking_notes: string;
  admin_discount_percent: number | null;
  discount_notes: string | null;
  created_at: string;
  estimated_delivery?: string;
}

const statusOptions = [
  { value: 'pending_review', label: 'За преглед', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  { value: 'pending', label: 'Чакаща', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  { value: 'approved', label: 'Одобрена', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-400' },
  { value: 'confirmed', label: 'Потвърдена', color: 'bg-sky-100 text-sky-800', dot: 'bg-sky-400' },
  { value: 'processing', label: 'Обработва се', color: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400' },
  { value: 'shipped', label: 'Изпратена', color: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-400' },
  { value: 'delivered', label: 'Доставена', color: 'bg-green-100 text-green-800', dot: 'bg-green-400' },
  { value: 'cancelled', label: 'Отказана', color: 'bg-red-100 text-red-800', dot: 'bg-red-400' },
];

export default function OrdersManagement() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState('');

  // B2B review state
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [discountNotes, setDiscountNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [companyInfo, setCompanyInfo] = useState<B2BCompanyInfo | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Invoice generation state
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  // Custom line item prices for B2B approval
  const [lineItems, setLineItems] = useState<Array<{id: number; name: string; quantity: number; pieces_per_carton: number; unit_price: string; carton_price: string; sku: string | null}>>([]);
  const [useCustomPrices, setUseCustomPrices] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/login');
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  const refreshStripeOrder = async (order: Order) => {
    if (!order.stripe_session_id) return;
    try {
      const { error } = await supabase.functions.invoke('update-stripe-order', {
        body: {
          sessionId: order.stripe_session_id,
          orderNumber: order.order_number,
        },
      });

      if (!error) {
        await fetchOrders();
        setSelectedOrder(null);
      }
    } catch {
      // Silently handle
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    } catch {
      alert('Грешка при обновяване на статуса');
    }
  };

  const saveTrackingNotes = async () => {
    if (!selectedOrder) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_notes: localNotes, updated_at: new Date().toISOString() })
        .eq('id', selectedOrder.id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, tracking_notes: localNotes } : o));
      setSelectedOrder(prev => prev ? { ...prev, tracking_notes: localNotes } : null);
    } catch {
      alert('Грешка при запазване');
    } finally {
      setSavingNotes(false);
    }
  };

  const fetchCompanyInfo = async (companyId: string) => {
    setLoadingCompany(true);
    setCompanyInfo(null);
    try {
      const { data } = await supabase
        .from('b2b_companies')
        .select('company_name, bulstat, vat_number, mol, address, city, postal_code, email, phone')
        .eq('id', companyId)
        .single();

      if (data) setCompanyInfo(data as B2BCompanyInfo);
    } catch {
      // Silently handle
    } finally {
      setLoadingCompany(false);
    }
  };

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setLocalNotes(order.tracking_notes || '');
    setReviewError('');
    setReviewSuccess('');
    setDiscountNotes(order.discount_notes || '');
    setInvoiceError('');
    setInvoiceNumber(null);

    // For B2B orders, reset discount to 0 or load existing
    if (order.is_b2b_order) {
      setDiscountPercent(order.admin_discount_percent !== null && order.admin_discount_percent !== undefined
        ? String(order.admin_discount_percent)
        : '0');
      if (order.b2b_company_id) {
        // Initialize line items with current prices from order
        const orderItems = (order.items || []) as any[];
        setLineItems(orderItems.map((item: any) => ({
          id: item.id || 0,
          name: item.name || '',
          quantity: item.quantity || 0,
          pieces_per_carton: item.pieces_per_carton || 0,
          unit_price: String((item.price || 0).toFixed(2)),
          carton_price: String((item.carton_price || 0).toFixed(2)),
          sku: item.sku || null,
        })));
        setUseCustomPrices(false);

        fetchCompanyInfo(order.b2b_company_id);
      } else {
        setCompanyInfo(null);
      }
    } else {
      setCompanyInfo(null);
      setDiscountPercent('0');
      setDiscountNotes('');
    }
  };

  const getStatusInfo = (status: string) => statusOptions.find(o => o.value === status) || { label: status, color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' };
  const isStripe = (order: Order) => !!order.stripe_session_id;
  const isB2B = (order: Order) => !!(order.b2b_company_id || order.is_b2b_order || order.payment_method === 'b2b_invoice');

  const handleReviewOrder = async (action: 'approve' | 'reject') => {
    if (!selectedOrder) return;
    setReviewError('');
    setReviewSuccess('');
    setReviewLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setReviewError('Сесията е изтекла. Моля, влезте отново.');
        setReviewLoading(false);
        return;
      }

      const body: Record<string, unknown> = {
        order_id: selectedOrder.id,
        action,
      };

      if (action === 'approve') {
        // If using custom prices, send line_items instead of discount_percent
        if (useCustomPrices) {
          body.line_items = lineItems.map(li => ({
            id: li.id,
            unit_price: (parseFloat(li.unit_price) || 0),
            carton_price: (parseFloat(li.carton_price) || 0),
          }));
          body.discount_percent = 0;
        } else {
          const disc = parseFloat(discountPercent) || 0;
          if (disc < 0 || disc > 100) {
            setReviewError('Отстъпката трябва да е между 0% и 100%');
            setReviewLoading(false);
            return;
          }
          body.discount_percent = disc;
        }
        body.discount_notes = discountNotes;
      } else {
        body.discount_notes = discountNotes;
      }

      const response = await fetch(REVIEW_ORDER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setReviewError(result.error || 'Грешка при обработка на поръчката');
        setReviewLoading(false);
        return;
      }

      setReviewSuccess(result.message || 'Операцията е успешна!');

      // Refresh orders and update selected order
      await fetchOrders();

      // Update selected order locally
      const updatedOrders = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrder.id)
        .single();

      if (updatedOrders.data) {
        setSelectedOrder(updatedOrders.data as Order);
        setLocalNotes(updatedOrders.data.tracking_notes || '');
      }

      // Auto-generate invoice after approval
      if (action === 'approve') {
        setTimeout(async () => {
          try {
            const invResponse = await fetch(GENERATE_INVOICE_URL, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ order_id: selectedOrder.id }),
            });
            const invResult = await invResponse.json();
            if (invResult.success) {
              setInvoiceNumber(invResult.invoice_number);
            }
          } catch {
            // Silent - invoice can be generated manually later
          }
        }, 500);
      }
    } catch {
      setReviewError('Грешка при свързване със сървъра. Опитайте отново.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    setInvoiceError('');
    setGeneratingInvoice(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setInvoiceError('Сесията е изтекла.');
        setGeneratingInvoice(false);
        return;
      }

      const response = await fetch(GENERATE_INVOICE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: selectedOrder.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setInvoiceError(result.error || 'Грешка при генериране на фактура');
        setGeneratingInvoice(false);
        return;
      }

      if (result.already_exists) {
        setInvoiceNumber(result.invoice_number);
        setGeneratingInvoice(false);
        return;
      }

      setInvoiceNumber(result.invoice_number);
      setGeneratingInvoice(false);
    } catch {
      setInvoiceError('Грешка при свързване със сървъра.');
      setGeneratingInvoice(false);
    }
  };

  // Discount preview calculations
  const getDiscountPreview = () => {
    if (!selectedOrder) return null;
    const disc = parseFloat(discountPercent) || 0;
    const original = selectedOrder.original_total_amount
      ? Number(selectedOrder.original_total_amount)
      : Number(selectedOrder.total_amount);
    const discounted = Math.round(original * (1 - disc / 100) * 100) / 100;
    const vat = Math.round(discounted * 0.20 * 100) / 100;
    const total = Math.round((discounted + vat) * 100) / 100;
    return { original, discounted, vat, total, discount: disc };
  };

  const filteredOrders = orders.filter(order => {
    const isB2BOrder = isB2B(order);
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesType = filterType === 'all'
      || (filterType === 'cod' && !order.stripe_session_id && !isB2BOrder)
      || (filterType === 'stripe' && !!order.stripe_session_id)
      || (filterType === 'b2b' && isB2BOrder)
      || (filterType === 'b2b_review' && isB2BOrder && order.status === 'pending_review');
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || order.order_number?.toLowerCase().includes(q)
      || order.customer_email?.toLowerCase().includes(q)
      || order.customer_phone?.includes(q)
      || order.shipping_address?.full_name?.toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesSearch;
  });

  const b2bReviewCount = orders.filter(o => isB2B(o) && o.status === 'pending_review').length;

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    b2bReview: b2bReviewCount,
    cod: orders.filter(o => !o.stripe_session_id && !isB2B(o)).length,
    stripe: orders.filter(o => !!o.stripe_session_id).length,
    b2b: orders.filter(o => isB2B(o)).length,
    totalRevenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount), 0),
  };

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

  const preview = getDiscountPreview();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Управление на поръчки</h1>
          <p className="mt-1 text-gray-500">Всички поръчки от магазина</p>
        </div>

        {/* Статистики */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Общо поръчки', value: stats.total, icon: 'ri-file-list-3-line', color: 'text-gray-700' },
            { label: 'Чакащи', value: stats.pending, icon: 'ri-time-line', color: 'text-yellow-600' },
            { label: 'B2B за преглед', value: stats.b2bReview, icon: 'ri-eye-line', color: b2bReviewCount > 0 ? 'text-amber-600' : 'text-gray-400' },
            { label: 'B2B общо', value: stats.b2b, icon: 'ri-building-2-line', color: 'text-gray-800' },
            { label: 'Наложен платеж', value: stats.cod, icon: 'ri-truck-line', color: 'text-orange-600' },
            { label: 'С карта', value: stats.stripe, icon: 'ri-bank-card-line', color: 'text-emerald-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className={`w-8 h-8 flex items-center justify-center mb-2 ${stat.color}`}>
                <i className={`${stat.icon} text-xl`}></i>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Филтри */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Търсене</label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Номер, имейл, телефон, име..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Статус</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">Всички статуси</option>
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Метод на плащане</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">Всички</option>
                <option value="b2b_review">🔶 B2B за преглед</option>
                <option value="b2b">B2B</option>
                <option value="cod">Наложен платеж</option>
                <option value="stripe">Онлайн с карта</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Показват се {filteredOrders.length} от {orders.length} поръчки
            {b2bReviewCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                {b2bReviewCount} чакат преглед
              </span>
            )}
          </p>
        </div>

        {/* Таблица */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-full">
                <i className="ri-inbox-2-line text-3xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">Няма намерени поръчки</p>
              <p className="text-gray-400 text-sm mt-1">Опитайте с различни филтри</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Номер', 'Клиент', 'Дата', 'Сума', 'Плащане', 'Статус', ''].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map(order => {
                    const statusInfo = getStatusInfo(order.status);
                    const stripe = isStripe(order);
                    const b2b = isB2B(order);
                    const needsReview = b2b && order.status === 'pending_review';
                    return (
                      <tr key={order.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${needsReview ? 'bg-amber-50/50' : ''}`} onClick={() => openOrder(order)}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium text-gray-800">{order.order_number}</span>
                            {needsReview && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Чака преглед"></span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.shipping_address?.full_name || '—'}
                          </div>
                          <div className="text-xs text-gray-500">{order.customer_email}</div>
                          <div className="text-xs text-gray-500">{order.customer_phone}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(order.created_at).toLocaleDateString('bg-BG')}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            €{Number(order.total_amount).toFixed(2)}
                          </span>
                          {order.admin_discount_percent && order.admin_discount_percent > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium mt-0.5">
                              <i className="ri-discount-percent-line"></i> -{order.admin_discount_percent}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {stripe ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                              <i className="ri-bank-card-line"></i> Карта
                            </span>
                          ) : b2b ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
                              <i className="ri-building-2-line"></i> B2B
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                              <i className="ri-truck-line"></i> Наложен
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={e => { e.stopPropagation(); openOrder(order); }}
                            className="text-teal-600 hover:text-teal-800 text-sm font-medium whitespace-nowrap"
                          >
                            Детайли →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Модал детайли */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Поръчка {selectedOrder.order_number}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selectedOrder.created_at).toLocaleString('bg-BG')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isStripe(selectedOrder) && (!selectedOrder.customer_email || !selectedOrder.shipping_address?.full_name) && (
                  <button
                    onClick={() => refreshStripeOrder(selectedOrder)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer"
                    title="Вземи данните от Stripe"
                  >
                    <i className="ri-refresh-line"></i> Обнови от Stripe
                  </button>
                )}
                {isB2B(selectedOrder) ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-white">
                    <i className="ri-building-2-line"></i> B2B Поръчка
                  </span>
                ) : isStripe(selectedOrder) ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <i className="ri-bank-card-line"></i> Платено онлайн
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                    <i className="ri-truck-line"></i> Наложен платеж
                  </span>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* B2B Review Panel — only for B2B orders */}
              {isB2B(selectedOrder) && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <i className="ri-admin-line"></i>
                    {selectedOrder.status === 'pending_review' ? 'B2B Преглед и одобрение' : 'B2B Детайли за одобрение'}
                  </h3>

                  {/* Company info */}
                  {loadingCompany ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <i className="ri-loader-4-line animate-spin"></i> Зареждане на фирмени данни...
                    </div>
                  ) : companyInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 bg-white rounded-lg p-4 border border-amber-100">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Фирма</span>
                        <p className="text-sm font-bold text-gray-900">{companyInfo.company_name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">ЕИК/Булстат</span>
                        <p className="text-sm font-mono font-semibold text-gray-800">{companyInfo.bulstat || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">ДДС номер</span>
                        <p className="text-sm font-mono font-semibold text-gray-800">{companyInfo.vat_number || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">МОЛ</span>
                        <p className="text-sm text-gray-800">{companyInfo.mol || '—'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Адрес</span>
                        <p className="text-sm text-gray-800">
                          {[companyInfo.address, companyInfo.city, companyInfo.postal_code].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Имейл</span>
                        <p className="text-sm text-teal-600">{companyInfo.email || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Телефон</span>
                        <p className="text-sm text-teal-600">{companyInfo.phone || '—'}</p>
                      </div>
                    </div>
                  ) : selectedOrder.b2b_company_id ? (
                    <p className="text-sm text-gray-500 mb-4">Няма намерени фирмени данни за този B2B клиент.</p>
                  ) : null}

                  {/* Already reviewed info */}
                  {selectedOrder.status === 'approved' && selectedOrder.admin_discount_percent !== null && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="ri-check-double-line text-emerald-600"></i>
                        <span className="text-sm font-bold text-emerald-800">Вече одобрена</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[10px] uppercase text-emerald-600/70 font-semibold">Оригинална сума</span>
                          <p className="font-bold text-gray-900">
                            €{((selectedOrder.original_total_amount ? Number(selectedOrder.original_total_amount) : Number(selectedOrder.total_amount) / (1 - Number(selectedOrder.admin_discount_percent) / 100))).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-emerald-600/70 font-semibold">Приложена отстъпка</span>
                          <p className="font-bold text-emerald-700">{selectedOrder.admin_discount_percent}%</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-emerald-600/70 font-semibold">Крайна сума</span>
                          <p className="font-bold text-emerald-700">€{Number(selectedOrder.total_amount).toFixed(2)}</p>
                        </div>
                        {selectedOrder.discount_notes && (
                          <div className="col-span-2">
                            <span className="text-[10px] uppercase text-emerald-600/70 font-semibold">Бележка</span>
                            <p className="text-sm text-gray-700">{selectedOrder.discount_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Invoice button */}
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        {invoiceNumber ? (
                          <a
                            href={`/invoice/${invoiceNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all whitespace-nowrap"
                          >
                            <i className="ri-file-text-line text-lg"></i>
                            Отвори фактура {invoiceNumber}
                          </a>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={handleGenerateInvoice}
                              disabled={generatingInvoice}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                              {generatingInvoice ? (
                                <><i className="ri-loader-4-line animate-spin"></i> Генериране...</>
                              ) : (
                                <><i className="ri-file-text-line text-lg"></i> Генерирай фактура</>
                              )}
                            </button>
                            {invoiceError && (
                              <span className="text-sm text-red-600">{invoiceError}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedOrder.status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="ri-close-circle-line text-red-600"></i>
                        <span className="text-sm font-bold text-red-800">Отказана поръчка</span>
                      </div>
                      {selectedOrder.discount_notes && (
                        <p className="text-sm text-gray-700">{selectedOrder.discount_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Active review controls — only for pending_review */}
                  {selectedOrder.status === 'pending_review' && (
                    <>
                      {/* Custom line item prices toggle */}
                      <div className="mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useCustomPrices}
                            onChange={e => setUseCustomPrices(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            <i className="ri-price-tag-3-line mr-1.5 text-teal-600"></i>
                            Задай персонализирани цени за всеки продукт
                          </span>
                        </label>
                      </div>

                      {/* Editable line items table */}
                      {useCustomPrices && lineItems.length > 0 && (
                        <div className="mb-4 bg-white border border-teal-200 rounded-xl overflow-hidden">
                          <div className="bg-teal-50 px-4 py-2.5 border-b border-teal-100">
                            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wide">Цени на продуктите</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Продукт</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-500 w-16">Кол.</th>
                                  <th className="px-3 py-2 text-right font-semibold text-gray-500 w-28">Цена/бр. (€)</th>
                                  <th className="px-3 py-2 text-right font-semibold text-gray-500 w-28">Цена/кашон (€)</th>
                                  <th className="px-3 py-2 text-right font-semibold text-gray-500 w-24">Общо (€)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {lineItems.map((li, idx) => {
                                  const unitPrice = parseFloat(li.unit_price) || 0;
                                  const cartonPrice = parseFloat(li.carton_price) || 0;
                                  const hasCarton = li.pieces_per_carton > 0;
                                  const lineTotal = unitPrice * li.quantity;
                                  return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-3 py-2">
                                        <p className="font-medium text-gray-800 text-xs">{li.name}</p>
                                        {li.sku && (
                                          <span className="block text-[10px] text-gray-400 font-mono">Кат. № {li.sku}</span>
                                        )}
                                        {hasCarton && (
                                          <span className="text-[10px] text-gray-400">
                                            📦 кашон x{li.pieces_per_carton} бр. · {Math.floor(li.quantity / li.pieces_per_carton)} кашона
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center text-gray-600 font-mono">{li.quantity}</td>
                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={li.unit_price}
                                          onChange={e => {
                                            const updated = [...lineItems];
                                            updated[idx] = { ...updated[idx], unit_price: e.target.value };
                                            setLineItems(updated);
                                          }}
                                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs font-mono text-right focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={li.carton_price}
                                          onChange={e => {
                                            const updated = [...lineItems];
                                            updated[idx] = { ...updated[idx], carton_price: e.target.value };
                                            setLineItems(updated);
                                          }}
                                          className={`w-full px-2 py-1.5 border rounded-md text-xs font-mono text-right focus:ring-2 focus:ring-teal-500 focus:border-transparent ${!hasCarton ? 'bg-gray-100 text-gray-400' : 'border-gray-200'}`}
                                          disabled={!hasCarton}
                                          placeholder={!hasCarton ? '—' : ''}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">
                                        {lineTotal.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-teal-50/50 border-t border-teal-100">
                                <tr>
                                  <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-bold text-gray-700">Общо с персонализирани цени:</td>
                                  <td className="px-3 py-2.5 text-right text-sm font-black text-teal-700 font-mono">
                                    €{lineItems.reduce((sum, li) => sum + (parseFloat(li.unit_price) || 0) * li.quantity, 0).toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Discount input — only show if NOT using custom prices */}
                      {!useCustomPrices && (
                      <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Отстъпка (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={discountPercent}
                              onChange={e => { setDiscountPercent(e.target.value); setReviewError(''); }}
                              className="w-full px-4 py-2.5 pr-8 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Бележка към отстъпката
                          </label>
                          <input
                            type="text"
                            value={discountNotes}
                            onChange={e => { setDiscountNotes(e.target.value); setReviewError(''); }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Пример: лоялен клиент, голяма поръчка..."
                            maxLength={500}
                          />
                        </div>
                      </div>

                      {/* Preview calculation */}
                      {preview && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Преизчисление</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Оригинална сума (без ДДС)</span>
                              <span className="font-semibold text-gray-900">€{preview.original.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Отстъпка ({preview.discount}%)</span>
                              <span className="font-semibold text-amber-600">-€{(preview.original - preview.discounted).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-2">
                              <span className="text-gray-600">Данъчна основа</span>
                              <span className="font-semibold text-gray-900">€{preview.discounted.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">ДДС (20%)</span>
                              <span className="font-semibold text-gray-700">€{preview.vat.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                              <span className="font-bold text-gray-900">ОБЩО с ДДС</span>
                              <span className="font-bold text-teal-700 text-lg">€{preview.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      </>
                      )}

                      {/* Custom prices note field */}
                      {useCustomPrices && (
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Бележка към офертата
                          </label>
                          <input
                            type="text"
                            value={discountNotes}
                            onChange={e => { setDiscountNotes(e.target.value); setReviewError(''); }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Пример: цени по договаряне, специална оферта..."
                            maxLength={500}
                          />
                        </div>
                      )}

                      {/* Error / Success */}
                      {reviewError && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                          <i className="ri-error-warning-line text-red-500 mt-0.5"></i>
                          <p className="text-sm text-red-700">{reviewError}</p>
                        </div>
                      )}
                      {reviewSuccess && (
                        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                          <i className="ri-check-line text-emerald-500 mt-0.5"></i>
                          <p className="text-sm text-emerald-700">{reviewSuccess}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleReviewOrder('approve')}
                          disabled={reviewLoading}
                          className="flex-1 min-w-[160px] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                        >
                          {reviewLoading ? (
                            <><i className="ri-loader-4-line animate-spin"></i> Обработка...</>
                          ) : useCustomPrices ? (
                            <><i className="ri-check-line text-lg"></i> Одобри с персонализирани цени</>
                          ) : (
                            <><i className="ri-check-line text-lg"></i> Одобри с отстъпка</>
                          )}
                        </button>
                        <button
                          onClick={() => handleReviewOrder('reject')}
                          disabled={reviewLoading}
                          className="flex-1 min-w-[160px] py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                        >
                          {reviewLoading ? (
                            <><i className="ri-loader-4-line animate-spin"></i> Обработка...</>
                          ) : (
                            <><i className="ri-close-line text-lg"></i> Откажи поръчката</>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Статус */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Смяна на статус
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(s => (
                    <button
                      key={s.value}
                      onClick={() => updateOrderStatus(selectedOrder.id, s.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                        selectedOrder.status === s.value
                          ? s.color + ' ring-2 ring-offset-1 ring-teal-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Клиент + Адрес */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Клиент</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <i className="ri-user-line text-gray-400 mt-0.5"></i>
                      <span className="font-medium text-gray-900">{selectedOrder.shipping_address?.full_name || '—'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <i className="ri-phone-line text-gray-400 mt-0.5"></i>
                      <a href={`tel:${selectedOrder.customer_phone}`} className="text-teal-600 hover:underline">
                        {selectedOrder.customer_phone}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <i className="ri-mail-line text-gray-400 mt-0.5"></i>
                      <a href={`mailto:${selectedOrder.customer_email}`} className="text-teal-600 hover:underline break-all">
                        {selectedOrder.customer_email}
                      </a>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Адрес за доставка</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>{selectedOrder.shipping_address?.address || '—'}</p>
                    <p>{selectedOrder.shipping_address?.city}{selectedOrder.shipping_address?.postal_code ? `, ${selectedOrder.shipping_address.postal_code}` : ''}</p>
                    {selectedOrder.shipping_address?.notes && (
                      <p className="text-gray-500 italic mt-2">Бележка: {selectedOrder.shipping_address.notes}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Продукти */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Поръчани продукти</h3>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Продукт</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Кол.</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Единична цена</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Общо</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(selectedOrder.items || []).map((item, i) => {
                        const hasCarton = (item as any).carton_price > 0 && (item as any).pieces_per_carton > 0;
                        const cartons = hasCarton ? Math.floor(item.quantity / (item as any).pieces_per_carton) : 0;
                        return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.name}
                            {(item as any).sku && (
                              <span className="block text-[10px] text-gray-400 font-mono">Кат. № {(item as any).sku}</span>
                            )}
                            {hasCarton && (
                              <span className="block text-[10px] text-gray-500">
                                📦 Кашон x{(item as any).pieces_per_carton} бр. · €{((item as any).carton_price).toFixed(2)}/кашон
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">
                            {item.quantity}
                            {hasCarton && <span className="block text-[10px] text-gray-400">{cartons} кашона</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            <span className="block">€{Number(item.price).toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            <span className="block">€{(item.quantity * Number(item.price)).toFixed(2)}</span>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Общо:</td>
                        <td className="px-4 py-3">
                          <span className="text-base font-bold text-teal-700 block">€{Number(selectedOrder.total_amount).toFixed(2)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Бележки */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Бележки за проследяване / номер на пратка
                </label>
                <textarea
                  value={localNotes}
                  onChange={e => setLocalNotes(e.target.value)}
                  placeholder="Добавете номер на пратка, куриер, дата на изпращане..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  onClick={saveTrackingNotes}
                  disabled={savingNotes}
                  className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {savingNotes ? (
                    <><i className="ri-loader-4-line animate-spin mr-2"></i>Запазване...</>
                  ) : (
                    <><i className="ri-save-line mr-2"></i>Запази бележките</>
                  )}
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}