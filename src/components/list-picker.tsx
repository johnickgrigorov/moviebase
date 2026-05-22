import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Check, Plus, ListPlus } from 'lucide-react';
import clsx from 'clsx';
import { db, k } from '../lib/db';
import { addToList, removeFromList, createList } from '../lib/mutations';
import type { MediaType } from '../lib/tmdb';
import { useModalA11y } from '../hooks/use-modal-a11y';

interface ListPickerProps {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  onClose: () => void;
}

export function ListPicker({ media_type, tmdb_id, title, poster_path, release_year, onClose }: ListPickerProps) {
  const lists = useLiveQuery(() => db.lists.orderBy('updated_at').reverse().toArray()) ?? [];
  const itemKey = useMemo(
    () => (listId: string) => k.listItem(listId, media_type, tmdb_id),
    [media_type, tmdb_id],
  );

  const membership =
    useLiveQuery(async () => {
      const keys = lists.map((l) => itemKey(l.id));
      if (keys.length === 0) return new Set<string>();
      const found = await db.listItems.where('key').anyOf(keys).primaryKeys();
      return new Set(found.map(String));
    }, [lists, itemKey]) ?? new Set<string>();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(id);
  }, [toast]);

  const info = { media_type, tmdb_id, title, poster_path, release_year };
  const modalRef = useModalA11y(onClose);

  const toggle = async (listId: string, listName: string) => {
    const isIn = membership.has(itemKey(listId));
    if (isIn) {
      await removeFromList(listId, media_type, tmdb_id);
      setToast(`Убрано из «${listName}»`);
    } else {
      await addToList(listId, info);
      setToast(`Добавлено в «${listName}»`);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const list = await createList(name);
    await addToList(list.id, info);
    setNewName('');
    setCreating(false);
    setToast(`Создан «${name}»`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Добавить в список"
      ref={modalRef}
      className="fixed inset-0 z-[110] bg-bg/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-app bg-bg-elevated border-t border-border sm:border sm:rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListPlus size={18} className="text-accent" />
            <h3 className="display-title text-2xl">Добавить в список</h3>
          </div>
          <button onClick={onClose} className="text-text-muted active:text-text p-1" aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {lists.length === 0 && !creating && (
            <div className="py-10 text-center text-sm text-text-dim">
              Списков пока нет
              <div className="text-2xs mt-1">Создай первый ниже</div>
            </div>
          )}

          <div className="space-y-1.5">
            {lists.map((l) => {
              const isIn = membership.has(itemKey(l.id));
              return (
                <button
                  key={l.id}
                  onClick={() => void toggle(l.id, l.name)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left active:scale-[0.99]',
                    isIn
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border bg-bg text-text active:border-accent',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{l.name}</div>
                    {l.description && (
                      <div className="text-2xs text-text-dim mt-0.5 truncate">{l.description}</div>
                    )}
                  </div>
                  <div
                    className={clsx(
                      'shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors',
                      isIn ? 'border-accent bg-accent text-bg' : 'border-border',
                    )}
                  >
                    {isIn && <Check size={14} strokeWidth={2.5} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t border-border-subtle pt-3">
          {creating ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название списка"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
                className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => setCreating(false)}
                className="px-3 py-2 text-text-muted text-sm"
              >
                Отмена
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={!newName.trim()}
                className="px-3 py-2 bg-accent text-bg rounded text-sm font-medium disabled:opacity-40"
              >
                Создать
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-text-muted active:border-accent active:text-accent text-sm"
            >
              <Plus size={16} /> Новый список
            </button>
          )}
        </div>

        {toast && (
          <div className="mt-3 text-center text-2xs text-accent">{toast}</div>
        )}
      </div>
    </div>
  );
}
