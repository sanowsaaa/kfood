import { useCallback, useEffect, useRef, useState } from 'react';
import { adminErrorMessage } from '@/utils/admin';

export function useAdminRead() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { ++generation.current; }, []);
  const load = useCallback(async <T,>(request: () => Promise<T>, apply: (data: T) => void) => {
    const ticket = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const data = await request();
      if (ticket === generation.current) apply(data);
    } catch (cause) {
      if (ticket === generation.current) setError(adminErrorMessage(cause, 'Данните не са заредени. Опитайте отново.'));
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);
  const reset = useCallback(() => { ++generation.current; setLoading(false); setError(null); }, []);
  return { loading, error, load, reset };
}
