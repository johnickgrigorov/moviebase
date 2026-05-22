import Dexie, { type EntityTable } from 'dexie';
import type { MediaType } from './tmdb';

export interface WatchlistItem {
  key: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  notes?: string;
  added_at: number;
  updated_at: number;
}

export interface WatchedMovie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  watched_at: number;
  updated_at: number;
}

export interface Rewatch {
  key: string;          // genId-based, уникальный
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  watched_at: number;
  note?: string;
  created_at: number;
  updated_at: number;
}

export interface WatchedEpisode {
  key: string;
  tv_id: number;
  season_number: number;
  episode_number: number;
  watched_at: number;
  updated_at: number;
}

export interface TvProgressMeta {
  tv_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  total_episodes: number;
  updated_at: number;
}

export interface Rating {
  key: string;
  media_type: MediaType;
  tmdb_id: number;
  score: number;
  comment: string;
  updated_at: number;
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface CustomListItem {
  key: string;
  list_id: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string;
  notes?: string;
  order: number;
  added_at: number;
  updated_at: number;
}

export interface Tombstone {
  key: string;
  table: string;
  record_key: string;
  deleted_at: number;
}

export interface Setting {
  key: string;
  value: unknown;
  updated_at: number;
}

export class MoviebaseDb extends Dexie {
  watchlist!: EntityTable<WatchlistItem, 'key'>;
  watchedMovies!: EntityTable<WatchedMovie, 'tmdb_id'>;
  watchedEpisodes!: EntityTable<WatchedEpisode, 'key'>;
  tvMeta!: EntityTable<TvProgressMeta, 'tv_id'>;
  ratings!: EntityTable<Rating, 'key'>;
  lists!: EntityTable<CustomList, 'id'>;
  listItems!: EntityTable<CustomListItem, 'key'>;
  rewatches!: EntityTable<Rewatch, 'key'>;
  tombstones!: EntityTable<Tombstone, 'key'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super('moviebase-personal');
    this.version(1).stores({
      watchlist: 'key, media_type, tmdb_id, added_at, updated_at',
      watchedMovies: 'tmdb_id, watched_at, updated_at',
      watchedEpisodes: 'key, tv_id, [tv_id+season_number], watched_at, updated_at',
      tvMeta: 'tv_id, updated_at',
      ratings: 'key, media_type, tmdb_id, score, updated_at',
      lists: 'id, name, created_at, updated_at',
      listItems: 'key, list_id, [list_id+order], updated_at',
      tombstones: 'key, table, deleted_at',
      settings: 'key, updated_at',
    });
    // version 2: adds notes field to watchlist and listItems (no schema change needed — Dexie stores all fields)
    this.version(2).stores({
      watchlist: 'key, media_type, tmdb_id, added_at, updated_at',
      watchedMovies: 'tmdb_id, watched_at, updated_at',
      watchedEpisodes: 'key, tv_id, [tv_id+season_number], watched_at, updated_at',
      tvMeta: 'tv_id, updated_at',
      ratings: 'key, media_type, tmdb_id, score, updated_at',
      lists: 'id, name, created_at, updated_at',
      listItems: 'key, list_id, [list_id+order], updated_at',
      tombstones: 'key, table, deleted_at',
      settings: 'key, updated_at',
    });
    // version 3: add [media_type+tmdb_id] index on listItems for fast "is in any list" lookup
    this.version(3).stores({
      watchlist: 'key, media_type, tmdb_id, added_at, updated_at',
      watchedMovies: 'tmdb_id, watched_at, updated_at',
      watchedEpisodes: 'key, tv_id, [tv_id+season_number], watched_at, updated_at',
      tvMeta: 'tv_id, updated_at',
      ratings: 'key, media_type, tmdb_id, score, updated_at',
      lists: 'id, name, created_at, updated_at',
      listItems: 'key, list_id, [list_id+order], [media_type+tmdb_id], updated_at',
      tombstones: 'key, table, deleted_at',
      settings: 'key, updated_at',
    });
    // version 4: add rewatches table (повторные просмотры)
    this.version(4).stores({
      watchlist: 'key, media_type, tmdb_id, added_at, updated_at',
      watchedMovies: 'tmdb_id, watched_at, updated_at',
      watchedEpisodes: 'key, tv_id, [tv_id+season_number], watched_at, updated_at',
      tvMeta: 'tv_id, updated_at',
      ratings: 'key, media_type, tmdb_id, score, updated_at',
      lists: 'id, name, created_at, updated_at',
      listItems: 'key, list_id, [list_id+order], [media_type+tmdb_id], updated_at',
      rewatches: 'key, [media_type+tmdb_id], watched_at, updated_at',
      tombstones: 'key, table, deleted_at',
      settings: 'key, updated_at',
    });
  }
}

export const db = new MoviebaseDb();

