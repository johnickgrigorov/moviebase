import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, ListPlus } from 'lucide-react';
import { Poster } from '../components/poster';
import { BackButton } from '../components/back-button';
import { decodeSharedList, type SharedListPayload } from '../lib/list-share';
import { createList, addToList } from '../lib/mutations';

export function ListImport() {
  const nav = useNavigate();
  const [payload, setPayload] = useState<SharedListPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [renamed, setRenamed] = useState('');

  useEffect(() => {
    // HashRouter держит query внутри hash: #/list/import?data=...
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) { setError('Ссылка некорректна — нет данных'); return; }
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const token = params.get('data');
    if (!token) { setError('Ссылка некорректна — нет данных'); return; }
    const decoded = decodeSharedList(token);
    if (!decoded) { setError('Не удалось распаковать список — возможно ссылка повреждена'); return; }
    setPayload(decoded);
    setRenamed(decoded.name);
  }, []);

  const handleImport = async () => {
    if (!payload) return;
    setImporting(true);
    try {
      const list = await createList(renamed.trim() || payload.name, payload.description);
      for (const it of payload.items) {
        await addToList(
          list.id,
          {
            media_type: it.media_type,
            tmdb_id: it.tmdb_id,
            title: it.title,
            poster_path: it.poster,
            release_year: it.year,
          },
          it.note ?? '',
        );
      }
      nav(`/list/${list.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setImporting(false);
    }
  };

  if (error) {
    return (
      <div className="pt-6 px-4">
        <BackButton />
        <div className="mt-8 p-4 rounded-lg border border-danger/30 bg-danger/5 text-sm text-danger flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="pt-6 px-4">
        <BackButton />
        <div className="mt-8 text-center text-text-dim">Расшифровываю…</div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-24 px-4">
      <div className="flex items-center gap-3 mb-5">
        <BackButton />
        <div className="flex items-center gap-2">
          <ListPlus size={20} className="text-accent" />
          <h1 className="display-title text-2xl">Импорт подборки</h1>
        </div>
      </div>

      <section className="bg-bg-elevated border border-border rounded-lg p-4 mb-5">
        <label className="text-2xs uppercase tracking-wider text-text-dim block mb-2">Название</label>
        <input
          value={renamed}
          onChange={(e) => setRenamed(e.target.value)}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        {payload.description && (
          <p className="text-2xs text-text-dim mt-3 leading-snug">{payload.description}</p>
        )}
        <p className="text-2xs text-text-muted mt-3">
          {payload.items.length} {payload.items.length === 1 ? 'элемент' : 'элементов'}
        </p>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {payload.items.slice(0, 30).map((it, i) => (
            <div key={`${it.media_type}-${it.tmdb_id}-${i}`} className="block">
              <Poster path={it.poster} alt={it.title} size="w300" />
              <div className="text-sm font-medium mt-2 leading-tight line-clamp-2">{it.title}</div>
              <div className="text-2xs text-text-dim mt-0.5">{it.year || '—'}</div>
            </div>
          ))}
        </div>
        {payload.items.length > 30 && (
          <div className="text-2xs text-text-dim text-center mt-3">
            и ещё {payload.items.length - 30}
          </div>
        )}
      </section>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app p-4 bg-bg/95 backdrop-blur-md border-t border-border">
        <button
          onClick={handleImport}
          disabled={importing || !renamed.trim()}
          className="w-full py-3 rounded-lg bg-accent text-bg font-medium disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
        >
          <Check size={16} /> {importing ? 'Создаю…' : 'Импортировать как новую подборку'}
        </button>
      </div>
    </div>
  );
}
