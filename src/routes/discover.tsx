import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePersistedState } from '../hooks/use-persisted-state';
import { ChevronDown, Filter, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import {
  api,
  mediaType,
  type DiscoverSort,
  type MediaSummary,
  type Paged,
} from '../lib/tmdb';
import { MediaCard } from '../components/media-card';

type Kind = 'movie' | 'tv';

const SORT_LABELS: Record<DiscoverSort, string> = {
  'popularity.desc': 'По популярности',
  'vote_average.desc': 'По рейтингу',
  'primary_release_date.desc': 'Сначала новые',
  'primary_release_date.asc': 'Сначала старые',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

export function Discover() {
  const [kind, setKind] = usePersistedState<Kind>('mb-discover-kind', 'movie');
  const [sort, setSort] = usePersistedState<DiscoverSort>('mb-discover-sort', 'popularity.desc');
  const [genreId, setGenreId] = usePersistedState<number | undefined>('mb-discover-genre', undefined);
  const [year, setYear] = usePersistedState<number | undefined>('mb-discover-year', undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const genres = useQuery({
    queryKey: ['genres', kind] as const,
    queryFn: () => (kind === 'movie' ? api.movieGenres() : api.tvGenres()),
    staleTime: Infinity,
  });

  const results = useQuery<Paged<MediaSummary>>({
    queryKey: ['discover', kind, sort, genreId, year],
    queryFn: async () => {
      if (kind === 'movie') {
        const res = await api.discoverMovies({ sort_by: sort, genre_id: genreId, year });
        return res as Paged<MediaSummary>;
      }
      const res = await api.discoverTv({ sort_by: sort, genre_id: genreId, year });
      return res as Paged<MediaSummary>;
    },
    placeholderData: (prev: Paged<MediaSummary> | undefined) => prev,
  });

  const items = useMemo(() => results.data?.results ?? [], [results.data]);
  const hasActive = genreId !== undefined || year !== undefined || sort !== 'popularity.desc';

  const resetFilters = () => {
    setGenreId(undefined);
    setYear(undefined);
    setSort('popularity.desc');
  };

  return (
    <div className="pt-6">
      <header className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="display-title text-3xl flex items-center gap-2">
            <Sparkles size={20} className="text-accent" /> Подбор
          </h1>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
              hasActive
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-bg-elevated text-text-muted',
            )}
          >
            <Filter size={13} />
            Фильтры
            <ChevronDown size={13} className={clsx('transition-transform', filtersOpen && 'rotate-180')} />
          </button>
        </div>

        <div className="flex gap-2">
          <Pill active={kind === 'movie'} onClick={() => setKind('movie')}>Фильмы</Pill>
          <Pill active={kind === 'tv'} onClick={() => setKind('tv')}>Сериалы</Pill>
        </div>
      </header>

      {filtersOpen && (
        <section className="mx-4 mb-5 bg-bg-elevated border border-border rounded-lg p-3 space-y-3">
          <FilterRow label="Сортировка">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as DiscoverSort)}
              className="bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            >
              {Object.entries(SORT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Жанр">
            <select
              value={genreId ?? ''}
              onChange={(e) => setGenreId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent flex-1 min-w-0"
              disabled={genres.isLoading}
            >
              <option value="">Любой</option>
              {genres.data?.genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
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
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </FilterRow>

          {hasActive && (
            <button
              onClick={resetFilters}
              className="w-full text-2xs text-text-muted active:text-accent py-1"
            >
              Сбросить фильтры
            </button>
          )}
        </section>
      )}

      <div className="px-4">
        {results.isLoading && !results.data && (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bg-elevated rounded-md animate-pulse" />
            ))}
          </div>
        )}

        {!results.isLoading && items.length === 0 && (
          <div className="py-20 text-center text-text-dim text-sm">
            Ничего не нашлось — попробуй другие фильтры
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {items.map((m: MediaSummary) => (
                <MediaCard key={`${kind}-${m.id}`} media={m} />
              ))}
            </div>
            {results.isFetching && (
              <div className="mt-4 flex justify-center text-text-dim">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="pb-8" />
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        active ? 'bg-accent text-bg' : 'bg-bg-elevated text-text-muted border border-border',
      )}
    >
      {children}
    </button>
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
