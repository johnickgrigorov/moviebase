import { useState } from 'react';
import { Star, X, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface RatingModalProps {
  currentScore: number | undefined;
  onSubmit: (score: number) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  onClose: () => void;
}

export function RatingModal({ currentScore, onSubmit, onRemove, onClose }: RatingModalProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(currentScore ?? 0);
  const display = hovered ?? selected;

  return (
    <div
      className="fixed inset-0 z-[100] bg-bg/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-app bg-bg-elevated border-t border-border sm:border sm:rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="display-title text-2xl">Ваша оценка</h3>
          <button onClick={onClose} className="text-text-muted active:text-text">
            <X size={22} />
          </button>
        </div>

        <div className="flex justify-center mb-2">
          <div className="font-mono text-4xl text-accent">
            {display > 0 ? display : '—'}
            <span className="text-text-dim text-2xl">/10</span>
          </div>
        </div>

        <div className="flex justify-center gap-1 mb-6">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(n)}
              className={clsx(
                'p-1 transition-transform active:scale-90',
                n <= display ? 'text-accent' : 'text-text-dim',
              )}
            >
              <Star size={22} fill={n <= display ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {currentScore !== undefined && (
            <button
              onClick={() => void onRemove()}
              className="flex-1 rounded-lg border border-border bg-bg p-3 text-text-muted flex items-center justify-center gap-2 active:scale-95"
            >
              <Trash2 size={16} /> Убрать
            </button>
          )}
          <button
            disabled={selected === 0}
            onClick={() => void onSubmit(selected)}
            className="flex-[2] rounded-lg bg-accent text-bg p-3 font-medium disabled:opacity-40 active:scale-95 glow-amber"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
