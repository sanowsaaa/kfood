import {
  b2bBody, b2bDependencies, type B2BDependencies, b2bEmail, B2BError, b2bFailure,
  b2bHash, b2bJson, b2bLimit, b2bRequest, b2bText, UUID_PATTERN,
} from '../_shared/b2b.ts';
import { deliverOrderNotifications } from '../_shared/notifications.ts';

export async function handleCod(req: Request, deps: B2BDependencies): Promise<Response> {
  try {
    const early = b2bRequest(req); if (early) return early;
    const body = await b2bBody(req);
    const attempt = body.attemptId || req.headers.get('idempotency-key');
    if (typeof attempt !== 'string' || !UUID_PATTERN.test(attempt)) {
      throw new B2BError(400, 'Липсва идентификатор на поръчката. Обновете страницата.');
    }
    if (body.promoCode || (body.promoDiscountPercent !== undefined && body.promoDiscountPercent !== 0)) {
      throw new B2BError(409, 'Премахнете промо кода, за да продължите.');
    }
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new B2BError(400, 'Невалидна количка.');
    const ids = new Set<number>();
    const items = body.items.map(item => {
      if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || item.id > 999999999 ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || ids.has(item.id)) {
        throw new B2BError(400, 'Невалиден продукт или количество.');
      }
      ids.add(item.id); return { id: item.id, quantity: item.quantity };
    }).sort((a, b) => a.id - b.id);
    const c = body.customer as Record<string, unknown> | undefined;
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new B2BError(400, 'Липсват данни за клиента.');
    const email = b2bEmail(c.email);
    const phone = b2bText(c.phone, 'телефон', 30).replace(/\s/g, '');
    if (!/^(\+359\d{8,9}|0\d{9})$/.test(phone)) throw new B2BError(400, 'Невалиден телефон.');
    const shipping = {
      full_name: b2bText(c.fullName, 'име', 120), address: b2bText(c.address, 'адрес', 300),
      city: b2bText(c.city, 'град', 100), postal_code: b2bText(c.postalCode, 'пощенски код', 20),
      notes: b2bText(c.notes ?? '', 'бележки', 500, false),
    };
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    await b2bLimit(deps, 'order', `cod-ip:${ip}`, 10);
    await b2bLimit(deps, 'order', `cod-email:${email}`, 5);
    const { data, error } = await deps.db.rpc('cod_create_order', {
      p_attempt: attempt.toLowerCase(), p_hash: await b2bHash(JSON.stringify({ items, email, phone, shipping })),
      p_items: items, p_email: email, p_phone: phone, p_shipping: shipping,
    });
    if (error) {
      if (/INVALID_|UNAVAILABLE|INSUFFICIENT_STOCK|ATTEMPT_CONFLICT/.test(error.message)) {
        throw new B2BError(409, 'Поръчката не може да се потвърди. Проверете наличностите и данните.');
      }
      throw new Error('COD transaction failed');
    }
    if (!data?.order?.id) throw new Error('COD order not confirmed');
    let emails: { type: string; success: boolean }[] = [];
    try { emails = await deliverOrderNotifications(deps, data.order.id); } catch { /* worker retries stored jobs */ }
    return b2bJson(req, { success: true, orderNumber: data.order.order_number,
      totalWithCOD: Number(data.order.total_amount).toFixed(2), emails });
  } catch (error) { return b2bFailure(req, error); }
}
export default { fetch: async (req: Request) => {
  try { return await handleCod(req, b2bDependencies()); } catch (error) { return b2bFailure(req, error); }
} };
