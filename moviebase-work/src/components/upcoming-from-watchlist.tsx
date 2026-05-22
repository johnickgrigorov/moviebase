import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock } from 'lucide-react';
import { db } from '../lib/db';
import { api, imgUrl } from '../lib/tmdb';
import { formatDate } from '../lib/format';

interface UpcomingEntry {
  media_type: 'movie' | 'tv';
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  air_date: string;
  label: string;
}

const HORIZON_DAYS = 60;
const MAX_ITEMS = 6;
const MAX_CANDIDATES = 30;

export function UpcomingFromWatchlist() {
  const watchlist = useLiveQuery(() => db.watchlist.toArray()) ?? [];

  const currentYear = new Date().getFullYear();
  const candidates = useMemo(() => {
    return watchlist
      .filter((w) => {
        const y = Number(w.release_year);
        return !w.release_year || Number.isNaN(y) || y >= currentYear;
      })
      .slice(0, MAX_CANDIDATES);
  }, [watchlist, currentYear]);

  const queries = useQueries({
    queries: candidates.map((w) => ({
      queryKey: [w.media_type, w.tmdb_id] as const,
      queryFn: () =>
        w.media_type === 'movie' ? api.movieDetails(w.tmdb_id) : api.tvDetails(w.tmdb_id),
      staleTime: 1000 * 60 * 60 * 6,
    })),
  });

  const now = Date.now();
  const horizon = now + HORIZON_DAYS * 24 * 60 * 60 * 1000;

  const entries: UpcomingEntry[] = [];
  queries.forEach((q, idx) => {
    if (!q.data) return;
    const w = candidates[idx]!;
    if (w.media_type === 'movie') {
      const d = (q.data as { release_date?: string }).release_date;
      if (!d) return;
      const ts = Date.parse(d);
      if (Number.isNaN(ts) || ts < now || ts > horizon) return;
      entries.push({
        media_type: 'movie',
        tmdb_id: w.tmdb_id,
        title: w.title,
        poster_path: w.poster_path,
        air_date: d,
        label: '',
      });
    } else {
      const next = (q.data as { next_episode_to_air?: { air_date: string | null; season_number: number; episode_number: number } | null })
        .next_episode_to_air;
      if (!next?.air_date) return;
      const ts = Date.parse(next.air_date);
      if (Number.isNaN(ts) || ts < now || ts > horizon) return;
      entries.push({
        media_type: 'tv',
        tmdb_id: w.tmdb_id,
        title: w.title,
        poster_path: w.poster_path,
        air_date: next.air_date,
        label: `S${next.season_number}E${next.episode_number}`,
      });
    }
  });

  entries.sort((a, b) => a.air_date.localeCompare(b.air_date));
  const shown = entries.slice(0, MAX_ITEMS);

  if (shown.length === 0) return null;

  return (
    <section className="mb-7">
      <div className="px-4 mb-3 flex items-baseline gap-2">
        <CalendarClock size={16} className="text-accent self-center" />
        <h2 className="display-title text-2xl">Скоро в твоём списке</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1 snap-x">
        {shown.map((e) => (
          <Link
            key={`${e.media_type}-${e.tmdb_id}`}
            to={`/${e.media_type}/${e.tmdb_id}`}
            className="shrink-0 w-36 snap-start"
          >
            <div className="relative aspect-[2/3] bg-bg-elevated rounded-md overflow-hidden">
              {e.poster_path ? (
                <img
                  src={imgUrl(e.poster_path, 'w300')!}
                  alt={e.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/80 to-transparent p-2">
                <div className="text-2xs text-accent font-medium">
                  {formatDate(e.air_date)}
                </div>
                {e.label && <div className="text-2xs text-text-dim font-mono">{e.label}</div>}
              </div>
            </div>
            <div className="text-sm font-medium mt-2 leading-tight line-clamp-2">{e.title}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
