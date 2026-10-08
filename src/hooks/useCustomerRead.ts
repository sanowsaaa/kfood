import { useEffect, useState } from 'react';

export function useCustomerRead<T>(load: (signal: AbortSignal) => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setLoading(true); setError('');
    void load(controller.signal).then(value => { if (current) setData(value); }).catch(() => {
      if (current) setError('Не успяхме да заредим данните. Проверете връзката и опитайте отново.');
    }).finally(() => { clearTimeout(timeout); if (current) setLoading(false); });
    return () => { current = false; clearTimeout(timeout); controller.abort(); };
  }, [load, revision]);
  return { data, loading, error, retry: () => setRevision(value => value + 1) };
}
