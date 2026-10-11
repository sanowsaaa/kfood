import {
  b2bAdmin, b2bBody, b2bDependencies, type B2BDependencies, B2BError,
  b2bFailure, b2bJson, b2bRequest, b2bUser, UUID_PATTERN,
} from '../_shared/b2b.ts';
import { deliverOrderNotifications } from '../_shared/notifications.ts';

export async function handleCodNotification(req: Request, deps: B2BDependencies): Promise<Response> {
  try {
    const early = b2bRequest(req); if (early) return early;
    const user = await b2bUser(req, deps);
    if (!await b2bAdmin(user, deps)) throw new B2BError(403, 'Нямате администраторски достъп.');
    const body = await b2bBody(req);
    if (typeof body.orderId !== 'string' || !UUID_PATTERN.test(body.orderId)) throw new B2BError(400, 'Изберете записана поръчка.');
    const { data, error } = await deps.db.from('orders').select('id,payment_method,is_b2b_order')
      .eq('id', body.orderId).single();
    if (error || !data) throw new B2BError(404, 'Поръчката не е намерена.');
    if (data.payment_method !== 'cod' || data.is_b2b_order) throw new B2BError(409, 'Невалиден тип поръчка.');
    const emails = await deliverOrderNotifications(deps, data.id);
    return b2bJson(req, { success: emails.every(email => email.success), emails });
  } catch (error) { return b2bFailure(req, error); }
}
export default { fetch: async (req: Request) => {
  try { return await handleCodNotification(req, b2bDependencies()); } catch (error) { return b2bFailure(req, error); }
} };
