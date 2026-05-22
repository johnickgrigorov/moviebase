/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

// __WB_MANIFEST подставит vite-plugin-pwa injectManifest при сборке
precacheAndRoute(self.__WB_MANIFEST);

// TMDB images: CacheFirst, 30 дней, 1000 entries
registerRoute(
  ({ url }) => url.hostname === 'image.tmdb.org',
  new CacheFirst({
    cacheName: 'tmdb-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// TMDB API: NetworkFirst, 5 сек таймаут, 1 день
registerRoute(
  ({ url }) => url.hostname === 'api.themoviedb.org',
  new NetworkFirst({
    cacheName: 'tmdb-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

// === Custom: уведомления о новых сериях с actions ===

// При клике на нотификацию (или на action) — открываем приложение на странице
// сериала и (для action) отправляем сообщение клиенту чтобы пометить серию
// просмотренной через Dexie.
self.addEventListener('notificationclick', (event) => {
  const ev = event as NotificationEvent;
  ev.notification.close();
  const data = (ev.notification.data ?? {}) as {
    tv_id?: number; season?: number; episode?: number; baseUrl?: string;
  };
  const action = ev.action;
  const baseUrl = data.baseUrl ?? '/';

  const targetHash = data.tv_id ? `#/tv/${data.tv_id}` : '#/';

  ev.waitUntil((async () => {
    // Найдём открытое окно приложения, если есть — фокус. Иначе откроем новое.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let client = clients.find((c) => c.url.includes(baseUrl)) ?? clients[0];

    if (action === 'mark-watched' && data.tv_id && data.season !== undefined && data.episode !== undefined) {
      // Шлём сообщение клиенту — он применит в Dexie через mutations.markEpisodeWatched.
      // Если окна нет — откроем со специальным маркером в URL, App.tsx обработает.
      if (client) {
        client.postMessage({
          type: 'mark-episode-watched',
          tv_id: data.tv_id,
          season: data.season,
          episode: data.episode,
        });
        await client.focus();
      } else {
        const url = `${baseUrl}${targetHash}?mark=S${data.season}E${data.episode}`;
        await self.clients.openWindow(url);
      }
      return;
    }

    // Обычный клик: фокус на существующее окно или открыть новое на странице сериала
    if (client) {
      // navigate в hash route — отправим клиенту команду
      client.postMessage({ type: 'navigate', to: `/tv/${data.tv_id ?? ''}` });
      await client.focus();
    } else {
      await self.clients.openWindow(`${baseUrl}${targetHash}`);
    }
  })());
});

// Принимаем skipWaiting для autoUpdate
self.addEventListener('message', (event) => {
  const msg = (event as ExtendableMessageEvent).data as { type?: string };
  if (msg?.type === 'SKIP_WAITING') self.skipWaiting();
});

export {};
