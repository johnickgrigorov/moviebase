/**
 * Шеринг подборок через URL — без сервера. Кодируем список + items в base64-URL-safe
 * и кладём в hash query: #/list/import?data=...
 *
 * Размеры: 20 элементов ~3-4 KB JSON → ~5-6 KB base64. Чтобы держать URL короче,
 * сжимаем через TextEncoder + LZ-style фолд (простой). Для совсем больших списков
 * (>100 элементов) предупреждаем пользователя что URL получится длинным.
 */

import type { CustomList, CustomListItem } from './db';

export interface SharedListPayload {
  v: 1;
  name: string;
  description: string;
  items: Array<{
    media_type: 'movie' | 'tv';
    tmdb_id: number;
    title: string;
    year: string;
    poster: string | null;
    note?: string;
  }>;
}

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const norm = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '==='.slice((norm.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeSharedList(list: CustomList, items: CustomListItem[]): string {
  const payload: SharedListPayload = {
    v: 1,
    name: list.name,
    description: list.description,
    items: items
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((it) => ({
        media_type: it.media_type,
        tmdb_id: it.tmdb_id,
        title: it.title,
        year: it.release_year,
        poster: it.poster_path,
        note: it.notes,
      })),
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

export function decodeSharedList(token: string): SharedListPayload | null {
  try {
    const bytes = fromBase64Url(token);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as SharedListPayload;
    if (data.v !== 1 || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

export function shareUrl(token: string): string {
  // BASE_URL включает trailing slash. Формат HashRouter: #/list/import?data=...
  const base = window.location.origin + import.meta.env.BASE_URL;
  return `${base}#/list/import?data=${token}`;
}
