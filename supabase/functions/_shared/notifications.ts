import type { B2BDependencies } from './b2b.ts';
import { b2bEscape } from './b2b.ts';
import { getApprovalEmail } from './approval-email.ts';
import { codTemplates, type CodSnapshot } from './cod-emails.ts';

type MailDeps = Pick<B2BDependencies, 'db' | 'mail' | 'resendKey' | 'resendDomain'>;
export type Notification = {
  id: string; lease_id: string; kind: string; recipient: string | null;
  snapshot: Record<string, unknown>; payload: Record<string, unknown> | null;
};
function payload(job: Notification, deps: MailDeps): Record<string, unknown> {
  const s = job.snapshot;
  if (job.kind === 'b2b_approval') {
    const site = new URL(Deno.env.get('SITE_URL') || 'https://k-foodvelikotarnovo.com');
    if (site.protocol !== 'https:' || site.username || site.password) throw new Error('Invalid site URL');
    return {
      from: `K-FOOD <noreply@${deps.resendDomain || 'k-foodvelikotarnovo.com'}>`,
      to: [job.recipient],
      subject: `Вашата B2B апликация е одобрена! Company ID: ${s.company_id}`,
      html: getApprovalEmail(b2bEscape(s.company_name), b2bEscape(s.first_name),
        b2bEscape(s.company_id), b2bEscape(site.origin)),
    };
  }
  if (['cod_admin', 'cod_boss', 'cod_customer'].includes(job.kind)) {
    const order = s as unknown as CodSnapshot;
    const templates = codTemplates(order);
    const customer = job.kind === 'cod_customer';
    const boss = job.kind === 'cod_boss';
    return {
      from: deps.resendDomain ? `K-FOOD Поръчки <noreply@${deps.resendDomain}>` : 'K-FOOD Поръчки <onboarding@resend.dev>',
      to: [customer ? job.recipient : boss ? 'nasko1332@gmail.com' : 'kfoodstore.bg@gmail.com'],
      subject: customer ? 'Потвърждение на поръчка - Наложен платеж'
        : boss ? `Нова B2C поръчка! ${order.order_number} - ${order.shipping_address.full_name}`
        : `Нова поръчка с наложен платеж - ${order.shipping_address.full_name}`,
      html: customer ? templates.customerEmailHtml : boss ? templates.bossEmailHtml : templates.adminEmailHtml,
    };
  }
  throw new Error('Unknown notification kind');
}
// The transaction creates the job. Delivery never accepts a browser recipient or body.
export async function deliverNotifications(deps: MailDeps, id: string | null = null): Promise<number> {
  if (!deps.resendKey) return 0;
  const { data: jobs, error } = await deps.db.rpc('notification_claim', { p_id: id, p_limit: 5 });
  if (error || !Array.isArray(jobs)) throw new Error('Notification claim failed');
  let sent = 0;
  for (const job of jobs as Notification[]) {
    let success = false;
    try {
      const { data: body, error: saveError } = await deps.db.rpc('notification_prepare', {
        p_id: job.id, p_lease: job.lease_id, p_payload: job.payload || payload(job, deps),
      });
      if (saveError || !body) throw new Error('Notification payload persistence failed');
      const response = await deps.mail('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${deps.resendKey}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `kfood-notification-${job.id}` },
        body: JSON.stringify(body),
      });
      success = response.ok;
      await response.body?.cancel();
    } catch {
      console.error(JSON.stringify({ notification_id: job.id, reason: 'NOTIFICATION_ATTEMPT_FAILED' }));
    }
    const { error: finishError } = await deps.db.rpc('notification_finish', {
      p_id: job.id, p_lease: job.lease_id, p_success: success,
    });
    if (finishError) throw new Error('Notification completion failed');
    if (success) sent++;
  }
  return sent;
}

export async function deliverOrderNotifications(deps: MailDeps, orderId: string) {
  const { data, error } = await deps.db.from('notification_outbox').select('id,state,kind')
    .eq('entity_id', orderId).in('kind', ['cod_admin', 'cod_boss', 'cod_customer']);
  if (error || !data?.length) throw new Error('Stored order notifications not found');
  for (const job of data) {
    if (job.state === 'sent') continue;
    try { await deliverNotifications(deps, job.id); } catch { /* persistent queue retains the failure */ }
  }
  const result = await deps.db.from('notification_outbox').select('kind,state').eq('entity_id', orderId)
    .in('kind', ['cod_admin', 'cod_boss', 'cod_customer']);
  if (result.error || !result.data?.length) throw new Error('Notification status unavailable');
  return result.data.map(job => ({ type: job.kind.replace('cod_', ''), success: job.state === 'sent' }));
}
