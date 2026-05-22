import { useState } from 'react';
import { Calendar, X, Check } from 'lucide-react';

interface DatePickerModalProps {
  title?: string;
  initialDate?: Date;
  onConfirm: (ts: number) => void;
  onClose: () => void;
}

export function DatePickerModal({ title, initialDate, onConfirm, onClose }: DatePickerModalProps) {
  const today = new Date();
  const init = initialDate ?? today;
  const toValue = (d: Date) => d.toISOString().slice(0, 10);

  const [value, setValue] = useState(toValue(init));

  const handleConfirm = () => {
    const d = new Date(value + 'T12:00:00');
    onConfirm(d.getTime());
  };

  const max = toValue(today);

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
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            <h3 className="display-title text-2xl">{title ?? 'Дата просмотра'}</h3>
          </div>
          <button onClick={onClose} className="text-text-muted active:text-text p-1">
            <X size={22} />
          </button>
        </div>

        <input
          type="date"
          value={value}
          max={max}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-base text-text focus:outline-none focus:border-accent mb-5"
          style={{ colorScheme: 'dark' }}
        />

        <div className="flex gap-2">
          <button
            onClick={() => { setValue(toValue(today)); }}
            className="flex-1 rounded-lg border border-border bg-bg p-3 text-sm text-text-muted active:border-accent"
          >
            Сегодня
          </button>
          <button
            disabled={!value}
            onClick={handleConfirm}
            className="flex-[2] rounded-lg bg-accent text-bg p-3 font-medium disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={16} /> Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
