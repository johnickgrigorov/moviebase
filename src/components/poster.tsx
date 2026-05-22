import { useState } from 'react';
import clsx from 'clsx';
import { Film } from 'lucide-react';
import { imgUrl } from '../lib/tmdb';

interface PosterProps {
  path: string | null | undefined;
  alt: string;
  size?: 'w92' | 'w154' | 'w185' | 'w200' | 'w300' | 'w500';
  className?: string;
  aspect?: 'poster' | 'backdrop' | 'still';
}

export function Poster({ path, alt, size = 'w300', className, aspect = 'poster' }: PosterProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const url = imgUrl(path, size);

  const aspectClass = aspect === 'backdrop' ? 'aspect-video' : aspect === 'still' ? 'aspect-video' : 'aspect-[2/3]';

  if (!url || errored) {
    return (
      <div className={clsx('bg-bg-elevated flex items-center justify-center text-text-dim rounded-md', aspectClass, className)}>
        <Film size={28} strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <div className={clsx('relative overflow-hidden bg-bg-elevated rounded-md', aspectClass, className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-bg-hover" />}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={clsx(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
