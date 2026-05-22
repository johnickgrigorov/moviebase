import { useEffect, useRef, useState } from 'react';
import { X, StickyNote } from 'lucide-react';

interface NoteModalProps {
  title: string;
  initialNote?: string;
  onConfirm: (note: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function NoteModal({ title, initialNote = '', onConfirm, onSkip, onClose }: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] bg-bg/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-app bg-bg-elevated border-t border-border sm:border sm:rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote size={18} className="text-accent" />
            <h3 className="display-title text-xl leading-tight">Заметка</h3>
          </div>
          <button onClick={onClose} className="text-text-muted active:text-text p-1" aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>

        <p className="text-xs text-text-muted line-clamp-1">{title}</p>

        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Почему хочу посмотреть, от кого узнал, что ожидаю…"
          rows={4}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-accent placeholder:text-text-dim"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSkip}
            className="py-3 border border-border rounded-lg text-sm text-text-muted active:border-accent active:text-accent"
          >
            Без заметки
          </button>
          <button
            onClick={() => onConfirm(note.trim())}
            className="py-3 bg-accent text-bg rounded-lg text-sm font-medium active:scale-95"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
