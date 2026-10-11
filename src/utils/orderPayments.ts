export interface OrderPayment {
  payment_method?: string | null;
  stripe_session_id?: string | null;
  payment_state?: string | null;
  payment_livemode?: boolean | null;
  payment_paid_at?: string | null;
}

export const fulfillmentStatuses = new Set(['approved', 'confirmed', 'processing', 'shipped', 'delivered']);
export const isCardOrder = (order: OrderPayment) => order.payment_method === 'stripe' || !!order.stripe_session_id || order.payment_state != null;
const hasPaymentTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
export const canFulfillOrder = (order: OrderPayment) => !isCardOrder(order) || (
  order.payment_state === 'paid' && order.payment_livemode === true && hasPaymentTime(order.payment_paid_at)
);

export function paymentPresentation(order: OrderPayment) {
  const amber = 'bg-amber-100 text-amber-900';
  const states: Record<string, { label: string; detail: string; color: string }> = {
    pending: { label: 'Неплатена', detail: 'Checkout е създаден. Плащането още не е потвърдено.', color: amber },
    awaiting_payment: { label: 'Чака потвърждение', detail: 'Stripe обработва плащането. Все още няма потвърждение за получена сума.', color: amber },
    paid: { label: 'Платена', detail: 'Плащането е проверено и записано от сървъра.', color: 'bg-emerald-100 text-emerald-900' },
    failed: { label: 'Неуспешно плащане', detail: 'Плащането е неуспешно. Поръчката не е платена.', color: 'bg-red-100 text-red-900' },
    expired: { label: 'Изтекло плащане', detail: 'Сесията за плащане е изтекла без успешно плащане.', color: 'bg-slate-100 text-slate-800' },
    review: { label: 'Плащане за преглед', detail: 'Има несъответствие в плащането. Необходимо е да се провери в Stripe.', color: 'bg-red-100 text-red-900' },
  };
  const unknown = { label: 'Непотвърдено плащане', detail: 'Няма сървърно потвърждение за плащане. Статусът на изпълнение не доказва получена сума.', color: amber };
  const result = order.payment_state === 'paid' && !hasPaymentTime(order.payment_paid_at)
    ? unknown : states[order.payment_state || ''] || unknown;
  if (order.payment_livemode === false) return {
    label: `Тестова: ${result.label.toLocaleLowerCase('bg-BG')}`,
    detail: `Тестова Stripe поръчка — няма реално плащане. ${result.detail}`,
    color: amber,
  };
  return order.payment_state === 'paid' && order.payment_livemode !== true ? unknown : result;
}

export function decodeAdminOrders<T>(rows: unknown): Array<T & OrderPayment> {
  if (!Array.isArray(rows)) throw new Error('Платежните данни не са заредени. Обновете списъка.');
  return rows.map(row => {
    if (!row || typeof row.order_data?.id !== 'string' || !('payment_state' in row)
      || !('payment_livemode' in row) || !('payment_paid_at' in row)
      || (row.payment_state !== null && typeof row.payment_state !== 'string')
      || (row.payment_livemode !== null && typeof row.payment_livemode !== 'boolean')
      || (row.payment_paid_at !== null && !hasPaymentTime(row.payment_paid_at))) {
      throw new Error('Платежните данни не са потвърдени. Обновете списъка.');
    }
    return { ...row.order_data, payment_state: row.payment_state, payment_livemode: row.payment_livemode, payment_paid_at: row.payment_paid_at };
  });
}
