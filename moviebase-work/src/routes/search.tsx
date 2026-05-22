import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X, Film, User } from 'lucide-react';
import { api, imgUrl, mediaType } from '../lib/tmdb';
import { MediaCard } from '../components/media-card';

type Tab = 'media' | 'people';

export function Search() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('media');

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: query.length >= 2 && tab === 'media',
    placeholderData: (prev) => prev,
  });

  const { data: peopleData, isLoading: peopleLoading } = useQuery({
    queryKey: ['search-people', query],
    queryFn: () => api.searchPeople(query),
    enabled: query.length >= 2 && tab === 'people',
    placeholderData: (prev) => prev,
  });

  const mediaResults = (mediaData?.results ?? []).filter(
    (m) => mediaType(m) === 'movie' || mediaType(m) === 'tv',
  );
  const peopleResults = peopleData?.results ?? [];

  const isLoading = tab === 'media' ? mediaLoading : peopleLoading;

  return (
    <div className="pt-6">
      <header className="px-4 mb-4">
        <h1 className="display-title text-3xl mb-4">Поиск</h1>
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" strokeWidth={1.6} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tab === 'media' ? 'Фильм, сериал…' : 'Имя актёра, режиссёра…'}
            autoFocus
            className="w-full pl-10 pr-10 py-3 bg-bg-elevated border border-border rounded-lg text-base focus:outline-none focus:border-accent placeholder:text-text-dim"
          />
          {input && (
            <button
              onClick={() => setInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim active:text-text"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <TabButton active={tab === 'media'} onClick={() => setTab('media')} icon={<Film size={13} />} label="Фильмы и сериалы" />
          <TabButton active={tab === 'people'} onClick={() => setTab('people')} icon={<User size={13} />} label="Персоны" />
        </div>
      </header>

      <div className="px-4">
        {query.length < 2 && (
          <div className="py-20 text-center text-text-dim text-sm">Введи минимум 2 символа для поиска</div>
        )}

        {query.length >= 2 && isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bg-elevated rounded-md animate-pulse" />
            ))}
          </div>
        )}

        {/* Media results */}
        {tab === 'media' && query.length >= 2 && !mediaLoading && mediaResults.length === 0 && (
          <div className="py-20 text-center text-text-dim text-sm">Ничего не найдено</div>
        )}
        {tab === 'media' && mediaResults.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {mediaResults.map((m) => (
              <MediaCard key={`${mediaType(m)}-${m.id}`} media={m} />
            ))}
          </div>
        )}

        {/* People results */}
        {tab === 'people' && query.length >= 2 && !peopleLoading && peopleResults.length === 0 && (
          <div className="py-20 text-center text-text-dim text-sm">Ничего не найдено</div>
        )}
        {tab === 'people' && peopleResults.length > 0 && (
          <div className="space-y-2">
            {peopleResults.map((p) => (
              <Link
                key={p.id}
                to={`/person/${p.id}`}
                className="flex gap-3 p-2.5 bg-bg-elevated border border-border-subtle rounded-lg active:border-accent"
              >
                <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-bg">
                  {p.profile_path ? (
                    <img
                      src={imgUrl(p.profile_path, 'w185')!}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-dim text-lg">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-2xs text-text-muted mt-0.5">{p.known_for_department}</div>
                  {p.known_for.length > 0 && (
                    <div className="text-2xs text-text-dim mt-0.5 truncate">
                      {p.known_for
                        .slice(0, 3)
                        .map((m) => (m as { title?: string; name?: string }).title ?? (m as { title?: string; name?: string }).name)
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-accent text-bg'
          : 'bg-bg-elevated border border-border text-text-muted active:border-accent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
