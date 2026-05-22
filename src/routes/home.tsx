import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePersistedState } from '../hooks/use-persisted-state';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { api, type DiscoverSort, type MediaSummary } from '../lib/tmdb';
import { MediaRow } from '../components/media-row';
import { MediaCard } from '../components/media-card';
import { UpcomingFromWatchlist } from '../components/upcoming-from-watchlist';

type Kind = 'all' | 'movie' | 'tv';

const SORT_LABELS: Record<DiscoverSort, string> = {
  'popularity.desc': 'По популярности',
  'vote_average.desc': 'По рейтингу',
  'primary_release_date.desc': 'Сначала новые',
  'primary_release_date.asc': 'Сначала старые',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);
const RATINGS = [6, 6.5, 7, 7.5, 8, 8.5, 9];

export function Home() {
  const [kind, setKind] = usePersistedState<Kind>('mb-home-kind', 'all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = usePersistedState<DiscoverSort>('mb-home-sort', 'popularity.desc');
  const [genreId, setGenreId] = usePersistedState<number | undefined>('mb-home-genre', undefined);
  const [year, setYear] = usePersistedState<number | undefined>('mb-home-year', undefined);
  const [minRating, setMinRating] = usePersistedState<number | undefined>('mb-home-min-rating', undefined);

  const filtersActive = kind !== 'all' || genreId !== undefined || year !== undefined || minRating !== undefined || sort !== 'popularity.desc';

  const movieGenres = useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () => api.movieGenres(),
    staleTime: Infinity,
  });
  const tvGenres = useQuery({
    queryKey: ['genres', 'tv'],
    queryFn: () => api.tvGenres(),
    staleTime: Infinity,
  });

  const activeGenres = kind === 'tv' ? tvGenres.data?.genres : movieGenres.data?.genres;

  const discoverMovies = useQuery({
    queryKey: ['discover', 'movie', sort, genreId, year, minRating],
    queryFn: () => api.discoverMovies({ sort_by: sort, genre_id: genreId, year, minRating }),
    enabled: filtersActive && kind !== 'tv',
    placeholderData: (prev) => prev,
  });
  const discoverTv = useQuery({
    queryKey: ['discover', 'tv', sort, genreId, year, minRating],
    queryFn: () => api.discoverTv({ sort_by: sort, genre_id: genreId, year, minRating }),
    enabled: filtersActive && kind !== 'movie',
    placeholderData: (prev) => prev,
  });

  const trending = useQuery({ queryKey: ['trending', 'week'], queryFn: () => api.trending('week'), enabled: !filtersActive });
  const popularMovies = useQuery({ queryKey: ['popular', 'movie'], queryFn: () => api.popularMovies(), enabled: !filtersActive });
  const popularTv = useQuery({ queryKey: ['popular', 'tv'], queryFn: () => api.popularTv(), enabled: !filtersActive });
  const nowPlaying = useQuery({ queryKey: ['nowPlaying'], queryFn: () => api.nowPlaying(), enabled: !filtersActive });
  const onTheAir = useQuery({ queryKey: ['onTheAir'], queryFn: () => api.onTheAir(), enabled: !filtersActive });
  const topMovies = useQuery({ queryKey: ['top', 'movie'], queryFn: () => api.topRatedMovies(), enabled: !filtersActive });
  const upcoming = useQuery({ queryKey: ['upcoming'], queryFn: () => api.upcoming(), enabled: !filtersActive });

  const filteredItems = useMemo(() => {
    if (!filtersActive) return [];
    const movieResults = (discoverMovies.data?.results ?? []).map((m) => ({ ...m, media_type: 'movie' as const })) as MediaSummary[];
    const tvResults = (discoverTv.data?.results ?? []).map((m) => ({ ...m, media_type: 'tv' as const })) as MediaSummary[];
    if (kind === 'movie') return movieResults;
    if (kind === 'tv') return tvResults;
    // all: interleave
    const merged: MediaSummary[] = [];
    const max = Math.max(movieResults.length, tvResults.length);
    for (let i = 0; i < max; i++) {
      if (movieResults[i]) merged.push(movieResults[i]);
      if (tvResults[i]) merged.push(tvResults[i]);
    }
    return merged;
  }, [filtersActive, kind, discoverMovies.data, discoverTv.data]);

  const resetFilters = () => {
    setKind('all');
    setGenreId(undefined);
    setYear(undefined);
    setMinRating(undefined);
    setSort('popularity.desc');
    setFiltersOpen(false);
  };

  const isLoading = filtersActive && (
    (kind !== 'tv' && discoverMovies.isLoading) ||
    (kind !== 'movie' && discoverTv.isLoading)
  );

  return (
    <div className="pt-6">
      <header className="px-4 mb-5">
        <div className="flex items-end justify-between gap-3 mb-4">
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
        </div>

        {/* Kind tabs */}
        <div className="flex items-center gap-2">
          {(['all', 'movie', 'tv'] as Kind[]).map((k) => {
            const labels = { all: 'Всё', movie: 'Фильмы', tv: 'Сериалы' };
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  kind === k ? 'bg-accent text-bg' : 'bg-bg-elevated text-text-muted border border-border',
                )}
              >
                {labels[k]}
              </button>
            );
          })}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={clsx(
              'ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
              (filtersOpen || (filtersActive && kind === 'all' && !genreId && !year && !minRating && sort === 'popularity.desc'))
                ? 'border-accent/50 bg-accent/10 text-accent'
                : filtersActive
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-bg-elevated text-text-muted',
            )}
          >
            <SlidersHorizontal size={13} />
            {filtersActive && (kind !== 'all' || genreId || year || minRating || sort !== 'popularity.desc') ? 'Фильтры ●' : 'Фильтры'}
          </button>
        </div>
      </header>

      {/* Filter panel */}
      {filtersOpen && (
        <section className="mx-4 mb-5 bg-bg-elevated border border-border rounded-lg p-3 space-y-3">
          <FilterRow label="Сортировка">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as DiscoverSort)}
              className="bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            >
              {Object.entries(SORT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Жанр">
            <select
              value={genreId ?? ''}
              onChange={(e) => setGenreId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent flex-1 min-w-0"
            >
              <option value="">Любой</option>
              {(activeGenres ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Год">
            <select
              value={year ?? ''}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Любой</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </FilterRow>

          <FilterRow label="Рейтинг ≥">
            <div className="flex gap-1.5 flex-wrap justify-end">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(minRating === r ? undefined : r)}
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs border transition-colors',
                    minRating === r
                      ? 'bg-accent text-bg border-accent'
                      : 'bg-bg border-border text-text-muted',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </FilterRow>

          {(genreId || year || minRating || sort !== 'popularity.desc') && (
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center gap-1 text-2xs text-text-muted active:text-accent py-1"
            >
              <X size={11} /> Сбросить все фильтры
            </button>
          )}
        </section>
      )}

      {/* Content */}
      {!filtersActive ? (
        /* Default home — beautiful rows */
        <div>
          <UpcomingFromWatchlist />
          <MediaRow title="В тренде" items={trending.data?.results} loading={trending.isLoading} />
          <MediaRow title="Сейчас в кино" items={nowPlaying.data?.results} loading={nowPlaying.isLoading} />
          <MediaRow title="В эфире" items={onTheAir.data?.results} loading={onTheAir.isLoading} />
          <MediaRow title="Популярные фильмы" items={popularMovies.data?.results} loading={popularMovies.isLoading} />
          <MediaRow title="Популярные сериалы" items={popularTv.data?.results} loading={popularTv.isLoading} />
          <MediaRow title="Скоро в прокате" items={upcoming.data?.results} loading={upcoming.isLoading} />
          <MediaRow title="Топ-рейтинг" items={topMovies.data?.results} loading={topMovies.isLoading} />
        </div>
      ) : (
        /* Filtered grid */
        <div className="px-4">
          {isLoading && (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-elevated rounded-md animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && filteredItems.length === 0 && (
            <div className="py-20 text-center text-text-dim text-sm">
              Ничего не нашлось — попробуй другие фильтры
            </div>
          )}
          {filteredItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {filteredItems.map((m) => (
                <MediaCard key={`${m.media_type}-${m.id}`} media={m} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pb-8" />
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-muted shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}
