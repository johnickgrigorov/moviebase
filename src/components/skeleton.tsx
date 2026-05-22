import clsx from 'clsx';

/** Базовый блок-скелетон с pulse-анимацией. Использует bg-bg-elevated. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('bg-bg-elevated animate-pulse rounded', className)} />;
}

/** Скелетон страницы фильма/сериала: backdrop + постер + текстовые блоки. */
export function MediaDetailsSkeleton() {
  return (
    <div>
      <div className="relative h-72 overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
      <div className="relative -mt-24 px-4">
        <div className="flex gap-4">
          <Skeleton className="w-28 aspect-[2/3] shrink-0" />
          <div className="pt-16 flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="px-4 mt-6 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <div className="px-4 mt-7 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

/** Скелетон страницы сезона: список эпизодов. */
export function SeasonSkeleton() {
  return (
    <div className="pt-4 pb-8 px-4 space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-7 w-24" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-border-subtle bg-bg-elevated/40">
          <div className="flex gap-3">
            <Skeleton className="w-24 aspect-video shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Скелетон карточки персоны. */
export function PersonSkeleton() {
  return (
    <div className="pt-4 px-4 pb-8">
      <Skeleton className="w-10 h-10 rounded-full mb-4" />
      <div className="flex gap-4">
        <Skeleton className="w-28 aspect-[2/3] shrink-0 rounded-xl" />
        <div className="flex-1 pt-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="mt-7 grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3]" />
        ))}
      </div>
    </div>
  );
}
