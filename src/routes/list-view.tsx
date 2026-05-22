import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Pencil, GripVertical, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import { db, type CustomListItem } from '../lib/db';
import { deleteList, renameList, removeFromList, reorderListItem, updateListItemNotes } from '../lib/mutations';
import { useConfirm } from '../components/confirm-modal';
import { Poster } from '../components/poster';
import { BackButton } from '../components/back-button';
import { NoteModal } from '../components/note-modal';

type MediaFilter = 'all' | 'movie' | 'tv';

function MediaFilterBar({ value, onChange, counts }: {
  value: MediaFilter;
  onChange: (v: MediaFilter) => void;
  counts: { all: number; movie: number; tv: number };
}) {
  return (
    <div className="flex gap-2 mb-4">
      {(['all', 'movie', 'tv'] as MediaFilter[]).map((f) => {
        const labels: Record<MediaFilter, string> = { all: 'Все', movie: 'Фильмы', tv: 'Сериалы' };
        const count = counts[f];
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              value === f
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-bg-elevated text-text-muted border border-border',
            )}
          >
            {labels[f]}
            <span className={clsx(
              'text-2xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
              value === f ? 'bg-accent/30' : 'bg-bg text-text-dim',
            )}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ListView() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [listLoaded, setListLoaded] = useState(false);
  const list = useLiveQuery(
    async () => {
      const result = id ? await db.lists.get(id) : undefined;
      setListLoaded(true);
      return result;
    },
    [id],
  );
  const allItems: CustomListItem[] =
    useLiveQuery<CustomListItem[]>(
      async () => {
        if (!id) return [];
        return db.listItems.where('list_id').equals(id).sortBy('order');
      },
      [id],
    ) ?? [];

  const movies = allItems.filter((it) => it.media_type === 'movie');
  const tv = allItems.filter((it) => it.media_type === 'tv');
  const items = filter === 'all' ? allItems : filter === 'movie' ? movies : tv;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [noteItem, setNoteItem] = useState<CustomListItem | null>(null);
  const { confirm: askConfirm, node: confirmNode } = useConfirm();

  if (!listLoaded) {
    return (
      <div className="pt-6 px-4">
        <BackButton />
        <div className="mt-8 text-center text-text-dim">Загрузка…</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="pt-6 px-4">
        <BackButton />
        <div className="mt-8 text-center text-text-dim">Список не найден</div>
      </div>
    );
  }

  const startEdit = () => {
    setName(list.name);
    setDescription(list.description);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!name.trim()) return;
    await renameList(list.id, name.trim(), description.trim());
    setEditing(false);
  };

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: 'Удалить список?',
      message: `Список «${list.name}» и все его ${allItems.length} элементов будут удалены. Действие необратимо.`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    await deleteList(list.id);
    nav('/lists');
  };

  return (
    <div className="pt-4 pb-8 px-4">
      <div className="flex items-start gap-3 mb-5">
        <BackButton />
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание (опционально)"
                className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 py-2 text-text-muted text-sm">
                  Отмена
                </button>
                <button onClick={saveEdit} className="flex-1 py-2 bg-accent text-bg rounded text-sm font-medium">
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="display-title text-2xl leading-tight">{list.name}</h1>
              {list.description && <div className="text-xs text-text-muted mt-1">{list.description}</div>}
              <div className="text-2xs text-text-dim mt-1">
                {allItems.length} элементов{allItems.length > 1 ? ' · потяни за полоску, чтобы переставить' : ''}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1">
            <button onClick={startEdit} className="p-2 text-text-muted active:text-accent">
              <Pencil size={16} />
            </button>
            <button onClick={handleDelete} className="p-2 text-text-muted active:text-danger">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {allItems.length === 0 ? (
        <div className="py-16 text-center text-text-dim text-sm">
          Список пуст
          <div className="text-2xs mt-1">Добавляй фильмы и сериалы кнопкой «В подборку» на их странице</div>
        </div>
      ) : (
        <>
          {(movies.length > 0 && tv.length > 0) && (
            <MediaFilterBar
              value={filter}
              onChange={setFilter}
              counts={{ all: allItems.length, movie: movies.length, tv: tv.length }}
            />
          )}
          {items.length === 0 ? (
            <div className="py-8 text-center text-text-dim text-sm">Ничего не найдено</div>
          ) : (
            <DraggableGrid items={items} listId={list.id} onNoteEdit={setNoteItem} />
          )}
        </>
      )}

      {confirmNode}

      {noteItem && (
        <NoteModal
          title={noteItem.title}
          initialNote={noteItem.notes ?? ''}
          onConfirm={async (note) => {
            await updateListItemNotes(noteItem.list_id, noteItem.media_type, noteItem.tmdb_id, note);
            setNoteItem(null);
          }}
          onSkip={async () => {
            await updateListItemNotes(noteItem.list_id, noteItem.media_type, noteItem.tmdb_id, '');
            setNoteItem(null);
          }}
          onClose={() => setNoteItem(null)}
        />
      )}
    </div>
  );
}

