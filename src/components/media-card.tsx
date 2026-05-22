import { Link } from 'react-router-dom';
import { Star, Check, Bookmark } from 'lucide-react';
import clsx from 'clsx';
import { Poster } from './poster';
import { title, year, mediaType, type MediaSummary } from '../lib/tmdb';
import { useIsInWatchlist, useIsMovieWatched, useMediaRating } from '../hooks/use-tracking';
import { formatVote } from '../lib/format';

interface MediaCardProps {
  media: MediaSummary;
  className?: string;
}

export function MediaCard({ media, className }: MediaCardProps) {
  const type = mediaType(media);
  const inWatchlist = useIsInWatchlist(type, media.id);
  const watched = useIsMovieWatched(type === 'movie' ? media.id : undefined);
  const rating = useMediaRating(type, media.id);

  return (
    <Link to={`/${type}/${media.id}`} className={clsx('block group w-full', className)}>
      <div className="relative">
        <Poster path={media.poster_path} alt={title(media)} size="w300" />
        {rating !== undefined && (
          <div className="absolute top-1.5 left-1.5 bg-bg/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-2xs font-mono flex items-center gap-0.5 text-accent">
            <Star size={9} fill="currentColor" strokeWidth={0} />
            {rating}
          </div>
        )}
        {(inWatchlist || watched) && (
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
            {watched && (
              <div className="bg-success/90 text-bg w-5 h-5 rounded-full flex items-center justify-center">
                <Check size={12} strokeWidth={2.5} />
              </div>
            )}
            {inWatchlist && !watched && (
              <div className="bg-accent/90 text-bg w-5 h-5 rounded-full flex items-center justify-center">
                <Bookmark size={11} fill="currentColor" strokeWidth={2.5} />
              </div>
            )}
          </div>
        )}
        {media.vote_average > 0 && rating === undefined && (
          <div className="absolute bottom-1.5 left-1.5 bg-bg/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-2xs font-mono text-text-muted">
            {formatVote(media.vote_average)}
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <div className="text-sm font-medium leading-tight line-clamp-2 group-active:text-accent transition-colors">
          {title(media)}
        </div>
        <div className="text-2xs text-text-dim mt-0.5 flex items-center gap-1.5">
          <span>{year(media) || '—'}</span>
          {type === 'tv' && <span className="text-accent/80">сериал</span>}
        </div>
      </div>
    </Link>
  );
}
