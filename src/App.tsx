import { Route, Routes, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { TmdbTokenWarning } from './components/tmdb-token-warning';

export default function App() {
  const location = useLocation();
  const qc = useQueryClient();
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
