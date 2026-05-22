// CSV утилиты — формат RFC 4180, UTF-8 BOM для Excel, разделитель — запятая.
// Цель: человекочитаемый формат с русскими заголовками, плюс автоопределение
// при импорте (включая Letterboxd и IMDb).

import { db, k, now, type WatchlistItem, type WatchedMovie, type CustomListItem, type Rating } from './db';
import {
  addToWatchlist,
  markMovieWatched,
  markEpisodeWatched,
  setRating,
  createList,
  addToList,
  updateWatchlistNotes,
} from './mutations';
import { api } from './tmdb';

// ===== Низкоуровневые функции CSV =====

const BOM = '﻿';

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s === '') return '';
  if (/[",\n\r;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(',');
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [csvRow(headers)];
  for (const r of rows) lines.push(csvRow(r));
  return BOM + lines.join('\r\n') + '\r\n';
}

// ===== Парсер CSV (RFC 4180, поддержка \r\n / \n) =====

export function parseCsv(text: string): string[][] {
  // Убираем BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  // Автоопределение разделителя на основе первой строки (запятая | точка с запятой | tab)
  let delim = ',';
  const firstLineEnd = text.search(/\r?\n/);
  const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && (ch === ',' || ch === ';' || ch === '\t')) counts[ch as ',' | ';' | '\t']++;
  }
  if (counts[';'] > counts[','] && counts[';'] > counts['\t']) delim = ';';
  else if (counts['\t'] > counts[',']) delim = '\t';

  while (i < text.length) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === delim) { row.push(cell); cell = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') {
      row.push(cell); cell = '';
      // Пропускаем полностью пустые строки
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = []; i++; continue;
    }
    cell += c; i++;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// ===== Утилиты =====

function ymd(ts: number | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string | undefined): number | null {
  if (!s) return null;
  // YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY, DD/MM/YYYY
  const trim = s.trim();
  if (!trim) return null;
  // ISO с временем
  const iso = Date.parse(trim);
  if (!Number.isNaN(iso)) return iso;
  // DD.MM.YYYY or DD/MM/YYYY
  const m = trim.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) {
    const day = Number(m[1]); const mon = Number(m[2]) - 1; const yr = Number(m[3]);
    const d = new Date(yr, mon, day, 12, 0, 0);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return null;
}

function statusLabel(s: string): string {
  return {
    watched: 'просмотрено',
    watchlist: 'в списке',
    rating: 'оценка',
    'tv-progress': 'эпизоды',
    list: 'в подборке',
  }[s] ?? s;
}

// ===== Сборка данных для экспорта =====

interface ExportContext {
  watchlist: WatchlistItem[];
  watchedMovies: WatchedMovie[];
  watchedEpisodes: { tv_id: number; season_number: number; episode_number: number; watched_at: number }[];
  tvMeta: { tv_id: number; title: string; release_year: string; poster_path: string | null }[];
  ratings: Rating[];
  lists: { id: string; name: string }[];
  listItems: CustomListItem[];
}

async function loadExportContext(): Promise<ExportContext> {
  const [watchlist, watchedMovies, watchedEpisodes, tvMeta, ratings, lists, listItems] = await Promise.all([
    db.watchlist.toArray(),
    db.watchedMovies.toArray(),
    db.watchedEpisodes.toArray(),
    db.tvMeta.toArray(),
    db.ratings.toArray(),
    db.lists.toArray(),
    db.listItems.toArray(),
  ]);
  return { watchlist, watchedMovies, watchedEpisodes, tvMeta, ratings, lists, listItems };
}

// ===== Экспорты =====

