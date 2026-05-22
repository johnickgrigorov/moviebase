/**
 * Local Notifications для сериалов с next_episode_to_air сегодня/завтра.
 *
 * Web Push с server-стороны невозможен на GitHub Pages (нет VAPID-сервера).
 * Используем Notification API напрямую: проверяем watchlist при загрузке
 * приложения, если сегодня/завтра выходит новая серия — кидаем нотификацию.
 *
 * Чтобы не спамить — в localStorage храним ключи показанных нотификаций.
 */

import { db } from './db';
import { api } from './tmdb';

const SHOWN_KEY = 'mb-notif-shown'; // { tv_id-season-episode: timestamp }
const CHECK_INTERVAL_KEY = 'mb-notif-last-check';
const PERMISSION_ASKED_KEY = 'mb-notif-permission-asked';
const HORIZON_HOURS = 36; // окно "сегодня/завтра"
const MIN_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // не чаще раза в 6ч

function readShown(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SHOWN_KEY) ?? '{}'); } catch { return {}; }
}
function writeShown(m: Record<string, number>): void {
  try { localStorage.setItem(SHOWN_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function isNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotifications(): Promise<NotificationPermission> {
  if (!isNotificationsSupported()) return 'denied';
  try { localStorage.setItem(PERMISSION_ASKED_KEY, '1'); } catch { /* ignore */ }
  if (Notification.permission !== 'default') return Notification.permission;
  const result = await Notification.requestPermission();
  return result;
}

export function hasAskedPermission(): boolean {
  try { return localStorage.getItem(PERMISSION_ASKED_KEY) === '1'; } catch { return false; }
}

interface UpcomingEpisode {
  tv_id: number;
  title: string;
  season: number;
  episode: number;
  air_date: string;
  air_ts: number;
}

/**
 * Сканирует tv-сериалы из watchlist (и tvMeta), запрашивает next_episode_to_air,
 * возвращает те, что выходят в ближайшие HORIZON_HOURS.
 */
export async function findUpcomingEpisodes(): Promise<UpcomingEpisode[]> {
  const [watchlist, tvMeta] = await Promise.all([db.watchlist.toArray(), db.tvMeta.toArray()]);
  // Кандидаты: сериалы из watchlist + сериалы с tvMeta (т.е. ранее просмотренные)
  const tvIds = new Set<number>();
  for (const w of watchlist) if (w.media_type === 'tv') tvIds.add(w.tmdb_id);
  for (const m of tvMeta) tvIds.add(m.tv_id);
  // Ограничим, чтобы не задудосить TMDB
  const ids = [...tvIds].slice(0, 30);

  const now = Date.now();
  const horizon = now + HORIZON_HOURS * 60 * 60 * 1000;

  const upcoming: UpcomingEpisode[] = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        const d = await api.tvDetails(id);
        const ne = d.next_episode_to_air;
        if (!ne?.air_date) return;
        const ts = Date.parse(ne.air_date);
        if (Number.isNaN(ts) || ts < now - 12 * 60 * 60 * 1000 || ts > horizon) return;
        upcoming.push({
          tv_id: id,
          title: d.name,
          season: ne.season_number,
          episode: ne.episode_number,
          air_date: ne.air_date,
          air_ts: ts,
        });
      } catch {
        // ignore
      }
    }),
  );
  return upcoming;
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    // ServiceWorker регистрируется workbox через vite-plugin-pwa; ждём ready.
    const reg = await navigator.serviceWorker.ready;
    return reg ?? null;
  } catch {
    return null;
  }
}

/**
 * Показать локальные уведомления для найденных серий через ServiceWorker
 * (registration.showNotification — единственный путь, работающий в iOS PWA standalone).
 * Fallback на new Notification если SW недоступен (десктоп без PWA).
 */
export async function notifyUpcoming(items: UpcomingEpisode[], baseUrl: string): Promise<void> {
  if (!isNotificationsSupported() || Notification.permission !== 'granted') return;
  const shown = readShown();
  const now = Date.now();
  // Чистим старые записи (>10 дней)
  for (const k of Object.keys(shown)) {
    if (now - shown[k]! > 10 * 24 * 60 * 60 * 1000) delete shown[k];
  }

  const reg = await getSwRegistration();

  for (const it of items) {
    const key = `${it.tv_id}-${it.season}-${it.episode}`;
    if (shown[key]) continue;
    const title = `Новая серия: ${it.title}`;
    const options: NotificationOptions & { data?: unknown } = {
      body: `S${it.season}E${it.episode} — ${it.air_date}`,
      icon: `${baseUrl}icon-192.png`,
      badge: `${baseUrl}icon-192.png`,
      tag: key,
      data: { tv_id: it.tv_id },
    };
    try {
      if (reg) {
        // Путь iOS PWA / Android Chrome
        await reg.showNotification(title, options);
      } else {
        // Десктоп без PWA: классический Notification API
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          window.location.hash = `#/tv/${it.tv_id}`;
          n.close();
        };
      }
      shown[key] = now;
    } catch {
      // Тихо игнорируем — на iOS Safari без PWA или старых браузерах
    }
  }
  writeShown(shown);
}

/**
 * Главный entry point — вызывается из main.tsx после initialSync.
 * Сам решает: проверять ли сейчас (троттлинг через localStorage).
 */
export async function checkUpcomingNotifications(baseUrl: string): Promise<void> {
  if (!isNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const lastCheck = Number(localStorage.getItem(CHECK_INTERVAL_KEY) ?? '0');
    if (Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS) return;
    localStorage.setItem(CHECK_INTERVAL_KEY, String(Date.now()));
  } catch { /* ignore */ }
  const items = await findUpcomingEpisodes();
  await notifyUpcoming(items, baseUrl);
}
