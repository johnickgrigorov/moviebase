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
}

export function ActionBar({ media_type, tmdb_id, title, poster_path, release_year }: ActionBarProps) {
  const inWatchlist = useIsInWatchlist(media_type, tmdb_id);
  const watched = useIsMovieWatched(media_type === 'movie' ? tmdb_id : undefined);
  const rating = useMediaRating(media_type, tmdb_id);
  const listsCount =
    useLiveQuery(async () => {
      const listIds = (await db.lists.toCollection().primaryKeys()) as string[];
      if (listIds.length === 0) return 0;
      return db.listItems
        .where('list_id')
        .anyOf(listIds)
        .filter((it) => it.media_type === media_type && it.tmdb_id === tmdb_id)
        .count();
    }, [media_type, tmdb_id]) ?? 0;

  const [ratingOpen, setRatingOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);

  const info = { media_type, tmdb_id, title, poster_path, release_year };

  const toggleWatchlist = async () => {
    if (inWatchlist) await removeFromWatchlist(media_type, tmdb_id);
    else await addToWatchlist(info);
  };

  const toggleWatched = async () => {
    if (media_type !== 'movie') return;
    if (watched) await unmarkMovieWatched(tmdb_id);
    else await markMovieWatched(info);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2 px-4">
        <ActionButton
          active={inWatchlist}
          icon={<Bookmark size={18} fill={inWatchlist ? 'currentColor' : 'none'} strokeWidth={1.6} />}
          label={inWatchlist ? 'В списке' : 'В список'}
          onClick={toggleWatchlist}
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
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'amber';
}) {
  const activeColors =
    variant === 'success'
      ? 'bg-success/15 border-success/50 text-success'
      : 'bg-accent/15 border-accent/50 text-accent';

  return (
    <button
      onClick={onClick}
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