/** Всё в одном файле — со столбцом "статус", удобно для Excel-просмотра */
export async function exportAllCsv(): Promise<Blob> {
  const ctx = await loadExportContext();
  const headers = [
    'статус', 'тип', 'название', 'год', 'tmdb_id',
    'оценка', 'дата_просмотра', 'эпизодов_просмотрено',
    'подборка', 'заметка', 'добавлено',
  ];
  const rows: (string | number | null | undefined)[][] = [];
  const ratingByKey = new Map(ctx.ratings.map((r) => [`${r.media_type}-${r.tmdb_id}`, r.score]));

  // Просмотренные фильмы
  for (const m of ctx.watchedMovies) {
    const score = ratingByKey.get(`movie-${m.tmdb_id}`);
    rows.push(['просмотрено', 'movie', m.title, m.release_year, m.tmdb_id, score ?? '', ymd(m.watched_at), '', '', '', '']);
  }
  // Просмотренные сериалы — свернуто
  const epByTv = new Map<number, { count: number; lastWatched: number }>();
  for (const ep of ctx.watchedEpisodes) {
    if (ep.season_number === 0) continue; // specials
    const cur = epByTv.get(ep.tv_id) ?? { count: 0, lastWatched: 0 };
    cur.count++;
    if (ep.watched_at > cur.lastWatched) cur.lastWatched = ep.watched_at;
    epByTv.set(ep.tv_id, cur);
  }
  const metaByTv = new Map(ctx.tvMeta.map((m) => [m.tv_id, m]));
  for (const [tvId, data] of epByTv) {
    const meta = metaByTv.get(tvId);
    const score = ratingByKey.get(`tv-${tvId}`);
    const total = meta ? '' : ''; // total_episodes есть в tvMeta
    const totalEps = ctx.tvMeta.find((m) => m.tv_id === tvId)?.title; void totalEps;
    const totalNum = ctx.tvMeta.find((m) => m.tv_id === tvId);
    const epsLabel = totalNum?.title ? `${data.count}/${(totalNum as any).total_episodes ?? '?'}` : String(data.count);
    rows.push([
      'просмотрено', 'tv',
      meta?.title ?? '', meta?.release_year ?? '', tvId,
      score ?? '', ymd(data.lastWatched), epsLabel, '', '', '',
    ]);
  }
  // Watchlist (только те, что не просмотрены как фильм)
  const watchedMovieIds = new Set(ctx.watchedMovies.map((m) => m.tmdb_id));
  for (const w of ctx.watchlist) {
    if (w.media_type === 'movie' && watchedMovieIds.has(w.tmdb_id)) continue;
    rows.push(['хочу посмотреть', w.media_type, w.title, w.release_year, w.tmdb_id, '', '', '', '', w.notes ?? '', ymd(w.added_at)]);
  }
  // Custom list items
  const listById = new Map(ctx.lists.map((l) => [l.id, l]));
  for (const it of ctx.listItems) {
    const listName = listById.get(it.list_id)?.name ?? '?';
    rows.push(['в подборке', it.media_type, it.title, it.release_year, it.tmdb_id, '', '', '', listName, it.notes ?? '', ymd(it.added_at)]);
  }
  // Оценки без других связей
  for (const r of ctx.ratings) {
    const hasWatch = r.media_type === 'movie' && watchedMovieIds.has(r.tmdb_id);
    const hasEps = r.media_type === 'tv' && epByTv.has(r.tmdb_id);
    if (hasWatch || hasEps) continue;
    // Найдём название из watchlist или tvMeta или listItems
    const fromW = ctx.watchlist.find((w) => w.media_type === r.media_type && w.tmdb_id === r.tmdb_id);
    const fromTv = r.media_type === 'tv' ? metaByTv.get(r.tmdb_id) : null;
    const fromList = ctx.listItems.find((it) => it.media_type === r.media_type && it.tmdb_id === r.tmdb_id);
    const title = fromW?.title ?? fromTv?.title ?? fromList?.title ?? '';
    const year = fromW?.release_year ?? fromTv?.release_year ?? fromList?.release_year ?? '';
    rows.push(['оценка', r.media_type, title, year, r.tmdb_id, r.score, '', '', '', r.comment ?? '', '']);
  }
  return new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
}

/** Только просмотренное — компактно */
export async function exportWatchedCsv(): Promise<Blob> {
  const ctx = await loadExportContext();
  const headers = ['тип', 'название', 'год', 'tmdb_id', 'дата_просмотра', 'оценка', 'эпизодов_просмотрено', 'заметка'];
  const rows: (string | number | null | undefined)[][] = [];
  const ratingByKey = new Map(ctx.ratings.map((r) => [`${r.media_type}-${r.tmdb_id}`, r]));

  for (const m of ctx.watchedMovies) {
    const r = ratingByKey.get(`movie-${m.tmdb_id}`);
    rows.push(['movie', m.title, m.release_year, m.tmdb_id, ymd(m.watched_at), r?.score ?? '', '', r?.comment ?? '']);
  }
  const epByTv = new Map<number, { count: number; lastWatched: number }>();
  for (const ep of ctx.watchedEpisodes) {
    if (ep.season_number === 0) continue;
    const cur = epByTv.get(ep.tv_id) ?? { count: 0, lastWatched: 0 };
    cur.count++;
    if (ep.watched_at > cur.lastWatched) cur.lastWatched = ep.watched_at;
    epByTv.set(ep.tv_id, cur);
  }
  for (const [tvId, data] of epByTv) {
    const meta = ctx.tvMeta.find((m) => m.tv_id === tvId);
    const r = ratingByKey.get(`tv-${tvId}`);
    const epsLabel = meta ? `${data.count}/${(meta as any).total_episodes ?? '?'}` : String(data.count);
    rows.push(['tv', meta?.title ?? '', meta?.release_year ?? '', tvId, ymd(data.lastWatched), r?.score ?? '', epsLabel, r?.comment ?? '']);
  }
  rows.sort((a, b) => String(b[4] ?? '').localeCompare(String(a[4] ?? '')));
  return new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
}

