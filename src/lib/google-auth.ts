const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const USERINFO_SCOPE = 'openid email profile';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

interface TokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (resp: TokenResponse) => void;
  error_callback?: (err: unknown) => void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

export interface AuthState {
  token: string;
  expiresAt: number;
  user: GoogleUser | null;
}

const STORAGE_KEY = 'mb-google-auth';
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function getClientId(): string | null {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? null;
}

export function isGoogleConfigured(): boolean {
  return !!getClientId();
}

let scriptPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Не удалось загрузить Google Identity Services'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.token || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAuth(state: AuthState | null): void {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const listeners = new Set<(s: AuthState | null) => void>();
let currentAuth: AuthState | null = loadAuth();

export function getAuth(): AuthState | null {
  return currentAuth;
}

export function subscribeAuth(listener: (s: AuthState | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setAuth(state: AuthState | null): void {
  currentAuth = state;
  saveAuth(state);
  listeners.forEach((l) => l(state));
}

async function fetchUserInfo(token: string): Promise<GoogleUser | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email: string; name: string; picture: string };
    return { email: data.email, name: data.name, picture: data.picture };
  } catch {
    return null;
  }
}

export async function signIn(): Promise<AuthState> {
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID не настроен');
  await loadGsi();

  return new Promise<AuthState>((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: `${DRIVE_SCOPE} ${USERINFO_SCOPE}`,
      callback: async (resp) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        const user = await fetchUserInfo(resp.access_token);
        const state: AuthState = {
          token: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in - 60) * 1000,
          user,
        };
        setAuth(state);
        resolve(state);
      },
      error_callback: (err) => reject(err),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function ensureToken(): Promise<string> {
  const cur = currentAuth;
  if (cur && cur.expiresAt > Date.now() + 30_000) {
    return cur.token;
  }
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID не настроен');
  await loadGsi();
  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: `${DRIVE_SCOPE} ${USERINFO_SCOPE}`,
      callback: async (resp) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        const user = cur?.user ?? (await fetchUserInfo(resp.access_token));
        const state: AuthState = {
          token: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in - 60) * 1000,
          user,
        };
        setAuth(state);
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(err),
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOut(): void {
  const cur = currentAuth;
  if (cur && window.google?.accounts) {
    window.google.accounts.oauth2.revoke(cur.token);
  }
  setAuth(null);
}

const BACKUP_FOLDER_NAME = 'Moviebase Personal';
const BACKUP_PREFIX = 'backup-';
const BACKUP_LATEST = 'backup-latest.json';
const MAX_HISTORY = 7;

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

async function driveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await ensureToken();
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function findOrCreateFolder(): Promise<string> {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${BACKUP_FOLDER_NAME}' and trashed=false`;
  const found = await driveFetch<{ files: DriveFile[] }>(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
  );
  if (found.files.length > 0) return found.files[0]!.id;

  const created = await driveFetch<{ id: string }>(`/drive/v3/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  return created.id;
}

async function listBackups(folderId: string): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and trashed=false and name contains '${BACKUP_PREFIX}'`;
  const res = await driveFetch<{ files: DriveFile[] }>(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
  );
  return res.files;
}

async function uploadJson(folderId: string, name: string, json: string, existingId?: string): Promise<DriveFile> {
  const meta = { name, parents: existingId ? undefined : [folderId] };
  const boundary = '-------muffin' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    json +
    `\r\n--${boundary}--`;

  const url = existingId
    ? `/upload/drive/v3/files/${existingId}?uploadType=multipart&fields=id,name,modifiedTime,size`
    : `/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size`;

  return driveFetch<DriveFile>(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

async function downloadJson(fileId: string): Promise<string> {
  const token = await ensureToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Скачивание бэкапа: HTTP ${res.status}`);
  return res.text();
}

async function deleteFile(fileId: string): Promise<void> {
  const token = await ensureToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export const drive = {
  async pushBackup(snapshotJson: string): Promise<void> {
    const folderId = await findOrCreateFolder();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const histName = `${BACKUP_PREFIX}${ts}.json`;
    await uploadJson(folderId, histName, snapshotJson);

    const existing = await listBackups(folderId);
    const latest = existing.find((f) => f.name === BACKUP_LATEST);
    await uploadJson(folderId, BACKUP_LATEST, snapshotJson, latest?.id);

    const history = (await listBackups(folderId)).filter((f) => f.name !== BACKUP_LATEST);
    history.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
    const toDelete = history.slice(MAX_HISTORY);
    for (const f of toDelete) await deleteFile(f.id);
  },

  async pullLatest(): Promise<{ snapshot: unknown; modifiedTime: string } | null> {
    const folderId = await findOrCreateFolder();
    const files = await listBackups(folderId);
    const latest = files.find((f) => f.name === BACKUP_LATEST) ?? files[0];
    if (!latest) return null;
    const text = await downloadJson(latest.id);
    return { snapshot: JSON.parse(text), modifiedTime: latest.modifiedTime };
  },
};
