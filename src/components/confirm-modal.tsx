import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => confirmRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && document.activeElement === confirmRef.current) onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel, onConfirm]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[300] bg-bg/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-app bg-bg-elevated border-t border-border sm:border sm:rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className={danger ? 'text-danger' : 'text-accent'} />
            <h3 id="confirm-title" className="display-title text-xl">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-text-muted active:text-text p-1" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-text-muted leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-border text-text-muted text-sm active:border-accent"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={
              'flex-1 py-3 rounded-lg font-medium text-sm active:scale-95 ' +
              (danger ? 'bg-danger text-bg' : 'bg-accent text-bg')
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Хук-обёртка для удобства: возвращает state + function для запроса подтверждения
import { useState, useCallback } from 'react';
interface PendingConfirm extends Omit<Props, 'onConfirm' | 'onCancel'> {
  resolve: (ok: boolean) => void;
}
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirm = useCallback(
    (opts: Omit<Props, 'onConfirm' | 'onCancel'>) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
      }),
    [],
  );
  const node = pending ? (
    <ConfirmModal
      {...pending}
      onConfirm={() => { pending.resolve(true); setPending(null); }}
      onCancel={() => { pending.resolve(false); setPending(null); }}
    />
  ) : null;
  return { confirm, node };
}