/** Списки и watchlist */
export async function exportListsCsv(): Promise<Blob> {
  const ctx = await loadExportContext();
  const headers = ['источник', 'тип', 'название', 'год', 'tmdb_id', 'позиция', 'заметка', 'добавлено'];
  const rows: (string | number | null | undefined)[][] = [];
  const watchlistSorted = [...ctx.watchlist].sort((a, b) => b.added_at - a.added_at);
  watchlistSorted.forEach((w) => {
    rows.push(['Хочу посмотреть', w.media_type, w.title, w.release_year, w.tmdb_id, '', w.notes ?? '', ymd(w.added_at)]);
  });
  const listById = new Map(ctx.lists.map((l) => [l.id, l]));
  const byList = new Map<string, CustomListItem[]>();
  for (const it of ctx.listItems) {
    const arr = byList.get(it.list_id) ?? [];
    arr.push(it);
    byList.set(it.list_id, arr);
  }
  for (const [listId, items] of byList) {
    const name = listById.get(listId)?.name ?? '?';
    items.sort((a, b) => a.order - b.order);
    items.forEach((it, idx) => {
      rows.push([name, it.media_type, it.title, it.release_year, it.tmdb_id, idx + 1, it.notes ?? '', ymd(it.added_at)]);
    });
  }
  return new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
}

/** Только заметки */
export async function exportNotesCsv(): Promise<Blob> {
  const ctx = await loadExportContext();
  const headers = ['источник', 'тип', 'название', 'tmdb_id', 'заметка', 'дата'];
  const rows: (string | number | null | undefined)[][] = [];
  for (const w of ctx.watchlist) {
    if (w.notes && w.notes.trim()) {
      rows.push(['Хочу посмотреть', w.media_type, w.title, w.tmdb_id, w.notes, ymd(w.added_at)]);
    }
  }
  const listById = new Map(ctx.lists.map((l) => [l.id, l]));
  for (const it of ctx.listItems) {
    if (it.notes && it.notes.trim()) {
      rows.push([listById.get(it.list_id)?.name ?? '?', it.media_type, it.title, it.tmdb_id, it.notes, ymd(it.added_at)]);
    }
  }
  for (const r of ctx.ratings) {
    if (r.comment && r.comment.trim()) {
      const fromW = ctx.watchlist.find((w) => w.media_type === r.media_type && w.tmdb_id === r.tmdb_id);
      const fromTv = r.media_type === 'tv' ? ctx.tvMeta.find((m) => m.tv_id === r.tmdb_id) : null;
      const title = fromW?.title ?? fromTv?.title ?? '';
      rows.push(['Оценка', r.media_type, title, r.tmdb_id, r.comment, ymd(r.updated_at)]);
    }
  }
  return new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
}

// ===== Импорт =====

export type ImportFormat = 'moviebase-all' | 'moviebase-watched' | 'moviebase-lists' | 'letterboxd' | 'imdb-ratings' | 'unknown';

export interface ImportPreviewItem {
  status: 'watched' | 'watchlist' | 'list' | 'rating' | 'skip';
  media_type: 'movie' | 'tv';
  title: string;
  year: string;
  tmdb_id?: number;
  rating?: number;
  list_name?: string;
  watched_at?: number;
  added_at?: number;
  note?: string;
  match: 'id' | 'search' | 'not-found' | 'pending';
  poster_path?: string | null;
}

export interface ImportPreview {
  format: ImportFormat;
  items: ImportPreviewItem[];
  warnings: string[];
}

