import { useEffect, useState } from 'react';
import { X, Upload, AlertCircle, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import {
  parseImportPreview,
  resolveTmdbIds,
  applyImport,
  type ImportPreview,
  type ImportPreviewItem,
  type ImportFormat,
} from '../lib/csv';
import { useModalA11y } from '../hooks/use-modal-a11y';

interface Props {
  file: File;
  onClose: () => void;
  onDone: (msg: string) => void;
}

const FORMAT_LABELS: Record<ImportFormat, string> = {
  'moviebase-all': 'Moviebase — всё',
  'moviebase-watched': 'Moviebase — просмотренное',
  'moviebase-lists': 'Moviebase — списки',
  letterboxd: 'Letterboxd',
  'imdb-ratings': 'IMDb',
  trakt: 'Trakt.tv',
  unknown: 'Неизвестный формат',
};

export function CsvImportModal({ file, onClose, onDone }: Props) {
  const modalRef = useModalA11y(onClose);
  const [stage, setStage] = useState<'parsing' | 'preview' | 'resolving' | 'applying'>('parsing');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await file.text();
        const p = await parseImportPreview(text);
        if (cancelled) return;
        setPreview(p);
        setStage('preview');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStage('preview');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const needsResolve = preview?.items.some((it) => it.match === 'pending');

  const handleResolve = async () => {
    if (!preview) return;
    setStage('resolving');
    setProgress({ done: 0, total: preview.items.filter((i) => i.match === 'pending').length });
    const updated = await resolveTmdbIds(preview.items, (d, t) => setProgress({ done: d, total: t }));
    setPreview({ ...preview, items: [...updated] });
    setStage('preview');
  };

  const handleApply = async () => {
    if (!preview) return;
    setStage('applying');
    try {
      const res = await applyImport(preview.items);
      onDone(`Импорт: добавлено ${res.applied}, пропущено ${res.skipped}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('preview');
    }
  };

  const stats = preview
    ? {
        total: preview.items.length,
        matched: preview.items.filter((it) => it.match === 'id' || it.match === 'search').length,
        pending: preview.items.filter((it) => it.match === 'pending').length,
        notFound: preview.items.filter((it) => it.match === 'not-found').length,
      }
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Импорт CSV"
      ref={modalRef}
      className="fixed inset-0 z-[200] bg-bg/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-app bg-bg-elevated border-t border-border sm:border sm:rounded-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-accent" />
            <h3 className="display-title text-2xl">Импорт CSV</h3>
          </div>
          <button onClick={onClose} className="text-text-muted active:text-text p-1" aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {stage === 'parsing' && (
            <div className="py-10 flex flex-col items-center gap-3 text-text-muted text-sm">
              <Loader2 size={28} className="animate-spin text-accent" />
              Разбираю файл…
            </div>
          )}

          {(stage === 'resolving' || stage === 'applying') && (
            <div className="py-10 flex flex-col items-center gap-3 text-text-muted text-sm">
              <Loader2 size={28} className="animate-spin text-accent" />
              {stage === 'resolving'
                ? `Ищу совпадения в TMDB: ${progress.done}/${progress.total}`
                : 'Применяю изменения…'}
            </div>
          )}

          {stage === 'preview' && preview && stats && (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-danger/30 bg-danger/5 text-2xs text-danger flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="mb-4 text-2xs text-text-muted">
                Формат: <span className="text-text font-medium">{FORMAT_LABELS[preview.format]}</span> · файл {file.name}
              </div>

              {preview.warnings.length > 0 && (
                <div className="mb-4 p-3 rounded-lg border border-accent/30 bg-accent/5 text-2xs text-text-muted">
                  {preview.warnings.map((w, i) => (<div key={i}>{w}</div>))}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 mb-5">
                <Stat label="всего" value={stats.total} />
                <Stat label="готово" value={stats.matched} color="text-success" />
                <Stat label="нужен поиск" value={stats.pending} color="text-accent" />
                <Stat label="не найдено" value={stats.notFound} color="text-danger" />
              </div>

              {needsResolve && (
                <button
                  onClick={handleResolve}
                  className="w-full mb-4 py-3 rounded-lg bg-accent/10 border border-accent/50 text-accent text-sm font-medium active:scale-[0.99]"
                >
                  Найти в TMDB ({stats.pending} элементов)
                </button>
              )}

              <div className="space-y-1">
                {preview.items.slice(0, 50).map((it, i) => (
                  <PreviewRow key={i} item={it} />
                ))}
                {preview.items.length > 50 && (
                  <div className="text-2xs text-text-dim text-center py-2">
                    …и ещё {preview.items.length - 50}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {stage === 'preview' && preview && stats && (
          <div className="p-5 border-t border-border-subtle flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-border text-text-muted text-sm active:border-accent">
              Отмена
            </button>
            <button
              onClick={handleApply}
              disabled={stats.matched === 0}
              className="flex-[2] py-3 rounded-lg bg-accent text-bg font-medium disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={16} /> Импортировать {stats.matched > 0 ? stats.matched : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-bg border border-border-subtle rounded-lg p-2 text-center">
      <div className={clsx('font-mono text-lg', color ?? 'text-text')}>{value}</div>
      <div className="text-2xs text-text-dim mt-0.5">{label}</div>
    </div>
  );
}

function PreviewRow({ item }: { item: ImportPreviewItem }) {
  const badge =
    item.match === 'id'
      ? { text: 'ID', cls: 'bg-success/15 text-success border-success/30' }
      : item.match === 'search'
      ? { text: 'поиск', cls: 'bg-accent/15 text-accent border-accent/30' }
      : item.match === 'not-found'
      ? { text: 'нет', cls: 'bg-danger/15 text-danger border-danger/30' }
      : { text: '?', cls: 'bg-bg border-border text-text-dim' };
  const statusLabel = {
    watched: 'просмотрено',
    watchlist: 'хочу',
    list: 'подборка',
    rating: 'оценка',
    skip: 'пропустить',
  }[item.status];
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border-subtle text-2xs">
      <span className={clsx('px-1.5 py-0.5 rounded border font-mono shrink-0', badge.cls)}>{badge.text}</span>
      <span className="text-text-dim shrink-0">{item.media_type}</span>
      <div className="flex-1 min-w-0">
        <div className="text-text truncate">{item.title || `tmdb:${item.tmdb_id}`}</div>
        <div className="text-text-dim">
          {item.year} · {statusLabel}
          {item.rating !== undefined ? ` · ${item.rating}/10` : ''}
          {item.list_name ? ` · ${item.list_name}` : ''}
        </div>
      </div>
    </div>
  );
}
