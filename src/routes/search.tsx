import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X } from 'lucide-react';
import { api, mediaType } from '../lib/tmdb';
import { MediaCard } from '../components/media-card';

export function Search() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: query.length >= 2,
    placeholderData: (prev) => prev,
  });

  const results = (data?.results ?? []).filter((m) => mediaType(m) === 'movie' || mediaType(m) === 'tv');

  return (
    <div className="pt-6">
      <header className="px-4 mb-5">
        <h1 className="display-title text-3xl mb-4">Поиск</h1>
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" strokeWidth={1.6} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Фильм, сериал..."
            autoFocus
            className="w-full pl-10 pr-10 py-3 bg-bg-elevated border border-border rounded-lg text-base focus:outline-none focus:border-accent placeholder:text-text-dim"
          />
          {input && (
            <button onClick={() => setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim active:text-text">
              <X size={18} />
            </button>
          )}
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

        {query.length >= 2 && !isLoading && results.length === 0 && (
          <div className="py-20 text-center text-text-dim text-sm">Ничего не найдено</div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {results.map((m) => (
              <MediaCard key={`${mediaType(m)}-${m.id}`} media={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
