import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronRight, ListPlus, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import { db } from '../lib/db';
import { createList } from '../lib/mutations';
import { Poster } from '../components/poster';
import { formatRelativeTime, plural } from '../lib/format';

type Tab = 'watchlist' | 'watched' | 'custom';
type MediaFilter = 'all' | 'movie' | 'tv';

export function Lists() {
  const [tab, setTab] = useState<Tab>('watchlist');

  return (
    <div className="pt-6">
      <header className="px-4 mb-5">
        <h1 className="display-title text-3xl">Списки</h1>
      </header>

      <div className="px-4 mb-5 flex gap-2 overflow-x-auto no-scrollbar">
        <TabButton active={tab === 'watchlist'} onClick={() => setTab('watchlist')}>Хочу посмотреть</TabButton>
        <TabButton active={tab === 'watched'} onClick={() => setTab('watched')}>Просмотрено</TabButton>
        <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>Свои</TabButton>
      </div>

      <div className="px-4">
        {tab === 'watchlist' && <WatchlistTab />}
        {tab === 'watched' && <WatchedTab />}
        {tab === 'custom' && <CustomTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
        active ? 'bg-accent text-bg' : 'bg-bg-elevated text-text-muted border border-border',
      )}
    >
      {children}
    </button>
  );
}

