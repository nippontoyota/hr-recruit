import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractError(err: any, defaultMsg = 'An error occurred'): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const field = d.loc?.[d.loc?.length - 1] || 'Field';
      return `${field}: ${d.msg}`;
    }).join(', ');
  }
  return err?.message || defaultMsg;
}
