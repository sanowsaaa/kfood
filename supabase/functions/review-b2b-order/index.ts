import {
  b2bAdmin, b2bBody, b2bDependencies, type B2BDependencies, B2BError,
  b2bFailure, b2bJson, b2bRequest, b2bText, b2bUser, UUID_PATTERN,
} from '../_shared/b2b.ts';

export async function handleReview(req: Request, deps: B2BDependencies): Promise<Response> {
  try {
    const early = b2bRequest(req); if (early) return early;
    const user = await b2bUser(req, deps);
    if (!await b2bAdmin(user, deps)) throw new B2BError(403, 'Нямате администраторски достъп.');
    const body = await b2bBody(req);
    if (typeof body.order_id !== 'string' || !UUID_PATTERN.test(body.order_id) ||
      !['approve', 'reject'].includes(String(body.action))) throw new B2BError(400, 'Невалидно действие.');
    const discount = body.discount_percent ?? 0;
    if (typeof discount !== 'number' || !Number.isFinite(discount) || discount < 0 || discount >= 100) {
      throw new B2BError(400, 'Отстъпката трябва да е от 0% до под 100%.');
    }
    const lines = body.line_items ?? null;
    if (lines !== null && (!Array.isArray(lines) || lines.length > 50 || lines.some((line) =>
      !line || !Number.isSafeInteger(line.id) || line.id <= 0 ||
      typeof line.unit_price !== 'number' || !Number.isFinite(line.unit_price) || line.unit_price <= 0 || line.unit_price > 100000 ||
      typeof line.carton_price !== 'number' || !Number.isFinite(line.carton_price) || line.carton_price <= 0 || line.carton_price > 100000
    ))) throw new B2BError(400, 'Всички персонални цени трябва да са положителни.');
    const { data, error } = await deps.db.rpc('b2b_review_order', {
      p_order: body.order_id, p_actor: user.id, p_action: body.action, p_discount: discount,
      p_notes: b2bText(body.discount_notes ?? '', 'бележки', 500, false), p_lines: lines,
    });
    if (error) {
      if (error.message.includes('ORDER_NOT_FOUND')) throw new B2BError(404, 'Поръчката не е намерена.');
      if (/INVALID_|INCONSISTENT_PRICE|ORDER_NOT_REVIEWABLE/.test(error.message)) {
        throw new B2BError(409, 'Проверете цените и текущия статус на поръчката.');
      }
      throw new Error('Order review transaction failed');
    }
    if (data?.success !== true) throw new Error('Order review not confirmed');
    return b2bJson(req, data);
  } catch (error) { return b2bFailure(req, error); }
}
export default { fetch: async (req: Request) => {
  try { return await handleReview(req, b2bDependencies()); }
  catch (error) { return b2bFailure(req, error); }
} };
