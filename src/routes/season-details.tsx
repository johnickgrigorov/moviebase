import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import { api, imgUrl } from '../lib/tmdb';
import { useWatchedEpisodesInSeason } from '../hooks/use-tracking';
import {
  markEpisodeWatched,
  unmarkEpisodeWatched,
  markSeasonWatched,
  unmarkSeasonWatched,
} from '../lib/mutations';
import { formatDate, formatRuntime, plural } from '../lib/format';
import { BackButton } from '../components/back-button';
import { SeasonSkeleton } from '../components/skeleton';

export function SeasonDetails() {
  const { id, season } = useParams<{ id: string; season: string }>();
  const tvId = Number(id);
  const seasonNum = Number(season);

  const { data, isLoading } = useQuery({
    queryKey: ['season', tvId, seasonNum],
    queryFn: () => api.seasonDetails(tvId, seasonNum),
    enabled: !!tvId && !Number.isNaN(seasonNum),
  });

  const watched = useWatchedEpisodesInSeason(tvId, seasonNum);

  if (isLoading || !data) {
    return <SeasonSkeleton />;
  }

  const total = data.episodes.length;
  const watchedCount = watched.size;
  const allWatched = watchedCount === total && total > 0;

  const toggleAll = async () => {
    if (allWatched) {
      await unmarkSeasonWatched(tvId, seasonNum);
    } else {
      await markSeasonWatched(
        tvId,
        seasonNum,
        data.episodes.map((e) => e.episode_number),
      );
    }
  };

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 mb-4 flex items-center gap-3">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="display-title text-xl leading-tight">{data.name}</h1>
          <div className="text-2xs text-text-dim">
            {watchedCount} / {total} {plural(total, 'эпизод', 'эпизода', 'эпизодов')}
          </div>
        </div>
        <button
          onClick={toggleAll}
          className={clsx(
            'text-2xs px-3 py-2 rounded border',
            allWatched
              ? 'border-success/50 text-success bg-success/10'
              : 'border-border text-text-muted active:border-accent',
          )}
        >
          {allWatched ? 'Сезон просмотрен' : 'Отметить все'}
        </button>
      </div>

      {data.overview && (
        <p className="px-4 text-sm text-text-muted mb-4 leading-relaxed">{data.overview}</p>
      )}

      <div className="px-4 space-y-2">
        {data.episodes.map((ep) => {
          const isWatched = watched.has(ep.episode_number);
          const toggle = () => {
            if (isWatched) {
              void unmarkEpisodeWatched(tvId, seasonNum, ep.episode_number);
            } else {
              void markEpisodeWatched(tvId, seasonNum, ep.episode_number);
            }
          };
          return (
            <div
              key={ep.id}
              className={clsx(
                'p-3 rounded-lg border transition-colors',
                isWatched ? 'bg-success/5 border-success/30' : 'bg-bg-elevated border-border-subtle',
              )}
            >
              <div className="flex gap-3">
                <div className="w-24 shrink-0 aspect-video rounded overflow-hidden bg-bg">
                  {ep.still_path && (
                    <img
                      src={imgUrl(ep.still_path, 'w300')!}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="text-2xs font-mono text-text-dim shrink-0">
                      S{ep.season_number}E{ep.episode_number}
                    </div>
                    <div className="font-medium text-sm leading-tight">{ep.name}</div>
                  </div>
                  <div className="text-2xs text-text-dim mt-1">
                    {ep.air_date && <span>{formatDate(ep.air_date)}</span>}
                    {ep.runtime && <span> • {formatRuntime(ep.runtime)}</span>}
                  </div>
                </div>
                <button
                  onClick={toggle}
                  className={clsx(
                    'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90',
                    isWatched ? 'bg-success text-bg' : 'bg-bg border border-border text-text-dim',
                  )}
                >
                  <Check size={16} strokeWidth={isWatched ? 2.5 : 1.6} />
                </button>
              </div>
              {ep.overview && (
                <p className="text-2xs text-text-muted mt-2 leading-relaxed line-clamp-3">{ep.overview}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
