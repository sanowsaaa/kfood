type Result<T> = { data: T | null; error: unknown };

// A successful HTTP response can still represent zero affected rows under RLS.
export function confirmedRecord<T extends { id: string | number }>(result: Result<T>, expectedId?: string | number): T {
  if (result.error) throw result.error;
  if (!result.data || result.data.id == null || (expectedId != null && String(result.data.id) !== String(expectedId))) {
    throw new Error('Промяната не е потвърдена. Записът може да е премахнат или да нямате права за него. Обновете данните преди нов опит.');
  }
  return result.data;
}

export function checkedData<T>(result: Result<T>): T {
  if (result.error) throw result.error;
  if (result.data == null) throw new Error('Сървърът не върна очакваните данни. Опитайте да ги заредите отново.');
  return result.data;
}

export function adminErrorMessage(error: unknown, fallback = 'Действието не беше потвърдено. Обновете данните преди нов опит.'): string {
  const detail = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;
  if (detail?.code === '42501' || detail?.code === 'PGRST116') return 'Няма потвърден запис. Проверете правата си и обновете данните преди нов опит.';
  if (detail?.code === '23505') return 'Вече съществува запис с тези данни. Проверете ги преди нов опит.';
  if (detail?.code === '23503') return 'Записът е свързан с други данни и не може да бъде премахнат.';
  if (error instanceof Error && /[А-Яа-я]/.test(error.message)) return error.message;
  if (detail?.message && /fetch|network|timeout|abort/i.test(detail.message)) return 'Връзката със сървъра прекъсна. Резултатът е неизвестен — обновете данните преди нов опит.';
  return fallback;
}

export async function verifyAdminAccess(url: string, token: string, signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error('Проверката на достъпа временно не е достъпна. Опитайте отново.');
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('isAdmin' in result) || typeof result.isAdmin !== 'boolean') throw new Error('Сървърът не потвърди достъпа. Опитайте отново.');
  return result.isAdmin;
}

// Take the lock synchronously: two clicks in one render must not submit twice.
export function createActionLock() {
  let held = false;
  return { acquire() { if (held) return false; held = true; return true; }, release() { held = false; } };
}
