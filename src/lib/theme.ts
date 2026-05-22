/**
 * Управление темой: auto (по системе) / dark / light.
 * Сохраняется в localStorage, синхронизируется с <html data-theme="..."> и
 * <meta name="theme-color">.
 */

export type ThemeChoice = 'auto' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'mb-theme';

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'auto') return v;
  } catch { /* ignore */ }
  return 'auto';
}

function writeChoice(choice: ThemeChoice): void {
  try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* ignore */ }
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'dark' || choice === 'light') return choice;
  return systemPrefersDark() ? 'dark' : 'light';
}

function apply(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
  // Обновляем <meta name="theme-color"> чтобы статус-бар браузера совпадал с темой
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = resolved === 'light' ? '#fbf8f3' : '#0a0908';
  }
}

const listeners = new Set<(state: { choice: ThemeChoice; resolved: ResolvedTheme }) => void>();
let currentChoice: ThemeChoice = 'auto';
let currentResolved: ResolvedTheme = 'dark';
let mediaListenerInstalled = false;

function emit(): void {
  for (const l of listeners) l({ choice: currentChoice, resolved: currentResolved });
}

function installMediaListener(): void {
  if (mediaListenerInstalled || typeof window === 'undefined' || !window.matchMedia) return;
  mediaListenerInstalled = true;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (currentChoice === 'auto') {
      currentResolved = resolve('auto');
      apply(currentResolved);
      emit();
    }
  };
  // Совместимость: новые браузеры используют addEventListener, старые — addListener
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
  else if (typeof (mq as { addListener?: (cb: () => void) => void }).addListener === 'function') {
    (mq as unknown as { addListener: (cb: () => void) => void }).addListener(handler);
  }
}

/** Должно вызываться один раз при старте приложения, ДО первого render. */
export function initTheme(): void {
  currentChoice = readChoice();
  currentResolved = resolve(currentChoice);
  apply(currentResolved);
  installMediaListener();
}

export function getTheme(): { choice: ThemeChoice; resolved: ResolvedTheme } {
  return { choice: currentChoice, resolved: currentResolved };
}

export function setTheme(choice: ThemeChoice): void {
  currentChoice = choice;
  writeChoice(choice);
  currentResolved = resolve(choice);
  apply(currentResolved);
  emit();
}

export function subscribeTheme(listener: (state: { choice: ThemeChoice; resolved: ResolvedTheme }) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