export const k = {
  watchlist: (type: MediaType, id: number) => `${type}-${id}`,
  episode: (tvId: number, season: number, episode: number) => `${tvId}-${season}-${episode}`,
  rating: (type: MediaType, id: number) => `${type}-${id}`,
  listItem: (listId: string, type: MediaType, id: number) => `${listId}-${type}-${id}`,
  tombstone: (table: string, recordKey: string) => `${table}:${recordKey}`,
};

export function now(): number {
  return Date.now();
}

export function genId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export interface Snapshot {
  version: 1;
  created_at: number;
  watchlist: WatchlistItem[];
  watchedMovies: WatchedMovie[];
  watchedEpisodes: WatchedEpisode[];
  tvMeta: TvProgressMeta[];
  ratings: Rating[];
  lists: CustomList[];
  listItems: CustomListItem[];
  rewatches?: Rewatch[];  // optional для обратной совместимости со снапшотами v1 без rewatches
  tombstones: Tombstone[];
}

export async function exportSnapshot(): Promise<Snapshot> {
  const [watchlist, watchedMovies, watchedEpisodes, tvMeta, ratings, lists, listItems, rewatches, tombstones] = await Promise.all([
    db.watchlist.toArray(),
    db.watchedMovies.toArray(),
    db.watchedEpisodes.toArray(),
    db.tvMeta.toArray(),
    db.ratings.toArray(),
    db.lists.toArray(),
    db.listItems.toArray(),
    db.rewatches.toArray(),
    db.tombstones.toArray(),
  ]);
  return {
    version: 1,
    created_at: now(),
    watchlist,
    watchedMovies,
    watchedEpisodes,
    tvMeta,
    ratings,
    lists,
    listItems,
    rewatches,
    tombstones,
  };
}

async function mergeTable<T extends { updated_at: number }>(
  table: EntityTable<T, never>,
  rows: T[],
  getKey: (row: T) => unknown,
): Promise<void> {
  for (const row of rows) {
    const id = getKey(row);
    const existing = (await table.get(id as never)) as T | undefined;
    if (!existing || existing.updated_at < row.updated_at) {
      await table.put(row);
    }
  }
}

export async function applySnapshot(snap: Snapshot, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  if (snap.version !== 1) {
    throw new Error(`Неподдерживаемая версия снапшота: ${snap.version}`);
  }

  if (mode === 'replace') {
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
      await db.watchlist.bulkPut(snap.watchlist);
      await db.watchedMovies.bulkPut(snap.watchedMovies);
      await db.watchedEpisodes.bulkPut(snap.watchedEpisodes);
      await db.tvMeta.bulkPut(snap.tvMeta);
      await db.ratings.bulkPut(snap.ratings);
      await db.lists.bulkPut(snap.lists);
      await db.listItems.bulkPut(snap.listItems);
      if (snap.rewatches) await db.rewatches.bulkPut(snap.rewatches);
      await db.tombstones.bulkPut(snap.tombstones);
    });
    return;
  }

  await db.transaction('rw', db.tables, async () => {
    await mergeTable(db.watchlist as unknown as EntityTable<WatchlistItem, never>, snap.watchlist, (r) => r.key);
    await mergeTable(db.watchedMovies as unknown as EntityTable<WatchedMovie, never>, snap.watchedMovies, (r) => r.tmdb_id);
    await mergeTable(db.watchedEpisodes as unknown as EntityTable<WatchedEpisode, never>, snap.watchedEpisodes, (r) => r.key);
    await mergeTable(db.tvMeta as unknown as EntityTable<TvProgressMeta, never>, snap.tvMeta, (r) => r.tv_id);
    await mergeTable(db.ratings as unknown as EntityTable<Rating, never>, snap.ratings, (r) => r.key);
    await mergeTable(db.lists as unknown as EntityTable<CustomList, never>, snap.lists, (r) => r.id);
    await mergeTable(db.listItems as unknown as EntityTable<CustomListItem, never>, snap.listItems, (r) => r.key);
    if (snap.rewatches) {
      await mergeTable(db.rewatches as unknown as EntityTable<Rewatch, never>, snap.rewatches, (r) => r.key);
    }

    for (const t of snap.tombstones) {
      const existing = await db.tombstones.get(t.key);
      if (!existing || existing.deleted_at < t.deleted_at) {
        await db.tombstones.put(t);
      }
    }

    for (const t of await db.tombstones.toArray()) {
      const table = (db as unknown as Record<string, EntityTable<{ updated_at: number }, never> | undefined>)[t.table];
      if (!table) continue;
      const rec = (await table.get(t.record_key as never)) as { updated_at?: number } | undefined;
      if (rec && (rec.updated_at ?? 0) < t.deleted_at) {
        await table.delete(t.record_key as never);
      }
    }
  });
}
