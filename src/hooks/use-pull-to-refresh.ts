import { useEffect, useState, useCallback, useRef } from 'react';

const PULL_TRIGGER = 70;
const PULL_MAX = 110;
const PULL_DAMPING = 0.5;

interface State {
  pulling: boolean;
  distance: number;
  refreshing: boolean;
}

/**
 * Pull-to-refresh для мобильных списочных страниц.
 * Активируется только когда window.scrollY === 0 и пользователь тянет вниз.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [state, setState] = useState<State>({ pulling: false, distance: 0, refreshing: false });
  const cb = useCallback(() => Promise.resolve(onRefresh()), [onRefresh]);
  const distanceRef = useRef(0);

  useEffect(() => {
    let startY = 0;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      const t = e.touches[0];
      if (!t) return;
      startY = t.clientY;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      if (window.scrollY > 0) { active = false; return; }
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY;
      if (dy <= 0) return;
      const distance = Math.min(PULL_MAX, dy * PULL_DAMPING);
      distanceRef.current = distance;
      if (distance > 5 && e.cancelable) e.preventDefault();
      setState((s) => ({ ...s, pulling: true, distance }));
    };

    const onTouchEnd = async () => {
      if (!active) return;
      active = false;
      const distance = distanceRef.current;
      distanceRef.current = 0;
      setState({ pulling: false, distance: 0, refreshing: distance >= PULL_TRIGGER });
      if (distance >= PULL_TRIGGER) {
        try { await cb(); } catch { /* ignore */ }
        setState({ pulling: false, distance: 0, refreshing: false });
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove as EventListener);
      document.removeEventListener('touchend', onTouchEnd as EventListener);
      document.removeEventListener('touchcancel', onTouchEnd as EventListener);
    };
  }, [cb]);

  return state;
}
