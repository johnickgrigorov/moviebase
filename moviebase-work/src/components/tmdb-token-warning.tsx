import { AlertTriangle } from 'lucide-react';

export function TmdbTokenWarning() {
  if (import.meta.env.VITE_TMDB_TOKEN) return null;
  return (
    <div className="bg-accent-bg/40 border-b border-accent/40 px-4 py-2 text-2xs flex items-start gap-2">
      <AlertTriangle size={14} className="text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
      <div className="text-text-muted">
        <span className="text-text font-medium">TMDB токен не задан.</span> Добавь его в{' '}
        <span className="font-mono text-text">.env.local</span> как{' '}
        <span className="font-mono text-text">VITE_TMDB_TOKEN</span>, иначе данные не загрузятся.
      </div>
    </div>
  );
}
