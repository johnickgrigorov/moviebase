import { useLiveQuery } from 'dexie-react-hooks';
import { db, k } from '../lib/db';
import type { MediaType } from '../lib/tmdb';

export function useIsInWatchlist(media_type: MediaType, tmdb_id: number): boolean {
  const res = useLiveQuery(() => db.watchlist.get(k.watchlist(media_type, tmdb_id)), [media_type, tmdb_id]);
  return !!res;
}

export function useIsMovieWatched(tmdb_id: number): boolean {
  const res = useLiveQuery(() => db.watchedMovies.get(tmdb_id), [tmdb_id]);
  return !!res;
}

export function useMediaRating(media_type: MediaType, tmdb_id: number): number | undefined {
  const res = useLiveQuery(() => db.ratings.get(k.rating(media_type, tmdb_id)), [media_type, tmdb_id]);
  return res?.score;
}

export function useWatchedEpisodesInSeason(tv_id: number, season_number: number): Set<number> {
  const list = useLiveQuery(
    () => db.watchedEpisodes.where('[tv_id+season_number]').equals([tv_id, season_number]).toArray(),
    [tv_id, season_number],
  );
  return new Set((list ?? []).map((e) => e.episode_number));
}

export function useWatchedEpisodeCount(tv_id: number): number {
  const count = useLiveQuery(() => db.watchedEpisodes.where('tv_id').equals(tv_id).count(), [tv_id]);
  return count ?? 0;
}

export function useRewatchCount(media_type: MediaType, tmdb_id: number): number {
  const count = useLiveQuery(
    () => db.rewatches.where('[media_type+tmdb_id]').equals([media_type, tmdb_id]).count(),
    [media_type, tmdb_id],
  );
  return count ?? 0;
}

export function useRewatches(media_type: MediaType, tmdb_id: number) {
  const list = useLiveQuery(
    () => db.rewatches.where('[media_type+tmdb_id]').equals([media_type, tmdb_id]).reverse().sortBy('watched_at'),
    [media_type, tmdb_id],
  );
  return list ?? [];
}
