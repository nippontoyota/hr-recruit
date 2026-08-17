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

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatter({
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatter({ day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatter({ hour: '2-digit', minute: '2-digit' }).format(date);
}
