import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { markEpisodeWatched } from './lib/mutations';
import { NavBar } from './components/nav-bar';
import { usePullToRefresh } from './hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from './components/pull-to-refresh-indicator';
import { BackToTop } from './components/back-to-top';
import { Home } from './routes/home';
import { Search } from './routes/search';
import { Lists } from './routes/lists';
import { Profile } from './routes/profile';
import { Discover } from './routes/discover';
import { MovieDetails } from './routes/movie-details';
import { TvDetails } from './routes/tv-details';
import { SeasonDetails } from './routes/season-details';
import { ListView } from './routes/list-view';
import { PersonDetails } from './routes/person-details';
import { Stats } from './routes/stats';
import { ListImport } from './routes/list-import';
import { TmdbTokenWarning } from './components/tmdb-token-warning';

export default function App() {
  const location = useLocation();
  const qc = useQueryClient();
  const nav = useNavigate();

  // Сообщения от Service Worker (от уведомлений)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data as { type?: string; tv_id?: number; season?: number; episode?: number; to?: string };
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'mark-episode-watched' && msg.tv_id && msg.season !== undefined && msg.episode !== undefined) {
        void markEpisodeWatched(msg.tv_id, msg.season, msg.episode).then(() => {
          nav(`/tv/${msg.tv_id}`);
        });
      } else if (msg.type === 'navigate' && msg.to) {
        nav(msg.to);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [nav]);

  // Обработка ?mark=S1E1 в URL — если приложение открылось из notification action
  // когда окно было закрыто, SW открыл новое окно с этим параметром.
  useEffect(() => {
    const hash = window.location.hash; // #/tv/123?mark=S1E1
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const mark = params.get('mark');
    const tvMatch = hash.match(/#\/tv\/(\d+)/);
    if (mark && tvMatch) {
      const tvId = Number(tvMatch[1]);
      const m = mark.match(/^S(\d+)E(\d+)$/);
      if (m) {
        const season = Number(m[1]);
        const episode = Number(m[2]);
        void markEpisodeWatched(tvId, season, episode).then(() => {
          // Очищаем параметр из URL
          window.history.replaceState(null, '', `#/tv/${tvId}`);
        });
      }
    }
  }, []);
  const isDetailPage =
    location.pathname.startsWith('/movie/') ||
    location.pathname.startsWith('/tv/') ||
    location.pathname.startsWith('/list/') ||
    location.pathname.startsWith('/person/') ||
    location.pathname === '/stats';

  // Pull-to-refresh: инвалидируем все React Query запросы — данные сами перетянутся
  const ptr = usePullToRefresh(() => qc.invalidateQueries());

  return (
    <div className="min-h-screen mx-auto max-w-app pb-20 grain">
      <PullToRefreshIndicator {...ptr} />
      <TmdbTokenWarning />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/tv/:id" element={<TvDetails />} />
        <Route path="/tv/:id/season/:season" element={<SeasonDetails />} />
        <Route path="/list/:id" element={<ListView />} />
        <Route path="/person/:id" element={<PersonDetails />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/list/import" element={<ListImport />} />
      </Routes>
      {!isDetailPage && (
        <>
          <BackToTop />
          <NavBar />
        </>
      )}
    </div>
  );
}
