import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import clsx from 'clsx';

const SHOW_AFTER = 600;

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > SHOW_AFTER));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollUp}
      aria-label="Наверх"
      className={clsx(
        'fixed right-3 z-40 w-10 h-10 rounded-full bg-bg-elevated border border-border shadow-lg flex items-center justify-center text-text-muted active:text-accent active:scale-90 transition-all',
        show ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2',
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
    >
      <ArrowUp size={18} strokeWidth={1.8} />
    </button>
  );
}
