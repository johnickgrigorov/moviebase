import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import { db } from '../lib/db';
import {
  getAuth,
  signIn,
  signOut,
  subscribeAuth,
  isGoogleConfigured,
  type AuthState,
} from '../lib/google-auth';
import {
  getSyncState,
  subscribeSync,
  pushBackup,
  pullBackup,
  setAutoSync,
  exportToFile,
  importFromFile,
  type SyncStatus,
} from '../lib/sync';
import { formatRelativeTime, plural, formatHours } from '../lib/format';

export function Profile() {
  const [auth, setAuth] = useState<AuthState | null>(getAuth());
  const [sync, setSync] = useState(getSyncState());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth(setAuth);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeSync(setSync);
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSignIn = async () => {
    try {
      setBusy('signin');
      await signIn();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setBusy(null);
    }
  };

  const handlePush = async () => {
    setBusy('push');
    await pushBackup();
    setBusy(null);
    showToast('Бэкап загружен в Drive');
  };

  const handlePull = async () => {
    if (!confirm('Загрузить последний бэкап из Google Drive и объединить с локальными данными?')) return;
    setBusy('pull');
    try {
      const res = await pullBackup('merge');
      showToast(res.applied ? 'Данные восстановлены' : 'Бэкапов в Drive нет');
    } catch {
      // sync state уже содержит ошибку
    }
    setBusy(null);
  };

  const handleExport = async () => {
    const blob = await exportToFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moviebase-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Файл сохранён');
  };

  const handleImport = async (file: File) => {
    if (!confirm('Объединить данные из файла с текущими?')) return;
    setBusy('import');
    try {
      await importFromFile(file, 'merge');
      showToast('Импорт завершён');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка импорта');
    }
    setBusy(null);
  };

  return (
    <div className="pt-6 px-4">
      <h1 className="display-title text-3xl mb-6">Профиль</h1>

      <section className="bg-bg-elevated border border-border rounded-lg p-4 mb-4">
        {!isGoogleConfigured() ? (
          <div className="text-sm text-text-muted">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-accent" />
              <span className="text-text font-medium">Google не настроен</span>
            </div>
            Чтобы включить облачный бэкап, добавь <span className="font-mono text-text">VITE_GOOGLE_CLIENT_ID</span> в{' '}
            <span className="font-mono text-text">.env.local</span> и пересобери.
          </div>
        ) : !auth ? (
          <button
            onClick={handleSignIn}
            disabled={busy === 'signin'}
            className="w-full flex items-center justify-center gap-2 bg-accent text-bg py-3 rounded-lg font-medium active:scale-95 disabled:opacity-50"
          >
            <LogIn size={18} /> Войти через Google
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {auth.user?.picture && <img src={auth.user.picture} alt="" className="w-10 h-10 rounded-full" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{auth.user?.name ?? '—'}</div>
              <div className="text-2xs text-text-muted truncate">{auth.user?.email ?? ''}</div>
            </div>
            <button onClick={signOut} className="text-text-muted active:text-danger p-2">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </section>

      {auth && (
        <section className="bg-bg-elevated border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SyncStatusIcon status={sync.status} />
              <span className="text-sm font-medium">{statusLabel(sync.status)}</span>
            </div>
            {sync.lastSyncedAt && <span className="text-2xs text-text-dim">{formatRelativeTime(sync.lastSyncedAt)}</span>}
          </div>
          {sync.lastError && <div className="text-2xs text-danger mb-3">{sync.lastError}</div>}

          <label className="flex items-center justify-between py-2 text-sm">
            <span>Автобэкап после изменений</span>
            <input
              type="checkbox"
              checked={sync.autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="w-10 h-6 appearance-none bg-bg border border-border rounded-full relative transition-colors checked:bg-accent before:absolute before:top-0.5 before:left-0.5 before:w-5 before:h-5 before:bg-text before:rounded-full before:transition-transform checked:before:translate-x-4 checked:before:bg-bg"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={handlePush}
              disabled={busy === 'push'}
              className="flex items-center justify-center gap-2 py-2.5 bg-bg border border-border rounded text-sm active:border-accent disabled:opacity-50"
            >
              <Upload size={14} /> Сохранить
            </button>
            <button
              onClick={handlePull}
              disabled={busy === 'pull'}
              className="flex items-center justify-center gap-2 py-2.5 bg-bg border border-border rounded text-sm active:border-accent disabled:opacity-50"
            >
              <Download size={14} /> Восстановить
            </button>
          </div>
        </section>
      )}

      <section className="bg-bg-elevated border border-border rounded-lg p-4 mb-4">
        <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3">Ручной бэкап</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-2.5 bg-bg border border-border rounded text-sm active:border-accent"
          >
            <Download size={14} /> Экспорт JSON
          </button>
          <label className="flex items-center justify-center gap-2 py-2.5 bg-bg border border-border rounded text-sm active:border-accent cursor-pointer">
            <Upload size={14} /> Импорт JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </section>

      <Stats />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-bg-elevated border border-accent/50 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 z-50 shadow-xl">
          <Check size={14} className="text-accent" />
          {toast}
        </div>
      )}
    </div>
  );
}

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  if (status === 'syncing') return <RefreshCw size={16} className="animate-spin text-accent" />;
  if (status === 'error') return <AlertCircle size={16} className="text-danger" />;
  if (status === 'offline') return <CloudOff size={16} className="text-text-dim" />;
  if (status === 'dirty') return <Cloud size={16} className="text-accent" />;
  return <Cloud size={16} className="text-success" />;
}

function statusLabel(status: SyncStatus): string {
  return {
    idle: 'Синхронизировано',
    dirty: 'Есть несохранённые изменения',
    syncing: 'Синхронизация…',
    error: 'Ошибка синхронизации',
    offline: 'Офлайн',
  }[status];
}

function Stats() {
  const watchedMovies = useLiveQuery(() => db.watchedMovies.count()) ?? 0;
  const watchedEps = useLiveQuery(() => db.watchedEpisodes.count()) ?? 0;
  const watchlistCount = useLiveQuery(() => db.watchlist.count()) ?? 0;
  const ratings = useLiveQuery(() => db.ratings.toArray()) ?? [];

  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;
  const totalMinutes = watchedMovies * 110 + watchedEps * 45;

  return (
    <section className="bg-bg-elevated border border-border rounded-lg p-4 mb-4">
      <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 flex items-center gap-1.5">
        <BarChart3 size={12} /> Статистика
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat value={String(watchedMovies)} label={plural(watchedMovies, 'фильм', 'фильма', 'фильмов')} />
        <MiniStat value={String(watchedEps)} label={plural(watchedEps, 'эпизод', 'эпизода', 'эпизодов')} />
        <MiniStat value={String(watchlistCount)} label="в списке" />
        <MiniStat value={avgRating > 0 ? avgRating.toFixed(1) : '—'} label="средняя оценка" />
      </div>
      <div className="text-2xs text-text-dim mt-3 text-center">≈ {formatHours(totalMinutes)} просмотрено</div>
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className={clsx('font-mono text-2xl', value === '—' ? 'text-text-dim' : 'text-accent')}>{value}</div>
      <div className="text-2xs text-text-muted">{label}</div>
    </div>
  );
}
