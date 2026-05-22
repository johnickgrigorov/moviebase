import { MediaCard } from './media-card';
import type { MediaSummary } from '../lib/tmdb';

interface MediaRowProps {
  title: string;
  items: MediaSummary[] | undefined;
  loading?: boolean;
}

export function MediaRow({ title, items, loading }: MediaRowProps) {
  return (
    <section className="mb-7">
      <div className="px-4 mb-3">
        <h2 className="display-title text-2xl">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1 snap-x">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-28 aspect-[2/3] bg-bg-elevated rounded-md animate-pulse" />
          ))}
        {items?.map((m) => (
          <div key={`${m.id}-${m.media_type ?? ''}`} className="shrink-0 w-28 snap-start">
            <MediaCard media={m} />
          </div>
        ))}
      </div>
    </section>
  );
}
