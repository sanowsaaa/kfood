import type { AdminMessage } from '@/hooks/useAdminAction';

export default function AdminFeedback({ message, onDismiss, onRetry }: { message: AdminMessage | null; onDismiss?: () => void; onRetry?: () => void }) {
  if (!message) return null;
  const styles = message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-800';
  return (
    <div role={message.type === 'error' ? 'alert' : 'status'} className={`my-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${styles}`}>
      <i aria-hidden="true" className={`${message.type === 'error' ? 'ri-error-warning-line' : message.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-information-line'} text-lg`} />
      <p className="flex-1 leading-relaxed">{message.text}</p>
      {onRetry && <button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-current px-3 py-1.5 font-semibold">Обнови</button>}
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Затвори съобщението" className="shrink-0 p-1"><i aria-hidden="true" className="ri-close-line text-lg" /></button>}
    </div>
  );
}
