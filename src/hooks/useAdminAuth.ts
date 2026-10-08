import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { verifyAdminAccess } from '@/utils/admin';

interface AdminAuthState { isAdmin: boolean; loading: boolean; error: string | null; }
const CHECK_USER_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/check-user`;

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({ isAdmin: false, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let currentToken: string | null | undefined;
    const check = async () => {
      const request = ++generation.current;
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      const timeout = setTimeout(() => requestController.abort(), 20000);
      setState({ isAdmin: false, loading: true, error: null });
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        currentToken = session?.access_token ?? null;
        const isAdmin = session ? await verifyAdminAccess(CHECK_USER_URL, session.access_token, requestController.signal) : false;
        if (active && request === generation.current) setState({ isAdmin, loading: false, error: null });
      } catch {
        if (active && request === generation.current) setState({ isAdmin: false, loading: false, error: 'Проверете връзката си и опитайте отново.' });
      } finally { clearTimeout(timeout); }
    };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        ++generation.current;
        controller?.abort();
        currentToken = null;
        setState({ isAdmin: false, loading: false, error: null });
      } else if (event !== 'INITIAL_SESSION' && session?.access_token !== currentToken) {
        setState({ isAdmin: false, loading: true, error: null });
        // Leave the Supabase auth callback before calling another auth method.
        queueMicrotask(() => { if (active) void check(); });
      }
    });
    return () => { active = false; ++generation.current; controller?.abort(); subscription.unsubscribe(); };
  }, [attempt]);

  return { ...state, retry };
}
