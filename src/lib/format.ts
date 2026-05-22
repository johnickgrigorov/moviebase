export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'только что';
  if (diff < 3600_000) {
    const m = Math.floor(diff / 60_000);
    return `${m} ${plural(m, 'минута', 'минуты', 'минут')} назад`;
  }
  if (diff < 86400_000) {
    const h = Math.floor(diff / 3600_000);
    return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  }
  if (diff < 86400_000 * 30) {
    const d = Math.floor(diff / 86400_000);
    return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
  }
  return formatDate(new Date(ts).toISOString());
}

export function formatVote(v: number | null | undefined): string {
  if (v === null || v === undefined || v <= 0) return '—';
  return v.toFixed(1);
}

export function formatHours(minutes: number): string {
  const h = Math.round(minutes / 60);
  return `${h} ${plural(h, 'час', 'часа', 'часов')}`;
}
