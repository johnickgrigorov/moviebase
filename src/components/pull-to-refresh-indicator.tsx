import { RefreshCw } from 'lucide-react';

interface Props {
  pulling: boolean;
  distance: number;
  refreshing: boolean;
}

export function PullToRefreshIndicator({ pulling, distance, refreshing }: Props) {
  if (!pulling && !refreshing) return null;
  const progress = Math.min(1, distance / 70);
  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
      style={{
        transform: `translate(-50%, ${refreshing ? 18 : Math.min(distance, 90) - 24}px)`,
        opacity: refreshing ? 1 : progress,
        transition: pulling ? 'none' : 'transform 200ms, opacity 200ms',
      }}
    >
      <div className="w-9 h-9 rounded-full bg-bg-elevated border border-accent/40 flex items-center justify-center shadow-lg">
        <RefreshCw
          size={16}
          className={refreshing ? 'animate-spin text-accent' : 'text-accent'}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}
