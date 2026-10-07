export type CheckoutAttempt = { fingerprint: string; id: string; token: string; createdAt: number };
export const ATTEMPT_KEY = 'kfood_checkout_attempt_v1';
export function clearCheckoutAttempt(statusToken: string, storage: Storage): void {
  let saved: CheckoutAttempt | null = null;
  try { saved = JSON.parse(storage.getItem(ATTEMPT_KEY) || 'null'); } catch { return; }
  // A late status response for an older order must not remove a newer attempt.
  if (saved?.token === statusToken) storage.removeItem(ATTEMPT_KEY);
}
export function cartSignature(items: { id: number; quantity: number }[]): string {
  return JSON.stringify(items.map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id - b.id));
}
export function getCheckoutAttempt(fingerprint: string, storage: Storage, now = Date.now()): CheckoutAttempt {
  let saved: CheckoutAttempt | null = null;
  try { saved = JSON.parse(storage.getItem(ATTEMPT_KEY) || 'null'); } catch { /* replace corrupt data */ }
  if (saved?.fingerprint === fingerprint && /^[0-9a-f]{64}$/.test(saved.token) &&
      /^[0-9a-f-]{36}$/.test(saved.id) && saved.createdAt <= now && now - saved.createdAt < 65 * 60_000) {
    return saved;
  }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('');
  const attempt = { fingerprint, id: crypto.randomUUID(), token, createdAt: now };
  // Storage failure must prevent redirect: this proof is required to read status.
  storage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  return attempt;
}