function MediaFilterBar({ value, onChange, counts }: {
  value: MediaFilter;
  onChange: (v: MediaFilter) => void;
  counts: { all: number; movie: number; tv: number };
}) {
  return (
    <div className="flex gap-2 mb-4">
      {(['all', 'movie', 'tv'] as MediaFilter[]).map((f) => {
        const labels: Record<MediaFilter, string> = { all: 'Все', movie: 'Фильмы', tv: 'Сериалы' };
        const count = counts[f];
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              value === f
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-bg-elevated text-text-muted border border-border',
            )}
          >
            {labels[f]}
            <span className={clsx(
              'text-2xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
              value === f ? 'bg-accent/30' : 'bg-bg text-text-dim',
            )}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function WatchlistTab() {
  const [filter, setFilter] = useState<MediaFilter>('all');
  const all = useLiveQuery(() => db.watchlist.orderBy('added_at').reverse().toArray()) ?? [];

  const movies = all.filter((it) => it.media_type === 'movie');
  const tv = all.filter((it) => it.media_type === 'tv');
  const items = filter === 'all' ? all : filter === 'movie' ? movies : tv;

  if (all.length === 0) {
    return <EmptyState message="Ничего не отложено" hint="Открой карточку и нажми «В список»" />;
  }

  return (
    <div>
      <MediaFilterBar
        value={filter}
        onChange={setFilter}
        counts={{ all: all.length, movie: movies.length, tv: tv.length }}
      />
      {items.length === 0 ? (
        <EmptyState message={filter === 'movie' ? 'Нет отложенных фильмов' : 'Нет отложенных сериалов'} />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((it) => (
            <Link key={it.key} to={`/${it.media_type}/${it.tmdb_id}`} className="block">
              <Poster path={it.poster_path} alt={it.title} size="w300" />
              <div className="text-sm font-medium mt-2 leading-tight line-clamp-2">{it.title}</div>
              <div className="text-2xs text-text-dim mt-0.5">{it.release_year || '—'}</div>
              {it.notes && (
                <div className="flex items-start gap-1 mt-1">
                  <StickyNote size={10} className="text-accent mt-0.5 shrink-0" />
                  <p className="text-2xs text-text-muted leading-tight line-clamp-2">{it.notes}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function WatchedTab() {
  const [filter, setFilter] = useState<MediaFilter>('all');
  const movies = useLiveQuery(() => db.watchedMovies.orderBy('watched_at').reverse().toArray()) ?? [];
  const episodesCount = useLiveQuery(() => db.watchedEpisodes.count()) ?? 0;
  const seriesCount =
    useLiveQuery(async () => {
      const list = await db.watchedEpisodes.toArray();
      return new Set(list.map((e) => e.tv_id)).size;
    }) ?? 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat value={movies.length} label={plural(movies.length, 'фильм', 'фильма', 'фильмов')} />
        <Stat
          value={episodesCount}
          label={`в ${seriesCount} ${plural(seriesCount, 'сериале', 'сериалах', 'сериалах')}`}
          sub={plural(episodesCount, 'эпизод', 'эпизода', 'эпизодов')}
        />
      </div>

      <MediaFilterBar
        value={filter}
        onChange={setFilter}
        counts={{ all: movies.length + seriesCount, movie: movies.length, tv: seriesCount }}
      />

      {(filter === 'all' || filter === 'movie') && (
        <div className="mb-6">
          {filter === 'all' && (
            <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3">Фильмы</h3>
          )}
          {movies.length === 0 ? (
            <EmptyState message="Список пуст" hint="Отметь фильм как просмотренный на его странице" />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {movies.map((m) => (
                <Link key={m.tmdb_id} to={`/movie/${m.tmdb_id}`}>
                  <Poster path={m.poster_path} alt={m.title} size="w300" />
                  <div className="text-sm font-medium mt-2 leading-tight line-clamp-2">{m.title}</div>
                  <div className="text-2xs text-text-dim mt-0.5">{formatRelativeTime(m.watched_at)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {(filter === 'all' || filter === 'tv') && (
        <div>
          {filter === 'all' && (
            <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3">Сериалы</h3>
          )}
          {seriesCount === 0 ? (
            <EmptyState message="Нет просмотренных сериалов" hint="Отмечай эпизоды на странице сериала" />
          ) : (
            <WatchedSeriesGrid />
          )}
        </div>
      )}
    </div>
  );
}

function WatchedSeriesGrid() {
  const seriesList = useLiveQuery(async () => {
    const episodes = await db.watchedEpisodes.toArray();
    const byId = new Map<number, { tv_id: number; poster_path: string | null; title: string; count: number; last_at: number }>();
    for (const ep of episodes) {
      const existing = byId.get(ep.tv_id);
      if (existing) {
        existing.count++;
        if (ep.watched_at > existing.last_at) existing.last_at = ep.watched_at;
      } else {
        byId.set(ep.tv_id, { tv_id: ep.tv_id, poster_path: ep.poster_path ?? null, title: ep.title ?? '', count: 1, last_at: ep.watched_at });
      }
    }
    return [...byId.values()].sort((a, b) => b.last_at - a.last_at);
  }) ?? [];

  if (seriesList.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {seriesList.map((s) => (
        <Link key={s.tv_id} to={`/tv/${s.tv_id}`}>
          <Poster path={s.poster_path} alt={s.title} size="w300" />
          <div className="text-sm font-medium mt-2 leading-tight line-clamp-2">{s.title}</div>
          <div className="text-2xs text-text-dim mt-0.5">{s.count} эп.</div>
        </Link>
      ))}
    </div>
  );
}

function CustomTab() {
  const lists = useLiveQuery(() => db.lists.orderBy('updated_at').reverse().toArray()) ?? [];
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createList(name.trim());
    setName('');
    setCreating(false);
  };

  return (
    <div>
      <button
        onClick={() => setCreating(true)}
        className="w-full mb-4 p-3 border border-dashed border-border rounded-lg text-text-muted flex items-center justify-center gap-2 active:border-accent active:text-accent"
      >
        <Plus size={16} /> Создать список
      </button>

      {creating && (
        <div className="mb-4 p-3 bg-bg-elevated rounded-lg border border-accent/50">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название списка"
            autoFocus
            className="w-full bg-transparent border-b border-border focus:border-accent focus:outline-none py-2 mb-2"
          />
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 py-2 text-text-muted text-sm">
              Отмена
            </button>
            <button onClick={handleCreate} className="flex-1 py-2 bg-accent text-bg rounded text-sm font-medium">
              Создать
            </button>
          </div>
        </div>
      )}

      {lists.length === 0 && !creating && (
        <EmptyState
          message="Списков пока нет"
          hint="Сделай тематические подборки: «Посмотреть с Машей», «Лучшее Кубрика»"
          icon={<ListPlus size={28} strokeWidth={1.4} />}
        />
      )}

      {lists.map((l) => (
        <Link key={l.id} to={`/list/${l.id}`} className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg mb-2 active:bg-bg-hover">
          <div className="flex-1">
            <div className="font-medium">{l.name}</div>
            {l.description && <div className="text-2xs text-text-dim mt-0.5 line-clamp-1">{l.description}</div>}
          </div>
          <ChevronRight size={16} className="text-text-dim" />
        </Link>
      ))}
    </div>
  );
}

function Stat({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4">
      <div className="font-mono text-3xl text-accent">{value}</div>
      <div className="text-2xs text-text-muted uppercase tracking-wider mt-1">{label}</div>
      {sub && <div className="text-2xs text-text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function EmptyState({ message, hint, icon }: { message: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      {icon && <div className="text-text-dim flex justify-center mb-3">{icon}</div>}
      <div className="text-text-muted text-sm">{message}</div>
      {hint && <div className="text-2xs text-text-dim mt-1">{hint}</div>}
    </div>
  );
}
