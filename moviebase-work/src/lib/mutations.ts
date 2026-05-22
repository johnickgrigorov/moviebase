import {
  db,
  k,
  now,
  genId,
  type WatchlistItem,
  type WatchedMovie,
  type WatchedEpisode,
  type Rating,
  type CustomList,
  type CustomListItem,
  type TvProgressMeta,
} from './db';
import { markDirty } from './sync';
import type { MediaType } from './tmdb';

interface MediaInfo {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
}

export async function addToWatchlist(m: MediaInfo): Promise<void> {
  const t = now();
  const key = k.watchlist(m.media_type, m.tmdb_id);
  const item: WatchlistItem = {
    key,
    media_type: m.media_type,
    tmdb_id: m.tmdb_id,
    title: m.title,
    poster_path: m.poster_path,
    release_year: m.release_year,
    added_at: t,
    updated_at: t,
  };
  await db.watchlist.put(item);
  await db.tombstones.delete(k.tombstone('watchlist', key));
  markDirty();
}

export async function removeFromWatchlist(media_type: MediaType, tmdb_id: number): Promise<void> {
  const key = k.watchlist(media_type, tmdb_id);
  const t = now();
  await db.watchlist.delete(key);
  await db.tombstones.put({
    key: k.tombstone('watchlist', key),
    table: 'watchlist',
    record_key: key,
    deleted_at: t,
  });
  markDirty();
}

export async function markMovieWatched(m: Omit<MediaInfo, 'media_type'>, watched_at: number = now()): Promise<void> {
  const t = now();
  const item: WatchedMovie = {
    tmdb_id: m.tmdb_id,
    title: m.title,
    poster_path: m.poster_path,
    release_year: m.release_year,
    watched_at,
    updated_at: t,
  };
  await db.watchedMovies.put(item);
  await db.tombstones.delete(k.tombstone('watchedMovies', String(m.tmdb_id)));
  await db.watchlist.delete(k.watchlist('movie', m.tmdb_id));
  await db.tombstones.put({
    key: k.tombstone('watchlist', k.watchlist('movie', m.tmdb_id)),
    table: 'watchlist',
    record_key: k.watchlist('movie', m.tmdb_id),
    deleted_at: t,
  });
  markDirty();
}

export async function unmarkMovieWatched(tmdb_id: number): Promise<void> {
  const t = now();
  await db.watchedMovies.delete(tmdb_id);
  await db.tombstones.put({
    key: k.tombstone('watchedMovies', String(tmdb_id)),
    table: 'watchedMovies',
    record_key: String(tmdb_id),
    deleted_at: t,
  });
  markDirty();
}

export async function markEpisodeWatched(tv_id: number, season_number: number, episode_number: number, watched_at: number = now()): Promise<void> {
  const t = now();
  const key = k.episode(tv_id, season_number, episode_number);
  const item: WatchedEpisode = { key, tv_id, season_number, episode_number, watched_at, updated_at: t };
  await db.watchedEpisodes.put(item);
  await db.tombstones.delete(k.tombstone('watchedEpisodes', key));
  markDirty();
}

export async function unmarkEpisodeWatched(tv_id: number, season_number: number, episode_number: number): Promise<void> {
  const t = now();
  const key = k.episode(tv_id, season_number, episode_number);
  await db.watchedEpisodes.delete(key);
  await db.tombstones.put({
    key: k.tombstone('watchedEpisodes', key),
    table: 'watchedEpisodes',
    record_key: key,
    deleted_at: t,
  });
  markDirty();
}

export async function markSeasonWatched(tv_id: number, season_number: number, episode_numbers: number[]): Promise<void> {
  const t = now();
  const items: WatchedEpisode[] = episode_numbers.map((episode_number) => ({
    key: k.episode(tv_id, season_number, episode_number),
    tv_id,
    season_number,
    episode_number,
    watched_at: t,
    updated_at: t,
  }));
  await db.watchedEpisodes.bulkPut(items);
  markDirty();
}

export async function unmarkSeasonWatched(tv_id: number, season_number: number): Promise<void> {
  const t = now();
  const keys = await db.watchedEpisodes.where('[tv_id+season_number]').equals([tv_id, season_number]).primaryKeys();
  await db.watchedEpisodes.bulkDelete(keys);
  await db.tombstones.bulkPut(
    keys.map((key) => ({
      key: k.tombstone('watchedEpisodes', String(key)),
      table: 'watchedEpisodes',
      record_key: String(key),
      deleted_at: t,
    })),
  );
  markDirty();
}

