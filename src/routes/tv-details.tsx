import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { Star, ChevronRight, Tv2 } from 'lucide-react';
import { api, imgUrl } from '../lib/tmdb';
import { db } from '../lib/db';
import { saveTvMeta } from '../lib/mutations';
import { formatDate, formatVote, plural } from '../lib/format';
import { Poster } from '../components/poster';
import { ActionBar } from '../components/action-bar';
import { BackButton } from '../components/back-button';
import { MediaRow } from '../components/media-row';

export function TvDetails() {
  const { id } = useParams<{ id: string }>();
  const tvId = Number(id);
  const { data, isLoading } = useQuery({
    queryKey: ['tv', tvId],
    queryFn: async () => {
      const d = await api.tvDetails(tvId);
      // Сохраняем мету сразу после успешной загрузки, а не в useEffect
      // (избегаем лишних запусков на каждый ref-change data)
      void saveTvMeta({
        tv_id: d.id,
        title: d.name,
        poster_path: d.poster_path,
        release_year: d.first_air_date?.slice(0, 4) ?? '',
        total_episodes: d.number_of_episodes,
      });
      return d;
    },
    enabled: !!tvId,
  });

  const watchedEps =
    useLiveQuery(() => db.watchedEpisodes.where('tv_id').equals(tvId).toArray(), [tvId]) ?? [];

  if (isLoading || !data) {
    return (
      <div className="pt-6 px-4">
        <BackButton />
        <div className="mt-8 text-center text-text-dim">Загрузка…</div>
      </div>
    );
  }

  const backdrop = imgUrl(data.backdrop_path, 'w500');
  const year = data.first_air_date?.slice(0, 4) ?? '';
  const totalAired = data.seasons.filter((s) => s.season_number > 0).reduce((sum, s) => sum + s.episode_count, 0);
  // Исключаем specials (season 0) чтобы watchedCount не превышал totalAired
  const watchedCount = watchedEps.filter((e) => e.season_number > 0).length;
  const progressPct = totalAired > 0 ? Math.min(100, Math.round((watchedCount / totalAired) * 100)) : 0;

  return (
    <div>
      <div className="relative h-72 overflow-hidden">
        {backdrop && <img src={backdrop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/20" />
        <BackButton className="absolute top-4 left-4 z-10" />
      </div>

      <div className="relative -mt-24 px-4">
        <div className="flex gap-4">
          <div className="w-28 shrink-0">
            <Poster path={data.poster_path} alt={data.name} size="w300" className="shadow-2xl" />
          </div>
          <div className="pt-16 flex-1 min-w-0">
            <h1 className="display-title text-2xl leading-tight">{data.name}</h1>
            {data.original_name !== data.name && (
              <div className="text-2xs text-text-dim mt-1 italic">{data.original_name}</div>
            )}
            <div className="flex items-center gap-3 text-2xs text-text-muted mt-2">
              {year && <span>{year}</span>}
              <span className="flex items-center gap-1">
                <Tv2 size={11} /> {data.number_of_seasons} {plural(data.number_of_seasons, 'сезон', 'сезона', 'сезонов')}
              </span>
              {data.vote_average > 0 && (
                <span className="flex items-center gap-1 text-accent">
                  <Star size={11} fill="currentColor" strokeWidth={0} />
                  {formatVote(data.vote_average)}
                </span>
              )}
            </div>
          </div>
        </div>

        {data.tagline && <p className="mt-4 italic text-text-muted text-sm">«{data.tagline}»</p>}

        {data.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {data.genres.map((g) => (
              <span key={g.id} className="text-2xs px-2 py-1 bg-bg-elevated border border-border-subtle rounded-full text-text-muted">
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <ActionBar
          media_type="tv"
          tmdb_id={data.id}
          title={data.name}
          poster_path={data.poster_path}
          release_year={year}
        />
      </div>

      {totalAired > 0 && (
        <section className="mt-6 px-4">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-2xs uppercase tracking-wider text-text-dim">Прогресс</h3>
            <span className="text-2xs font-mono text-text-muted">
              {watchedCount} / {totalAired}
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </section>
      )}

      {data.next_episode_to_air && (
        <section className="mt-5 mx-4 p-3 bg-accent-bg/30 border border-accent/30 rounded-lg">
          <div className="text-2xs uppercase tracking-wider text-accent mb-1">Следующий эпизод</div>
          <div className="text-sm font-medium">
            S{data.next_episode_to_air.season_number}E{data.next_episode_to_air.episode_number} — {data.next_episode_to_air.name}
          </div>
          {data.next_episode_to_air.air_date && (
            <div className="text-2xs text-text-muted mt-0.5">{formatDate(data.next_episode_to_air.air_date)}</div>
          )}
        </section>
      )}

      {data.overview && (
        <section className="mt-6 px-4">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-2">Описание</h3>
          <p className="text-sm text-text leading-relaxed">{data.overview}</p>
        </section>
      )}

      <section className="mt-7 px-4">
        <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3">Сезоны</h3>
        <div className="space-y-2">
          {data.seasons.map((s) => {
            const watchedInSeason = watchedEps.filter((e) => e.season_number === s.season_number).length;
            const total = s.episode_count;
            const pct = total > 0 ? Math.round((watchedInSeason / total) * 100) : 0;
            return (
              <Link
                key={s.id}
                to={`/tv/${data.id}/season/${s.season_number}`}
                className="flex gap-3 p-2 bg-bg-elevated border border-border-subtle rounded-lg active:border-accent"
              >
                <div className="w-14 shrink-0">
                  <Poster path={s.poster_path} alt={s.name} size="w154" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-2xs text-text-dim mt-0.5">
                    {total} {plural(total, 'эпизод', 'эпизода', 'эпизодов')}
                    {s.air_date && <span> • {s.air_date.slice(0, 4)}</span>}
                  </div>
                  {total > 0 && (
                    <div className="mt-1.5 h-1 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-text-dim self-center" />
              </Link>
            );
          })}
        </div>
      </section>

      {data.credits.cast.length > 0 && (
        <section className="mt-7">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 px-4">В ролях</h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4">
            {data.credits.cast.slice(0, 15).map((p) => (
              <Link key={p.id} to={`/person/${p.id}`} className="shrink-0 w-20 active:opacity-70">
                <div className="aspect-square overflow-hidden rounded-full bg-bg-elevated">
                  {p.profile_path && (
                    <img src={imgUrl(p.profile_path, 'w185')!} alt={p.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="text-2xs font-medium mt-1.5 leading-tight line-clamp-2">{p.name}</div>
                {p.character && <div className="text-2xs text-text-dim mt-0.5 leading-tight line-clamp-2">{p.character}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.recommendations.results.length > 0 && (
        <div className="mt-7">
          <MediaRow
            title="Похожие"
            items={data.recommendations.results.slice(0, 20).map((m) => ({ ...m, media_type: 'tv' as const }))}
          />
        </div>
      )}

      <div className="pb-8" />
    </div>
  );
}
