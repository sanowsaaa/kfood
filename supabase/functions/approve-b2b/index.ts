import {
  b2bAdmin, b2bBody, b2bDependencies, type B2BDependencies, B2BError,
  b2bFailure, b2bJson, b2bRequest, b2bText, b2bUser, UUID_PATTERN,
} from '../_shared/b2b.ts';
import { deliverNotifications } from '../_shared/notifications.ts';

export async function handleApprove(req: Request, deps: B2BDependencies): Promise<Response> {
  try {
    const early = b2bRequest(req); if (early) return early;
    const user = await b2bUser(req, deps);
    if (!await b2bAdmin(user, deps)) throw new B2BError(403, 'Нямате администраторски достъп.');
    const body = await b2bBody(req);
    if (typeof body.application_id !== 'string' || !UUID_PATTERN.test(body.application_id)) {
      throw new B2BError(400, 'Невалидна кандидатура.');
    }
    const notes = b2bText(body.review_notes ?? '', 'бележки', 2000, false);
    const { data, error } = await deps.db.rpc('b2b_approve_application', {
      p_application: body.application_id, p_actor: user.id, p_notes: notes,
    });
    if (error) {
      if (error.message.includes('APPLICATION_NOT_FOUND')) throw new B2BError(404, 'Кандидатурата не е намерена.');
      if (error.message.includes('INVALID_COMPANY_EMAIL')) throw new B2BError(409, 'Поправете фирмения имейл преди одобрение.');
      throw new Error('Approval transaction failed');
    }
    if (!data?.company_id) throw new Error('Approval not confirmed');
    let emailSent = data.email_sent === true;
    let recipient = data.email;
    if (data.notification_id && !emailSent) {
      // Delivery errors do not undo a committed approval; the persistent job is retried.
      try { await deliverNotifications(deps, data.notification_id); } catch { /* durable job remains pending/review */ }
      const result = await deps.db.from('notification_outbox').select('state,recipient')
        .eq('id', data.notification_id).single();
      emailSent = !result.error && result.data?.state === 'sent';
      recipient = result.data?.recipient || recipient;
    }
    return b2bJson(req, { success: true, company_id: data.company_id, email_sent: emailSent,
      email: recipient, email_error: emailSent ? '' : 'Изпращането още не е потвърдено.',
      message: emailSent ? 'Кандидатурата е одобрена и имейлът е приет за изпращане.'
        : 'Кандидатурата е одобрена. Известието е запазено за изпращане.' });
  } catch (error) { return b2bFailure(req, error); }
}
export default { fetch: async (req: Request) => {
  try { return await handleApprove(req, b2bDependencies()); }
  catch (error) { return b2bFailure(req, error); }
} };