export async function saveTvMeta(meta: Omit<TvProgressMeta, 'updated_at'>): Promise<void> {
  const existing = await db.tvMeta.get(meta.tv_id);
  if (
    existing &&
    existing.title === meta.title &&
    existing.poster_path === meta.poster_path &&
    existing.release_year === meta.release_year &&
    existing.total_episodes === meta.total_episodes
  ) {
    return;
  }
  await db.tvMeta.put({ ...meta, updated_at: now() });
  markDirty();
}

export async function setRating(m: MediaInfo, score: number, comment = ''): Promise<void> {
  const key = k.rating(m.media_type, m.tmdb_id);
  const t = now();
  const r: Rating = { key, media_type: m.media_type, tmdb_id: m.tmdb_id, score, comment, updated_at: t };
  await db.ratings.put(r);
  await db.tombstones.delete(k.tombstone('ratings', key));
  markDirty();
}

export async function removeRating(media_type: MediaType, tmdb_id: number): Promise<void> {
  const key = k.rating(media_type, tmdb_id);
  const t = now();
  await db.ratings.delete(key);
  await db.tombstones.put({
    key: k.tombstone('ratings', key),
    table: 'ratings',
    record_key: key,
    deleted_at: t,
  });
  markDirty();
}

export async function createList(name: string, description = ''): Promise<CustomList> {
  const t = now();
  const list: CustomList = { id: genId(), name, description, created_at: t, updated_at: t };
  await db.lists.put(list);
  markDirty();
  return list;
}

export async function renameList(id: string, name: string, description?: string): Promise<void> {
  const existing = await db.lists.get(id);
  if (!existing) return;
  await db.lists.put({ ...existing, name, description: description ?? existing.description, updated_at: now() });
  markDirty();
}

export async function deleteList(id: string): Promise<void> {
  const t = now();
  const items = await db.listItems.where('list_id').equals(id).primaryKeys();
  await db.listItems.bulkDelete(items);
  await db.lists.delete(id);
  await db.tombstones.put({
    key: k.tombstone('lists', id),
    table: 'lists',
    record_key: id,
    deleted_at: t,
  });
  await db.tombstones.bulkPut(
    items.map((key) => ({
      key: k.tombstone('listItems', String(key)),
      table: 'listItems',
      record_key: String(key),
      deleted_at: t,
    })),
  );
  markDirty();
}

export async function addToList(list_id: string, m: MediaInfo): Promise<void> {
  const t = now();
  const key = k.listItem(list_id, m.media_type, m.tmdb_id);
  const lastOrder = await db.listItems.where('list_id').equals(list_id).count();
  const item: CustomListItem = {
    key,
    list_id,
    media_type: m.media_type,
    tmdb_id: m.tmdb_id,
    title: m.title,
    poster_path: m.poster_path,
    release_year: m.release_year,
    order: lastOrder,
    added_at: t,
    updated_at: t,
  };
  await db.listItems.put(item);
  await db.tombstones.delete(k.tombstone('listItems', key));
  markDirty();
}

export async function removeFromList(list_id: string, media_type: MediaType, tmdb_id: number): Promise<void> {
  const t = now();
  const key = k.listItem(list_id, media_type, tmdb_id);
  await db.listItems.delete(key);
  await db.tombstones.put({
    key: k.tombstone('listItems', key),
    table: 'listItems',
    record_key: key,
    deleted_at: t,
  });
  await compactListOrder(list_id);
  markDirty();
}

export async function compactListOrder(list_id: string): Promise<void> {
  const items = await db.listItems.where('list_id').equals(list_id).sortBy('order');
  const t = now();
  const updates: CustomListItem[] = [];
  items.forEach((item, idx) => {
    if (item.order !== idx) {
      updates.push({ ...item, order: idx, updated_at: t });
    }
  });
  if (updates.length > 0) {
    await db.listItems.bulkPut(updates);
  }
}

export async function reorderListItem(list_id: string, item_key: string, new_index: number): Promise<void> {
  const items = await db.listItems.where('list_id').equals(list_id).sortBy('order');
  const fromIdx = items.findIndex((it) => it.key === item_key);
  if (fromIdx === -1) return;
  const target = Math.max(0, Math.min(items.length - 1, new_index));
  if (fromIdx === target) return;
  const reordered = [...items];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(target, 0, moved!);
  const t = now();
  const updates: CustomListItem[] = reordered.map((item, idx) => ({ ...item, order: idx, updated_at: t }));
  await db.listItems.bulkPut(updates);
  markDirty();
}
