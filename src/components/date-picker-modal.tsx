import { useState } from 'react';
import { Calendar, X, Check } from 'lucide-react';
import { useModalA11y } from '../hooks/use-modal-a11y';

interface DatePickerModalProps {
  title?: string;
  initialDate?: Date;
  onConfirm: (ts: number) => void | Promise<void>;
  onClose: () => void;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DatePickerModal({ title, initialDate, onConfirm, onClose }: DatePickerModalProps) {
  const today = new Date();
  const init = initialDate ?? today;

  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState(init.getDate());
  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(init.getFullYear());

  const maxYear = today.getFullYear();
  const minYear = maxYear - 50;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  // Корректируем день если месяц/год изменился и день стал невалидным
  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);

  const isToday = year === today.getFullYear() && month === today.getMonth() && safeDay === today.getDate();
  const isFuture = new Date(year, month, safeDay) > today;

  const handleConfirm = async () => {
    if (isFuture || busy) return;
    setBusy(true);
    try {
      const ts = new Date(year, month, safeDay, 12, 0, 0).getTime();
      await onConfirm(ts);
      onClose();
    } catch (err) {
      console.error('[DatePickerModal] onConfirm error:', err);
      setBusy(false);
    }
  };

  const setToday = () => {
    setDay(today.getDate());
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const selectClass = "bg-bg border border-border rounded-lg px-2 py-2.5 text-sm text-text focus:outline-none focus:border-accent";
  const modalRef = useModalA11y(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Выбор даты"
      ref={modalRef}
      className="fixed inset-0 z-[200] bg-bg/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
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
          <button onClick={onClose} className="text-text-muted active:text-text p-1" aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>

        {/* Три селекта */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {/* День */}
          <select
            value={safeDay}
            onChange={(e) => setDay(Number(e.target.value))}
            className={selectClass}
          >
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Месяц */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={selectClass}
          >
            {MONTHS.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>

          {/* Год */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={selectClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {isFuture && (
          <div className="text-xs text-danger mb-3 text-center">Нельзя выбрать будущую дату</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={setToday}
            className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${isToday ? 'border-accent text-accent bg-accent/10' : 'border-border bg-bg text-text-muted active:border-accent'}`}
          >
            Сегодня
          </button>
          <button
            disabled={isFuture || busy}
            onClick={() => void handleConfirm()}
            className="flex-[2] rounded-lg bg-accent text-bg p-3 font-medium disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={16} /> {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
