import { useEffect, useRef } from 'react';

/**
 * Хук для модалок: Esc -> close, focus trap на Tab.
 * Использовать так:
 *   const ref = useModalA11y(onClose);
 *   <div ref={ref}>...</div>
 */
export function useModalA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  // Сохраним последний onClose в ref, чтобы не пересоздавать listener
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prevActive = document.activeElement as HTMLElement | null;

    // Запомним первый фокусируемый элемент и поставим туда фокус
    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('data-modal-skip-focus'));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0]!;
      const last = els[els.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !node.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Если ещё нет фокуса внутри — фокус на первый
    setTimeout(() => {
      const els = focusables();
      if (els.length && !node.contains(document.activeElement)) {
        els[0]!.focus();
      }
    }, 30);

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Возвращаем фокус откуда пришли
      if (prevActive && typeof prevActive.focus === 'function') {
        try { prevActive.focus(); } catch { /* ignore */ }
      }
    };
  }, []);

  return ref;
}
