import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const CHECK_USER_URL = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/check-user';

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isAdmin: false, loading: false, error: null });
        return;
      }

      const response = await fetch(CHECK_USER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setState({ isAdmin: false, loading: false, error: null });
        return;
      }

      const result = await response.json();
      setState({ isAdmin: result.isAdmin, loading: false, error: null });
    } catch {
      setState({ isAdmin: false, loading: false, error: null });
    }
  };

  return state;
}