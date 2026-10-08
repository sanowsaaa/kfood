import { useRef, useState } from 'react';
import { adminErrorMessage, createActionLock } from '@/utils/admin';

export type AdminMessage = { type: 'success' | 'error' | 'info'; text: string };

export function useAdminAction() {
  const lock = useRef(createActionLock());
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<AdminMessage | null>(null);
  const run = async (key: string, task: () => Promise<void>, success?: string) => {
    if (!lock.current.acquire()) return false;
    setPending(key);
    setMessage(null);
    try { await task(); if (success) setMessage({ type: 'success', text: success }); return true; }
    catch (error) { setMessage({ type: 'error', text: adminErrorMessage(error) }); return false; }
    finally { lock.current.release(); setPending(null); }
  };
  return { run, pending, message, setMessage, clearMessage: () => setMessage(null) };
}
