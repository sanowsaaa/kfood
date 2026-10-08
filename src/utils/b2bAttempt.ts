type Attempt = { id: string; fingerprint: string };
const KEY = 'b2b_request_attempt';
export function b2bRequestAttempt(fingerprint: string, storage: Storage = sessionStorage): string {
  try {
    const previous: Attempt = JSON.parse(storage.getItem(KEY) || 'null');
    if (previous?.fingerprint === fingerprint && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(previous.id)) return previous.id;
  } catch { /* ignore an invalid saved attempt */ }
  const id = crypto.randomUUID();
  storage.setItem(KEY, JSON.stringify({ id, fingerprint }));
  return id;
}
export function finishB2BAttempt(id: string, storage: Storage = sessionStorage): void {
  try {
    if (JSON.parse(storage.getItem(KEY) || 'null')?.id === id) storage.removeItem(KEY);
  } catch { /* nothing valid to clear */ }
}
