import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const INVOICE_API = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/generate-b2b-invoice';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

interface InvoiceData {
  id: string;
  order_id: string;
  invoice_number: string;
  company_name: string;
  company_bulstat: string | null;
  company_vat: string | null;
  company_address: string | null;
  company_city: string | null;
  company_postal_code: string | null;
  company_mol: string | null;
  company_email: string | null;
  company_phone: string | null;
  items: InvoiceItem[];
  original_total: number;
  discount_percent: number;
  discounted_total: number;
  vat_percent: number;
  vat_amount: number;
  total_with_vat: number;
  total_in_words: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface SellerInfo {
  name: string;
  nameLatin: string;
  bulstat: string;
  vat: string;
  address: string;
  city: string;
  postalCode: string;
  district: string;
  mol: string;
  iban: string;
  bank: string;
}

interface OrderInfo {
  order_number: string;
  created_at: string;
  shipping_address?: {
    address?: string;
    city?: string;
    postal_code?: string;
  };
}

export default function InvoicePage() {
  const { number } = useParams<{ number: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!number) return;
    setLoading(true);
    fetch(`${INVOICE_API}/${number}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInvoice(data.invoice);
          setSeller(data.seller);
          setOrderInfo(data.order_info);
        } else {
          setError(data.error || 'Търговският документ не е намерен');
        }
      })
      .catch(() => setError('Грешка при зареждане на документа'))
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600 text-sm">Зареждане на документа...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <i className="ri-error-warning-line text-3xl text-red-500"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Търговският документ не е намерен</h1>
          <p className="text-gray-500 text-sm">{error || 'Проверете номера и опитайте отново.'}</p>
        </div>
      </div>
    );
  }

  const items: InvoiceItem[] = invoice.items || [];
  const today = new Date().toLocaleDateString('bg-BG');
  const invoiceDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString('bg-BG')
    : today;

  return (
    <>
      {/* Print button — hidden in print */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-printer-line text-lg"></i>
          Печат
        </button>
      </div>

      {/* Invoice A4 */}
      <div className="no-print:hidden print:block min-h-screen bg-white flex justify-center p-0">
        <div className="w-full max-w-[210mm] bg-white p-[15mm] print:p-0" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">ТЪРГОВСКИ ДОКУМЕНТ</h1>
              <p className="text-sm text-gray-500 font-medium">
                № {invoice.invoice_number}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Дата на издаване</p>
              <p className="text-sm font-bold text-gray-900">{invoiceDate}</p>
              <p className="text-xs text-gray-500 mt-2 mb-1">Дата на данъчно събитие</p>
              <p className="text-sm font-bold text-gray-900">
                {orderInfo?.created_at ? new Date(orderInfo.created_at).toLocaleDateString('bg-BG') : invoiceDate}
              </p>
            </div>
          </div>

          {/* Seller + Buyer */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            {/* Seller */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Доставчик / Продавач</h3>
              {seller && (
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-gray-900 text-base">{seller.name}</p>
                  <p className="text-gray-600">ЕИК: <span className="font-mono font-semibold text-gray-800">{seller.bulstat}</span></p>
                  <p className="text-gray-600">ДДС №: <span className="font-mono font-semibold text-gray-800">{seller.vat}</span></p>
                  <p className="text-gray-600">Адрес: {seller.city} {seller.postalCode}, {seller.district}, {seller.address}</p>
                  <p className="text-gray-600">МОЛ: {seller.mol}</p>
                </div>
              )}
            </div>

            {/* Buyer */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Получател / Купувач</h3>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-gray-900 text-base">{invoice.company_name}</p>
                {invoice.company_bulstat && (
                  <p className="text-gray-600">ЕИК: <span className="font-mono font-semibold text-gray-800">{invoice.company_bulstat}</span></p>
                )}
                {invoice.company_vat && (
                  <p className="text-gray-600">ДДС №: <span className="font-mono font-semibold text-gray-800">{invoice.company_vat}</span></p>
                )}
                {invoice.company_mol && (
                  <p className="text-gray-600">МОЛ: {invoice.company_mol}</p>
                )}
                <p className="text-gray-600">
                  Адрес: {[invoice.company_city, invoice.company_postal_code, invoice.company_address].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Order reference */}
          {orderInfo && (
            <div className="mb-6 bg-gray-50 rounded-lg px-4 py-2.5 flex items-center gap-4 text-xs">
              <span className="text-gray-500">Поръчка:</span>
              <span className="font-mono font-bold text-gray-800">{orderInfo.order_number}</span>
              {invoice.payment_method === 'bank_transfer' && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Плащане:</span>
                  <span className="font-semibold text-gray-800">Банков превод</span>
                </>
              )}
            </div>
          )}

          {/* Items table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="border-y-2 border-gray-900">
                <th className="py-2.5 px-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">№</th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Описание</th>
                <th className="py-2.5 px-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">К-во</th>
                <th className="py-2.5 px-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Ед. цена</th>
                <th className="py-2.5 px-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Общо</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-3 px-2 text-sm text-gray-500">{i + 1}</td>
                  <td className="py-3 px-2 text-sm text-gray-900">
                    <span className="font-medium">{item.name}</span>
                    {item.sku && <span className="text-gray-400 text-xs ml-2">SKU: {item.sku}</span>}
                  </td>
                  <td className="py-3 px-2 text-sm text-center text-gray-700">{item.quantity}</td>
                  <td className="py-3 px-2 text-sm text-right text-gray-700 font-mono">{Number(item.price).toFixed(2)} €</td>
                  <td className="py-3 px-2 text-sm text-right text-gray-900 font-semibold font-mono">{(Number(item.price) * item.quantity).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Данъчна основа</span>
                <span className="font-mono font-semibold text-gray-800">{Number(invoice.original_total).toFixed(2)} €</span>
              </div>
              {invoice.discount_percent > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Отстъпка ({invoice.discount_percent}%)</span>
                  <span className="font-mono font-semibold text-red-600">
                    -{(Number(invoice.original_total) - Number(invoice.discounted_total)).toFixed(2)} €
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t border-gray-200">
                <span className="text-gray-500">Сума след отстъпка</span>
                <span className="font-mono font-semibold text-gray-800">{Number(invoice.discounted_total).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">ДДС {invoice.vat_percent}%</span>
                <span className="font-mono font-semibold text-gray-800">{Number(invoice.vat_amount).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-900 text-base">
                <span className="font-bold text-gray-900">Общо с ДДС</span>
                <span className="font-mono font-black text-gray-900">{Number(invoice.total_with_vat).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="mb-8 bg-gray-50 rounded-lg px-5 py-3 text-sm">
            <span className="text-gray-500 mr-2">Словом:</span>
            <span className="font-semibold text-gray-800 italic">{invoice.total_in_words}</span>
          </div>

          {/* Bank info — only if IBAN is set */}
          {seller?.iban && (
            <div className="mb-8 bg-gray-50 rounded-lg px-5 py-3 text-sm">
              <span className="text-gray-500 mr-2">Банкова сметка:</span>
              <span className="font-mono font-semibold text-gray-800">{seller.bank ? `${seller.bank} — ` : ''}IBAN: {seller.iban}</span>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8 text-sm text-gray-500 italic">
              Бележка: {invoice.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="flex justify-between mt-16 pt-8">
            <div className="text-center w-48">
              <div className="border-b border-gray-400 pb-1 mb-1"></div>
              <p className="text-xs text-gray-500">Съставил: .................................</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-gray-400 pb-1 mb-1"></div>
              <p className="text-xs text-gray-500">Получил: .................................</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400">
              {seller?.name || 'К-ФУУД ЕООД'} · ЕИК {seller?.bulstat || '208540947'} · {seller?.city || 'Велико Търново'}, {seller?.address || 'ул. Велчо Джамджията, 6'}
            </p>
          </div>
        </div>
      </div>

      {/* Non-print preview */}
      <div className="print:hidden min-h-screen bg-gray-100 py-8">
        <div className="max-w-[210mm] mx-auto bg-white shadow-sm" style={{ minHeight: '297mm' }}>
          <div className="p-[15mm]" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">ТЪРГОВСКИ ДОКУМЕНТ</h1>
                <p className="text-sm text-gray-500 font-medium">
                  № {invoice.invoice_number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Дата на издаване</p>
                <p className="text-sm font-bold text-gray-900">{invoiceDate}</p>
                <p className="text-xs text-gray-500 mt-2 mb-1">Дата на данъчно събитие</p>
                <p className="text-sm font-bold text-gray-900">
                  {orderInfo?.created_at ? new Date(orderInfo.created_at).toLocaleDateString('bg-BG') : invoiceDate}
                </p>
              </div>
            </div>

            {/* Seller + Buyer */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Доставчик / Продавач</h3>
                {seller && (
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-gray-900 text-base">{seller.name}</p>
                    <p className="text-gray-600">ЕИК: <span className="font-mono font-semibold text-gray-800">{seller.bulstat}</span></p>
                    <p className="text-gray-600">ДДС №: <span className="font-mono font-semibold text-gray-800">{seller.vat}</span></p>
                    <p className="text-gray-600">Адрес: {seller.city} {seller.postalCode}, {seller.district}, {seller.address}</p>
                    <p className="text-gray-600">МОЛ: {seller.mol}</p>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Получател / Купувач</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-gray-900 text-base">{invoice.company_name}</p>
                  {invoice.company_bulstat && (
                    <p className="text-gray-600">ЕИК: <span className="font-mono font-semibold text-gray-800">{invoice.company_bulstat}</span></p>
                  )}
                  {invoice.company_vat && (
                    <p className="text-gray-600">ДДС №: <span className="font-mono font-semibold text-gray-800">{invoice.company_vat}</span></p>
                  )}
                  {invoice.company_mol && (
                    <p className="text-gray-600">МОЛ: {invoice.company_mol}</p>
                  )}
                  <p className="text-gray-600">
                    Адрес: {[invoice.company_city, invoice.company_postal_code, invoice.company_address].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order reference */}
            {orderInfo && (
              <div className="mb-6 bg-gray-50 rounded-lg px-4 py-2.5 flex items-center gap-4 text-xs">
                <span className="text-gray-500">Поръчка:</span>
                <span className="font-mono font-bold text-gray-800">{orderInfo.order_number}</span>
                {invoice.payment_method === 'bank_transfer' && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">Плащане:</span>
                    <span className="font-semibold text-gray-800">Банков превод</span>
                  </>
                )}
              </div>
            )}

            {/* Items table */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="border-y-2 border-gray-900">
                  <th className="py-2.5 px-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">№</th>
                  <th className="py-2.5 px-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Описание</th>
                  <th className="py-2.5 px-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">К-во</th>
                  <th className="py-2.5 px-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Ед. цена</th>
                  <th className="py-2.5 px-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Общо</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-3 px-2 text-sm text-gray-500">{i + 1}</td>
                    <td className="py-3 px-2 text-sm text-gray-900">
                      <span className="font-medium">{item.name}</span>
                      {item.sku && <span className="text-gray-400 text-xs ml-2">SKU: {item.sku}</span>}
                    </td>
                    <td className="py-3 px-2 text-sm text-center text-gray-700">{item.quantity}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-700 font-mono">{Number(item.price).toFixed(2)} €</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900 font-semibold font-mono">{(Number(item.price) * item.quantity).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Данъчна основа</span>
                  <span className="font-mono font-semibold text-gray-800">{Number(invoice.original_total).toFixed(2)} €</span>
                </div>
                {invoice.discount_percent > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Отстъпка ({invoice.discount_percent}%)</span>
                    <span className="font-mono font-semibold text-red-600">
                      -{(Number(invoice.original_total) - Number(invoice.discounted_total)).toFixed(2)} €
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-t border-gray-200">
                  <span className="text-gray-500">Сума след отстъпка</span>
                  <span className="font-mono font-semibold text-gray-800">{Number(invoice.discounted_total).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">ДДС {invoice.vat_percent}%</span>
                  <span className="font-mono font-semibold text-gray-800">{Number(invoice.vat_amount).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-gray-900 text-base">
                  <span className="font-bold text-gray-900">Общо с ДДС</span>
                  <span className="font-mono font-black text-gray-900">{Number(invoice.total_with_vat).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <div className="mb-8 bg-gray-50 rounded-lg px-5 py-3 text-sm">
              <span className="text-gray-500 mr-2">Словом:</span>
              <span className="font-semibold text-gray-800 italic">{invoice.total_in_words}</span>
            </div>

            {/* Bank info */}
            {seller?.iban && (
              <div className="mb-8 bg-gray-50 rounded-lg px-5 py-3 text-sm">
                <span className="text-gray-500 mr-2">Банкова сметка:</span>
                <span className="font-mono font-semibold text-gray-800">{seller.bank ? `${seller.bank} — ` : ''}IBAN: {seller.iban}</span>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8 text-sm text-gray-500 italic">
                Бележка: {invoice.notes}
              </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between mt-16 pt-8">
              <div className="text-center w-48">
                <div className="border-b border-gray-400 pb-1 mb-1"></div>
                <p className="text-xs text-gray-500">Съставил: .................................</p>
              </div>
              <div className="text-center w-48">
                <div className="border-b border-gray-400 pb-1 mb-1"></div>
                <p className="text-xs text-gray-500">Получил: .................................</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-gray-200 text-center">
              <p className="text-[10px] text-gray-400">
                {seller?.name || 'К-ФУУД ЕООД'} · ЕИК {seller?.bulstat || '208540947'} · {seller?.city || 'Велико Търново'}, {seller?.address || 'ул. Велчо Джамджията, 6'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}