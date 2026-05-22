import { exportSnapshot, applySnapshot, type Snapshot, db, now } from './db';
import { drive, getAuth, isGoogleConfigured, subscribeAuth } from './google-auth';

export type SyncStatus = 'idle' | 'dirty' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  autoSync: boolean;
}

const STATE_KEY = 'mb-sync-state';
const AUTO_KEY = 'mb-sync-auto';
const DEBOUNCE_MS = 30_000;

function loadState(): SyncState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const auto = localStorage.getItem(AUTO_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SyncState>) : {};
    return {
      status: 'idle',
      lastSyncedAt: parsed.lastSyncedAt ?? null,
      lastError: null,
      autoSync: auto === null ? true : auto === 'true',
    };
  } catch {
    return { status: 'idle', lastSyncedAt: null, lastError: null, autoSync: true };
  }
}

const state: SyncState = loadState();
const listeners = new Set<(s: SyncState) => void>();
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function persist(): void {
  localStorage.setItem(STATE_KEY, JSON.stringify({ lastSyncedAt: state.lastSyncedAt }));
  localStorage.setItem(AUTO_KEY, state.autoSync ? 'true' : 'false');
}

function emit(): void {
  for (const l of listeners) l({ ...state });
}

function setState(patch: Partial<SyncState>): void {
  Object.assign(state, patch);
  persist();
  emit();
}

export function getSyncState(): SyncState {
  return { ...state };
}

export function subscribeSync(listener: (s: SyncState) => void): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function setAutoSync(enabled: boolean): void {
  setState({ autoSync: enabled });
  if (enabled && state.status === 'dirty') scheduleSync();
}

export function markDirty(): void {
  if (!isGoogleConfigured() || !getAuth()) return;
  setState({ status: 'dirty' });
  if (state.autoSync) scheduleSync();
}

function scheduleSync(): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    void pushBackup();
  }, DEBOUNCE_MS);
}

export async function pushBackup(): Promise<void> {
  if (!isGoogleConfigured()) {
    setState({ status: 'error', lastError: 'Google не настроен' });
    return;
  }
  if (!getAuth()) {
    setState({ status: 'error', lastError: 'Не авторизован в Google' });
    return;
  }
  if (!navigator.onLine) {
    setState({ status: 'offline' });
    return;
  }
  setState({ status: 'syncing', lastError: null });
  try {
    const snap = await exportSnapshot();
    await drive.pushBackup(JSON.stringify(snap));
    setState({ status: 'idle', lastSyncedAt: now() });
  } catch (err) {
    setState({
      status: 'error',
      lastError: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function pullBackup(mode: 'merge' | 'replace' = 'merge'): Promise<{ applied: boolean; modifiedTime?: string }> {
  if (!isGoogleConfigured() || !getAuth()) {
    throw new Error('Google не настроен или не выполнен вход');
  }
  setState({ status: 'syncing', lastError: null });
  try {
    const remote = await drive.pullLatest();
    if (!remote) {
      setState({ status: 'idle' });
      return { applied: false };
    }
    await applySnapshot(remote.snapshot as Snapshot, mode);
    setState({ status: 'idle', lastSyncedAt: now() });
    return { applied: true, modifiedTime: remote.modifiedTime };
  } catch (err) {
    setState({
      status: 'error',
      lastError: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function importFromFile(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  const text = await file.text();
  const snap = JSON.parse(text) as Snapshot;
  await applySnapshot(snap, mode);
  markDirty();
}

export async function exportToFile(): Promise<Blob> {
  const snap = await exportSnapshot();
  return new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
}

export async function initialSync(): Promise<{ checked: boolean; pulled: boolean }> {
  if (!isGoogleConfigured() || !getAuth() || !navigator.onLine) {
    return { checked: false, pulled: false };
  }
  try {
    const remote = await drive.pullLatest();
    if (!remote) return { checked: true, pulled: false };

    const localUpdated = await getLocalLastUpdated();
    const remoteSnap = remote.snapshot as Snapshot;
    const remoteUpdated = remoteSnap.created_at;

    if (remoteUpdated > localUpdated) {
      await applySnapshot(remoteSnap, 'merge');
      setState({ status: 'idle', lastSyncedAt: now() });
      return { checked: true, pulled: true };
    }
    return { checked: true, pulled: false };
  } catch (err) {
    setState({
      status: 'error',
      lastError: err instanceof Error ? err.message : String(err),
    });
    return { checked: true, pulled: false };
  }
}

async function getLocalLastUpdated(): Promise<number> {
  const tables = [db.watchlist, db.watchedMovies, db.watchedEpisodes, db.ratings, db.lists, db.listItems];
  let max = 0;
  for (const t of tables) {
    const last = (await t.orderBy('updated_at').last()) as { updated_at?: number } | undefined;
    if (last && (last.updated_at ?? 0) > max) max = last.updated_at!;
  }
  // Учитываем удаления (tombstones) — иначе сессия с одними удалениями не вытянет последнее
  // обновление и initialSync может затереть локальные удаления облачными данными
  const lastTomb = (await db.tombstones.orderBy('deleted_at').last()) as { deleted_at?: number } | undefined;
  if (lastTomb && (lastTomb.deleted_at ?? 0) > max) max = lastTomb.deleted_at!;
  return max;
}

subscribeAuth((auth) => {
  if (!auth) {
    if (pendingTimer) clearTimeout(pendingTimer);
    setState({ status: 'idle' });
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (state.status === 'offline' || state.status === 'dirty') scheduleSync();
  });
  window.addEventListener('offline', () => setState({ status: 'offline' }));
}

/** Force-flush dirty state when the tab is about to be hidden/closed.
 *  Чтобы не терять незасинканные изменения, если пользователь закрыл вкладку
 *  раньше истечения 30-секундного debounce. Вызывает pushBackup без await — браузер
 *  попытается завершить запрос best-effort. */
export function flushOnUnload(): void {
  if (typeof window === 'undefined') return;
  const tryFlush = () => {
    if (state.status === 'dirty' && state.autoSync && isGoogleConfigured() && getAuth() && navigator.onLine) {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      void pushBackup();
    }
  };
  // visibilitychange срабатывает надёжнее, чем beforeunload, особенно на iOS
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') tryFlush();
  });
  window.addEventListener('pagehide', tryFlush);
}