function detectFormat(headers: string[]): ImportFormat {
  const h = headers.map((s) => s.toLowerCase().trim());
  if (h.includes('статус') && h.includes('tmdb_id')) return 'moviebase-all';
  if (h.includes('эпизодов_просмотрено') || (h.includes('дата_просмотра') && h.includes('тип'))) return 'moviebase-watched';
  if (h.includes('источник') && h.includes('позиция')) return 'moviebase-lists';
  // Letterboxd: Date,Name,Year,Letterboxd URI [,Rating]
  if (h.includes('letterboxd uri') || (h.includes('name') && h.includes('year') && h.includes('date'))) return 'letterboxd';
  // IMDb: Const,Your Rating,Date Rated,Title,...
  if (h.includes('const') && (h.includes('your rating') || h.includes('title'))) return 'imdb-ratings';
  return 'unknown';
}

function colIdx(headers: string[], names: string[]): number {
  const norm = headers.map((s) => s.toLowerCase().trim());
  for (const n of names) {
    const idx = norm.indexOf(n.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Парсит CSV и возвращает preview, не записывая в БД */
export async function parseImportPreview(text: string): Promise<ImportPreview> {
  const rows = parseCsv(text);
  if (rows.length < 2) return { format: 'unknown', items: [], warnings: ['Файл пустой или нет данных'] };
  const headers = rows[0]!;
  const format = detectFormat(headers);
  const warnings: string[] = [];
  if (format === 'unknown') {
    warnings.push('Формат не распознан — попробую угадать по колонкам. Узнаю: тип/название/год/tmdb_id, или Letterboxd, или IMDb.');
  }

  const items: ImportPreviewItem[] = [];
  const dataRows = rows.slice(1);

  for (const r of dataRows) {
    const item = parseRow(headers, r, format);
    if (item) items.push(item);
  }

  return { format, items, warnings };
}

function parseRow(headers: string[], row: string[], format: ImportFormat): ImportPreviewItem | null {
  const get = (names: string[]): string => {
    const i = colIdx(headers, names);
    return i === -1 ? '' : (row[i] ?? '').trim();
  };

  if (format === 'letterboxd') {
    const title = get(['Name']);
    const year = get(['Year']);
    const date = get(['Date', 'Watched Date']);
    const rating = get(['Rating']); // 0.5-5.0 step
    if (!title) return null;
    const watched_at = parseDate(date) ?? undefined;
    const r = rating ? Math.round(parseFloat(rating) * 2) : undefined; // 0.5→1, 5.0→10
    return {
      status: 'watched',
      media_type: 'movie',
      title,
      year,
      watched_at: watched_at ?? undefined,
      rating: r,
      match: 'pending',
    };
  }
  if (format === 'imdb-ratings') {
    const title = get(['Title']);
    const year = get(['Year']);
    const rating = get(['Your Rating']);
    const tt = get(['Const']); // tt1234567 — IMDb id, не TMDB
    const date = get(['Date Rated', 'Created']);
    const titleType = get(['Title Type']).toLowerCase();
    if (!title) return null;
    const isTv = titleType.includes('series') || titleType.includes('episode');
    return {
      status: 'rating',
      media_type: isTv ? 'tv' : 'movie',
      title,
      year,
      rating: rating ? Number(rating) : undefined,
      watched_at: parseDate(date) ?? undefined,
      note: tt ? `IMDb: ${tt}` : undefined,
      match: 'pending',
    };
  }

  // Moviebase форматы
  const status = get(['статус', 'status']);
  const type = get(['тип', 'type']);
  const title = get(['название', 'title', 'name']);
  const year = get(['год', 'year']);
  const tmdb_id_raw = get(['tmdb_id', 'tmdb']);
  const rating = get(['оценка', 'rating']);
  const watched_date = get(['дата_просмотра', 'watched_at', 'watched']);
  const added_date = get(['добавлено', 'added_at', 'added']);
  const note = get(['заметка', 'note', 'comment']);
  const list_name = get(['подборка', 'источник', 'list']);

  if (!title && !tmdb_id_raw) return null;
  const media_type = type === 'tv' ? 'tv' : 'movie';
  const tmdb_id = tmdb_id_raw ? Number(tmdb_id_raw) : undefined;

  let s: ImportPreviewItem['status'] = 'skip';
  const sLower = status.toLowerCase();
  if (sLower.includes('просмотр') || sLower === 'watched') s = 'watched';
  else if (sLower.includes('подборк') || sLower.includes('list') || (list_name && list_name !== 'Хочу посмотреть')) s = 'list';
  else if (sLower.includes('хочу') || sLower.includes('watchlist') || list_name === 'Хочу посмотреть') s = 'watchlist';
  else if (sLower.includes('оценк') || sLower === 'rating') s = 'rating';
  else if (watched_date) s = 'watched';
  else if (list_name === 'Хочу посмотреть' || !list_name) s = 'watchlist';

  return {
    status: s,
    media_type,
    title,
    year,
    tmdb_id: Number.isFinite(tmdb_id) ? tmdb_id : undefined,
    rating: rating ? Number(rating) : undefined,
    watched_at: parseDate(watched_date) ?? undefined,
    added_at: parseDate(added_date) ?? undefined,
    note: note || undefined,
    list_name: list_name && list_name !== 'Хочу посмотреть' ? list_name : undefined,
    match: tmdb_id ? 'id' : 'pending',
  };
}

/** Дообогащает preview, ищет недостающие tmdb_id через TMDB API. С debounce и онбордингом. */
export async function resolveTmdbIds(
  items: ImportPreviewItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportPreviewItem[]> {
  const toResolve = items.filter((it) => it.match === 'pending');
  let done = 0;
  for (const it of toResolve) {
    try {
      const res = await api.search(it.title);
      // Фильтруем по типу и пытаемся подобрать по году
      const candidates = res.results.filter((m) => {
        const isMovie = (m as any).title !== undefined;
        return (it.media_type === 'movie') === isMovie;
      });
      let best = candidates[0];
      if (it.year && candidates.length > 1) {
        const byYear = candidates.find((m) => {
          const date = (m as any).release_date ?? (m as any).first_air_date ?? '';
          return date.slice(0, 4) === it.year;
        });
        if (byYear) best = byYear;
      }
      if (best) {
        it.tmdb_id = best.id;
        it.poster_path = best.poster_path;
        it.match = 'search';
      } else {
        it.match = 'not-found';
      }
    } catch {
      it.match = 'not-found';
    }
    done++;
    onProgress?.(done, toResolve.length);
    // Лёгкий троттлинг
    await new Promise((r) => setTimeout(r, 50));
  }
  return items;
}

/** Применяет preview к БД */
export async function applyImport(items: ImportPreviewItem[]): Promise<{ applied: number; skipped: number }> {
  let applied = 0, skipped = 0;
  // Кэш созданных custom списков по имени
  const existingLists = await db.lists.toArray();
  const listsByName = new Map<string, string>(existingLists.map((l) => [l.name.toLowerCase(), l.id]));

  for (const it of items) {
    if (!it.tmdb_id || it.match === 'not-found') { skipped++; continue; }
    const info = {
      media_type: it.media_type,
      tmdb_id: it.tmdb_id,
      title: it.title,
      poster_path: it.poster_path ?? null,
      release_year: it.year,
    };
    try {
      if (it.status === 'watched') {
        if (it.media_type === 'movie') {
          await markMovieWatched(info, it.watched_at ?? now());
        } else {
          // Для tv пометить просмотренными мы не можем поэпизодно из CSV без деталей; кладём в watchlist
          await addToWatchlist(info, it.note ?? '');
        }
        if (it.rating !== undefined) {
          await setRating(info, it.rating, it.note ?? '');
        }
      } else if (it.status === 'watchlist') {
        await addToWatchlist(info, it.note ?? '');
      } else if (it.status === 'list') {
        const listName = it.list_name ?? 'Импорт';
        const lower = listName.toLowerCase();
        let lid = listsByName.get(lower);
        if (!lid) {
          const created = await createList(listName);
          lid = created.id;
          listsByName.set(lower, lid);
        }
        await addToList(lid, info, it.note ?? '');
      } else if (it.status === 'rating') {
        if (it.rating !== undefined) await setRating(info, it.rating, it.note ?? '');
        else { skipped++; continue; }
        // Если есть watched_date — также пометить просмотренным
        if (it.watched_at && it.media_type === 'movie') {
          await markMovieWatched(info, it.watched_at);
        }
      } else { skipped++; continue; }
      // Обновим заметку в watchlist если она пришла отдельно
      if (it.note && it.status === 'watchlist') {
        await updateWatchlistNotes(it.media_type, it.tmdb_id, it.note);
      }
      // Отметить отдельные эпизоды нельзя из CSV; для совместимости — игнорируем
      void markEpisodeWatched;
      applied++;
    } catch {
      skipped++;
    }
  }
  return { applied, skipped };
}

// Вспомогательно для k импорта/экспорта
void k;
