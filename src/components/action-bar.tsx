import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, Check, Star, ListPlus } from 'lucide-react';
import clsx from 'clsx';
import {
  addToWatchlist,
  removeFromWatchlist,
  markMovieWatched,
  unmarkMovieWatched,
  setRating,
  removeRating,
} from '../lib/mutations';
import { useIsInWatchlist, useIsMovieWatched, useMediaRating } from '../hooks/use-tracking';
import { RatingModal } from './rating-modal';
import { ListPicker } from './list-picker';
import { db } from '../lib/db';
import type { MediaType } from '../lib/tmdb';

interface ActionBarProps {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  onWatchedClick?: () => void;
}

export function ActionBar({ media_type, tmdb_id, title, poster_path, release_year, onWatchedClick }: ActionBarProps) {
  const inWatchlist = useIsInWatchlist(media_type, tmdb_id);
  // Хук всегда вызывается (rules of hooks), но запрашиваем -1 для TV — никогда не найдётся.
  // Это безопасно (просто вернёт undefined → false) и убирает грязный undefined-каст.
  const watchedRaw = useIsMovieWatched(media_type === 'movie' ? tmdb_id : -1);
  const watched = media_type === 'movie' && watchedRaw;
  const rating = useMediaRating(media_type, tmdb_id);
  // Используем композитный индекс [media_type+tmdb_id] (Dexie v3) — точечный запрос
  // вместо фильтра по всем listItems. Реактивность ограничена ключом этого медиа.
  const listsCount =
    useLiveQuery(
      () => db.listItems.where('[media_type+tmdb_id]').equals([media_type, tmdb_id]).count(),
      [media_type, tmdb_id],
    ) ?? 0;

  const [pending, setPending] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);

  const info = { media_type, tmdb_id, title, poster_path, release_year };

  const toggleWatchlist = async () => {
    if (pending) return;
    setPending(true);
    try {
      if (inWatchlist) await removeFromWatchlist(media_type, tmdb_id);
      else await addToWatchlist(info);
    } finally {
      setPending(false);
    }
  };

  const toggleWatched = async () => {
    if (media_type !== 'movie') return;
    if (pending) return;
    if (watched) {
      setPending(true);
      try { await unmarkMovieWatched(tmdb_id); } finally { setPending(false); }
    } else if (onWatchedClick) {
      onWatchedClick();
    } else {
      setPending(true);
      try { await markMovieWatched(info); } finally { setPending(false); }
    }
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2 px-4">
        <ActionButton
          active={inWatchlist}
          icon={<Bookmark size={18} fill={inWatchlist ? 'currentColor' : 'none'} strokeWidth={1.6} />}
          label={inWatchlist ? 'В списке' : 'В список'}
          onClick={toggleWatchlist}
          disabled={pending}
        />
        {media_type === 'movie' ? (
          <ActionButton
            active={watched}
            icon={<Check size={18} strokeWidth={2} />}
            label={watched ? 'Просмотрен' : 'Просмотрен?'}
            onClick={toggleWatched}
            variant="success"
          />
        ) : (
          <div className="rounded-lg border border-border-subtle bg-bg-elevated/50 p-2.5 text-center text-2xs text-text-dim flex items-center justify-center leading-tight">
            Прогресс ↓
          </div>
        )}
        <ActionButton
          active={rating !== undefined}
          icon={<Star size={18} fill={rating !== undefined ? 'currentColor' : 'none'} strokeWidth={1.6} />}
          label={rating !== undefined ? `${rating}/10` : 'Оценить'}
          onClick={() => setRatingOpen(true)}
          variant="amber"
        />
        <ActionButton
          active={listsCount > 0}
          icon={<ListPlus size={18} strokeWidth={1.6} />}
          label={listsCount > 0 ? `В ${listsCount}` : 'В подборку'}
          onClick={() => setListsOpen(true)}
        />
      </div>

      {ratingOpen && (
        <RatingModal
          currentScore={rating}
          onSubmit={async (score) => {
            await setRating(info, score);
            setRatingOpen(false);
          }}
          onRemove={async () => {
            await removeRating(media_type, tmdb_id);
            setRatingOpen(false);
          }}
          onClose={() => setRatingOpen(false)}
        />
      )}

      {listsOpen && (
        <ListPicker
          media_type={media_type}
          tmdb_id={tmdb_id}
          title={title}
          poster_path={poster_path}
          release_year={release_year}
          onClose={() => setListsOpen(false)}
        />
      )}
    </>
  );
}

function ActionButton({
  active,
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'amber';
  disabled?: boolean;
}) {
  const activeColors =
    variant === 'success'
      ? 'bg-success/15 border-success/50 text-success'
      : 'bg-accent/15 border-accent/50 text-accent';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-lg border p-2.5 flex flex-col items-center gap-1 transition-all active:scale-95',
        active ? activeColors : 'border-border bg-bg-elevated text-text-muted',
      )}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide leading-tight">{label}</span>
    </button>
  );
}
