import { useEffect, useState } from 'react';

/**
 * useState с persist в localStorage. Безопасен к ошибкам localStorage (приватный
 * режим, отключённое хранилище — fallback на in-memory).
 */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
  }, [key, state]);

  return [state, setState];
}
