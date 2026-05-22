import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { api, imgUrl } from '../lib/tmdb';
import { formatRuntime, formatDate, formatVote } from '../lib/format';
import { Poster } from '../components/poster';
import { ActionBar } from '../components/action-bar';
import { markMovieWatched } from '../lib/mutations';
import { BackButton } from '../components/back-button';
import { DatePickerModal } from '../components/date-picker-modal';
import { MediaRow } from '../components/media-row';

export function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const tmdbId = Number(id);
  const { data, isLoading } = useQuery({
    queryKey: ['movie', tmdbId],
    queryFn: () => api.movieDetails(tmdbId),
    enabled: !!tmdbId,
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="pt-6 px-4">
        <BackButton />
        <div className="mt-8 text-center text-text-dim">Загрузка…</div>
      </div>
    );
  }

  const backdrop = imgUrl(data.backdrop_path, 'w500');
  const year = data.release_date?.slice(0, 4) ?? '';
  const ruProviders = data['watch/providers'].results['RU'];

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
            <Poster path={data.poster_path} alt={data.title} size="w300" className="shadow-2xl" />
          </div>
          <div className="pt-16 flex-1 min-w-0">
            <h1 className="display-title text-2xl leading-tight">{data.title}</h1>
            {data.original_title !== data.title && (
              <div className="text-2xs text-text-dim mt-1 italic">{data.original_title}</div>
            )}
            <div className="flex items-center gap-3 text-2xs text-text-muted mt-2">
              {year && <span>{year}</span>}
              {data.runtime && <span>{formatRuntime(data.runtime)}</span>}
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
          media_type="movie"
          tmdb_id={data.id}
          title={data.title}
          poster_path={data.poster_path}
          release_year={year}
          onWatchedClick={() => setDatePickerOpen(true)}
        />

      {datePickerOpen && (
        <DatePickerModal
          title="Дата просмотра"
          onConfirm={async (ts: number) => {
            await markMovieWatched(
              { tmdb_id: data.id, title: data.title, poster_path: data.poster_path, release_year: year },
              ts,
            );
            setDatePickerOpen(false);
          }}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
      </div>

      {data.overview && (
        <section className="mt-6 px-4">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-2">Описание</h3>
          <p className="text-sm text-text leading-relaxed">{data.overview}</p>
        </section>
      )}

      {ruProviders?.flatrate && ruProviders.flatrate.length > 0 && (
        <section className="mt-6 px-4">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3">Где посмотреть</h3>
          <div className="flex gap-2 flex-wrap">
            {ruProviders.flatrate.map((p) => (
              <div key={p.provider_id} className="flex items-center gap-2 px-2 py-1.5 bg-bg-elevated border border-border-subtle rounded-lg">
                <img src={imgUrl(p.logo_path, 'w92')!} alt="" className="w-6 h-6 rounded" />
                <span className="text-2xs">{p.provider_name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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
            items={data.recommendations.results.slice(0, 20).map((m) => ({ ...m, media_type: 'movie' as const }))}
          />
        </div>
      )}

      <section className="mt-7 px-4 pb-8 text-2xs text-text-dim space-y-1">
        {data.release_date && (
          <div>
            <span className="text-text-muted">Релиз:</span> {formatDate(data.release_date)}
          </div>
        )}
        {data.status && (
          <div>
            <span className="text-text-muted">Статус:</span> {data.status}
          </div>
        )}
        {data.production_countries.length > 0 && (
          <div>
            <span className="text-text-muted">Страны:</span> {data.production_countries.map((c) => c.name).join(', ')}
          </div>
        )}
      </section>
    </div>
  );
}