function DraggableGrid({
  items,
  listId,
  onNoteEdit,
}: {
  items: CustomListItem[];
  listId: string;
  onNoteEdit: (item: CustomListItem) => void;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const pointerActive = useRef(false);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    pointerActive.current = true;
    setDragKey(key);
    setOverKey(key);
  }, []);

  useEffect(() => {
    if (!dragKey) return;

    const handleMove = (e: PointerEvent) => {
      if (!pointerActive.current) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cell = target?.closest<HTMLElement>('[data-list-key]');
      if (cell) {
        const key = cell.dataset.listKey;
        if (key && key !== overKey) setOverKey(key);
      }
    };

    const handleUp = async () => {
      pointerActive.current = false;
      const from = dragKey;
      const to = overKey;
      setDragKey(null);
      setOverKey(null);
      if (from && to && from !== to) {
        const targetIndex = itemsRef.current.findIndex((it) => it.key === to);
        if (targetIndex !== -1) {
          await reorderListItem(listId, from, targetIndex);
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragKey, overKey, items, listId]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => {
        const isDragged = dragKey === it.key;
        const isOver = overKey === it.key && dragKey && dragKey !== it.key;
        return (
          <div
            key={it.key}
            data-list-key={it.key}
            className={clsx(
              'relative transition-all',
              isDragged && 'opacity-40 scale-95',
              isOver && 'ring-2 ring-accent rounded-md',
            )}
          >
            <Link
              to={`/${it.media_type}/${it.tmdb_id}`}
              onClick={(e) => {
                if (dragKey) e.preventDefault();
              }}
            >
              <Poster path={it.poster_path} alt={it.title} size="w300" />
              <div className="text-sm font-medium mt-2 leading-tight line-clamp-2">{it.title}</div>
              <div className="text-2xs text-text-dim mt-0.5">{it.release_year || '—'}</div>
              {it.notes && (
                <div className="flex items-start gap-1 mt-1">
                  <StickyNote size={10} className="text-accent mt-0.5 shrink-0" />
                  <p className="text-2xs text-text-muted leading-tight line-clamp-2">{it.notes}</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => removeFromList(listId, it.media_type, it.tmdb_id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-bg/80 backdrop-blur-sm flex items-center justify-center text-text-muted active:text-danger"
            >
              <Trash2 size={11} />
            </button>
            <button
              onPointerDown={(e) => onPointerDown(e, it.key)}
              className="absolute top-1 left-1 w-6 h-6 rounded-full bg-bg/80 backdrop-blur-sm flex items-center justify-center text-text-muted active:text-accent touch-none cursor-grab"
              style={{ touchAction: 'none' }}
              aria-label="Перетащить"
            >
              <GripVertical size={12} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onNoteEdit(it); }}
              className="absolute bottom-[52px] right-1 w-6 h-6 rounded-full bg-bg/80 backdrop-blur-sm flex items-center justify-center active:text-accent"
            >
              <StickyNote size={11} className={it.notes ? 'text-accent' : 'text-text-dim'} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
