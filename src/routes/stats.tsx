import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQueries, useQuery } from '@tanstack/react-query';
import { BarChart3, Film, Tv2, Star, Calendar, Repeat2 } from 'lucide-react';
import { db } from '../lib/db';
import { api } from '../lib/tmdb';
import { BackButton } from '../components/back-button';
import { formatHours, plural } from '../lib/format';

const MONTHS_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface MonthBucket {
  ym: string;             // YYYY-MM
  label: string;          // "Янв 26"
  movies: number;
  episodes: number;
  rewatches: number;
  total: number;
}

function buildMonths(now: Date, monthsBack: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      ym,
      label: `${MONTHS_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      movies: 0,
      episodes: 0,
      rewatches: 0,
      total: 0,
    });
  }
  return buckets;
}

function tsToYm(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Stats() {
  const watchedMovies = useLiveQuery(() => db.watchedMovies.toArray()) ?? [];
  const watchedEps = useLiveQuery(() => db.watchedEpisodes.toArray()) ?? [];
  const rewatches = useLiveQuery(() => db.rewatches.toArray()) ?? [];
  const ratings = useLiveQuery(() => db.ratings.toArray()) ?? [];
  const tvMeta = useLiveQuery(() => db.tvMeta.toArray()) ?? [];

  // Месячные бакеты — последние 12 месяцев
  const months = useMemo(() => {
    const buckets = buildMonths(new Date(), 12);
    const map = new Map(buckets.map((b) => [b.ym, b]));
    for (const m of watchedMovies) {
      const b = map.get(tsToYm(m.watched_at));
      if (b) { b.movies++; b.total++; }
    }
    for (const e of watchedEps) {
      if (e.season_number === 0) continue;
      const b = map.get(tsToYm(e.watched_at));
      if (b) { b.episodes++; b.total++; }
    }
    for (const r of rewatches) {
      const b = map.get(tsToYm(r.watched_at));
      if (b) { b.rewatches++; b.total++; }
    }
    return buckets;
  }, [watchedMovies, watchedEps, rewatches]);

  const maxMonth = Math.max(1, ...months.map((m) => m.total));
  const totalThisYear = months.slice(-12).reduce((s, m) => s + m.total, 0);
  const totalLifetimeMinutes = watchedMovies.length * 110 + watchedEps.length * 45 + rewatches.length * 100;

  // Genres: ленивая подгрузка деталей просмотренных фильмов
  // Берём id из watchedMovies и tvMeta (для просмотренных сериалов)
  const movieIds = useMemo(() => watchedMovies.slice(0, 60).map((m) => m.tmdb_id), [watchedMovies]);
  const tvIds = useMemo(() => {
    const ids = new Set<number>();
    for (const e of watchedEps) ids.add(e.tv_id);
    return [...ids].slice(0, 30);
  }, [watchedEps]);

  const movieDetailsQs = useQueries({
    queries: movieIds.map((id) => ({
      queryKey: ['movie', id],
      queryFn: () => api.movieDetails(id),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });
  const tvDetailsQs = useQueries({
    queries: tvIds.map((id) => ({
      queryKey: ['tv', id],
      queryFn: () => api.tvDetails(id),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });

  const movieGenresList = useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () => api.movieGenres(),
    staleTime: Infinity,
  });
  const tvGenresList = useQuery({
    queryKey: ['genres', 'tv'],
    queryFn: () => api.tvGenres(),
    staleTime: Infinity,
  });

  const allGenres = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of movieGenresList.data?.genres ?? []) map.set(g.id, g.name);
    for (const g of tvGenresList.data?.genres ?? []) {
      if (!map.has(g.id)) map.set(g.id, g.name);
    }
    return map;
  }, [movieGenresList.data, tvGenresList.data]);

  const genreCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const q of movieDetailsQs) {
      if (!q.data) continue;
      for (const g of q.data.genres) counts.set(g.id, (counts.get(g.id) ?? 0) + 1);
    }
    for (const q of tvDetailsQs) {
      if (!q.data) continue;
      for (const g of q.data.genres) counts.set(g.id, (counts.get(g.id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, name: allGenres.get(id) ?? `#${id}`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [movieDetailsQs, tvDetailsQs, allGenres]);

  const detailsLoaded = movieDetailsQs.filter((q) => q.data).length + tvDetailsQs.filter((q) => q.data).length;
  const detailsTotal = movieDetailsQs.length + tvDetailsQs.length;
  const detailsLoading = detailsLoaded < detailsTotal && detailsTotal > 0;

  // Средний рейтинг + распределение
  const ratingBuckets = useMemo(() => {
    const buckets = Array.from({ length: 10 }, () => 0);
    for (const r of ratings) {
      const i = Math.max(0, Math.min(9, r.score - 1));
      buckets[i]!++;
    }
    return buckets;
  }, [ratings]);
  const maxRating = Math.max(1, ...ratingBuckets);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;

  // Уникальных сериалов в просмотренном
  const uniqueSeries = useMemo(() => {
    const s = new Set<number>();
    for (const e of watchedEps) s.add(e.tv_id);
    return s.size;
  }, [watchedEps]);

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 mb-5 flex items-center gap-3">
        <BackButton />
        <h1 className="display-title text-2xl flex items-center gap-2">
          <BarChart3 size={20} className="text-accent" /> Статистика
        </h1>
      </div>

      {/* Сводка */}
      <section className="px-4 grid grid-cols-2 gap-3 mb-6">
        <SummaryCard
          icon={<Film size={14} />}
          value={watchedMovies.length}
          label={plural(watchedMovies.length, 'фильм', 'фильма', 'фильмов')}
        />
        <SummaryCard
          icon={<Tv2 size={14} />}
          value={uniqueSeries}
          label={plural(uniqueSeries, 'сериал', 'сериала', 'сериалов')}
          sub={`${watchedEps.length} эп.`}
        />
        <SummaryCard
          icon={<Repeat2 size={14} />}
          value={rewatches.length}
          label={plural(rewatches.length, 'повтор', 'повтора', 'повторов')}
        />
        <SummaryCard
          icon={<Star size={14} />}
          value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
          label="средняя оценка"
          sub={`${ratings.length} оценок`}
        />
      </section>

      {/* Часы */}
      <section className="px-4 mb-6">
        <div className="bg-bg-elevated border border-border rounded-lg p-4 text-center">
          <div className="text-2xs uppercase tracking-wider text-text-dim mb-1">Всего смотрел</div>
          <div className="font-mono text-3xl text-accent">≈ {formatHours(totalLifetimeMinutes)}</div>
          <div className="text-2xs text-text-dim mt-1">учитывая повторы</div>
        </div>
      </section>

      {/* График по месяцам */}
      <section className="px-4 mb-6">
        <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 flex items-center gap-1.5">
          <Calendar size={12} /> Последние 12 месяцев · {totalThisYear} {plural(totalThisYear, 'единица', 'единицы', 'единиц')}
        </h3>
        <div className="bg-bg-elevated border border-border rounded-lg p-4">
          <div className="flex items-end gap-1.5 h-32">
            {months.map((m) => {
              const h = (m.total / maxMonth) * 100;
              return (
                <div key={m.ym} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="flex-1 w-full flex items-end relative" title={`${m.label}: ${m.total}`}>
                    <div
                      className="w-full bg-accent rounded-t transition-all"
                      style={{ height: `${h}%`, minHeight: m.total > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <div className="text-[9px] text-text-dim leading-none">{m.label.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Распределение оценок */}
      {ratings.length > 0 && (
        <section className="px-4 mb-6">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 flex items-center gap-1.5">
            <Star size={12} /> Распределение оценок
          </h3>
          <div className="bg-bg-elevated border border-border rounded-lg p-4">
            <div className="flex items-end gap-1.5 h-24">
              {ratingBuckets.map((v, i) => {
                const h = (v / maxRating) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="flex-1 w-full flex items-end" title={`${i + 1}: ${v}`}>
                      <div
                        className="w-full bg-accent/80 rounded-t"
                        style={{ height: `${h}%`, minHeight: v > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <div className="text-[9px] text-text-dim leading-none">{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Топ жанров */}
      <section className="px-4 mb-6">
        <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BarChart3 size={12} /> Топ жанров
          </span>
          {detailsLoading && (
            <span className="text-2xs normal-case tracking-normal text-text-dim font-normal">
              загружаю детали ({detailsLoaded}/{detailsTotal})…
            </span>
          )}
        </h3>
        {detailsTotal === 0 ? (
          <p className="text-2xs text-text-dim">Нет просмотренных — сначала отметь что-то.</p>
        ) : genreCounts.length === 0 ? (
          <p className="text-2xs text-text-dim">Жанры подтянутся из TMDB при первой загрузке деталей.</p>
        ) : (
          <div className="bg-bg-elevated border border-border rounded-lg p-3 space-y-2">
            {genreCounts.map((g) => {
              const maxC = Math.max(1, genreCounts[0]!.count);
              const pct = (g.count / maxC) * 100;
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="w-24 text-2xs text-text shrink-0">{g.name}</div>
                  <div className="flex-1 h-3 bg-bg rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-2xs font-mono text-text-muted w-8 text-right">{g.count}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TV прогресс */}
      {tvMeta.length > 0 && (
        <section className="px-4 mb-6">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 flex items-center gap-1.5">
            <Tv2 size={12} /> Прогресс по сериалам
          </h3>
          <div className="bg-bg-elevated border border-border rounded-lg p-3 space-y-2">
            {tvMeta
              .map((m) => {
                const watched = watchedEps.filter((e) => e.tv_id === m.tv_id && e.season_number > 0).length;
                return { ...m, watched };
              })
              .filter((m) => m.watched > 0 && m.total_episodes > 0)
              .sort((a, b) => b.watched / b.total_episodes - a.watched / a.total_episodes)
              .slice(0, 10)
              .map((m) => {
                const pct = Math.min(100, (m.watched / m.total_episodes) * 100);
                return (
                  <div key={m.tv_id} className="flex items-center gap-3">
                    <div className="w-32 text-2xs text-text shrink-0 truncate">{m.title}</div>
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-2xs font-mono text-text-muted w-14 text-right">{m.watched}/{m.total_episodes}</div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  icon, value, label, sub,
}: { icon: React.ReactNode; value: number | string; label: string; sub?: string }) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
      <div className="text-text-dim flex items-center gap-1.5 text-2xs">
        {icon} {label}
      </div>
      <div className="font-mono text-2xl text-accent mt-1">{value}</div>
      {sub && <div className="text-2xs text-text-dim">{sub}</div>}
    </div>
  );
}
