import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/tmdb';
import { MediaRow } from '../components/media-row';
import { UpcomingFromWatchlist } from '../components/upcoming-from-watchlist';

export function Home() {
  const trending = useQuery({ queryKey: ['trending', 'week'], queryFn: () => api.trending('week') });
  const popularMovies = useQuery({ queryKey: ['popular', 'movie'], queryFn: () => api.popularMovies() });
  const popularTv = useQuery({ queryKey: ['popular', 'tv'], queryFn: () => api.popularTv() });
  const nowPlaying = useQuery({ queryKey: ['nowPlaying'], queryFn: () => api.nowPlaying() });
  const onTheAir = useQuery({ queryKey: ['onTheAir'], queryFn: () => api.onTheAir() });
  const topMovies = useQuery({ queryKey: ['top', 'movie'], queryFn: () => api.topRatedMovies() });
  const upcoming = useQuery({ queryKey: ['upcoming'], queryFn: () => api.upcoming() });

  return (
    <div className="pt-6">
      <header className="px-4 mb-7 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xs uppercase tracking-[0.2em] text-text-dim">Личная коллекция</p>
          <h1 className="display-title text-4xl mt-1 leading-none italic">Moviebase</h1>
        </div>
        <Link
          to="/discover"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-bg-elevated text-text-muted active:border-accent active:text-accent"
        >
          <Sparkles size={13} /> Подбор
        </Link>
      </header>

      <UpcomingFromWatchlist />

      <MediaRow title="В тренде" items={trending.data?.results} loading={trending.isLoading} />
      <MediaRow title="Сейчас в кино" items={nowPlaying.data?.results} loading={nowPlaying.isLoading} />
      <MediaRow title="В эфире" items={onTheAir.data?.results} loading={onTheAir.isLoading} />
      <MediaRow title="Популярные фильмы" items={popularMovies.data?.results} loading={popularMovies.isLoading} />
      <MediaRow title="Популярные сериалы" items={popularTv.data?.results} loading={popularTv.isLoading} />
      <MediaRow title="Скоро в прокате" items={upcoming.data?.results} loading={upcoming.isLoading} />
      <MediaRow title="Топ-рейтинг" items={topMovies.data?.results} loading={topMovies.isLoading} />
    </div>
  );
}
