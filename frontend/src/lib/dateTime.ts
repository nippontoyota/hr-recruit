const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

function resolveTimeZone(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-IN', { timeZone: candidate }).format();
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export const APP_TIME_ZONE = resolveTimeZone(import.meta.env.VITE_APP_TIMEZONE);

function formatter(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: APP_TIME_ZONE });
  } catch {
    return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: DEFAULT_TIME_ZONE });
  }
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '-';
    // Match ISO date YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    // Legacy employment records may contain month-only values (YYYY-MM).
    // Treat them as the first day of that month so displayed dates are complete.
    const isoMonthMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
    if (isoMonthMatch) {
      const [, y, m] = isoMonthMatch;
      return `01/${m.padStart(2, '0')}/${y}`;
    }
    // Match DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '-';

  const parts = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');
  const month = parts.find((p) => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0');
  const year = parts.find((p) => p.type === 'year')?.value || String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

export function formatDateDmy(value: string | Date | null | undefined): string {
  return formatDate(value);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '-';

  const parts = formatter({
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');
  const month = parts.find((p) => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0');
  const year = parts.find((p) => p.type === 'year')?.value || String(date.getFullYear());
  const hour = parts.find((p) => p.type === 'hour')?.value || '12';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value || '').toUpperCase() || (date.getHours() >= 12 ? 'PM' : 'AM');

  return `${day}/${month}/${year}, ${hour}:${minute} ${dayPeriod}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatter({ hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}
