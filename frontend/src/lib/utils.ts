import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Browsers cannot render Word in an iframe; Microsoft fetches the signed URL. */
export function resumeEmbedUrl(url: string): string {
  if (/\.docx?(\?|$)/i.test(url)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Cancelled fetch, StrictMode remount abort, or caller AbortSignal. Not a user-facing failure. */
export function isAbortError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: unknown; message?: string };
  if (e.name === 'AbortError' || e.name === 'CanceledError' || e.code === 20 || e.code === 'ERR_CANCELED') return true;
  const msg = String(e.message || '');
  return /the user aborted a request|the operation was aborted|^aborted$|^canceled$/i.test(msg);
}

export function extractError(err: any, defaultMsg = 'An error occurred'): string {
  if (isAbortError(err)) return '';
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

/** Format a salary or number into Indian Rupee format, e.g. "₹4,25,000" */
export function formatSalary(value?: string | number | null): string {
  if (value == null) return '';
  const str = String(value).trim();
  if (!str || str === '-') return '-';
  if (/^[₹$€£]/.test(str)) return str;

  // Extract clean number
  const cleanDigits = str.replace(/[^0-9.]/g, '');
  if (!cleanDigits) return str;
  const num = Number(cleanDigits);
  if (isNaN(num)) return str;

  // Check if pure integer amount
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${str}`;
  }
}

/** Robust clipboard copy with synchronous fallback when document is unfocused or blocked */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard.writeText if document is focused
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below if unfocused or permission denied
    }
  }

  // 2. Synchronous DOM textarea fallback (works even if navigator.clipboard is blocked or document is unfocused)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch {
    // If execCommand fails
  }

  // 3. Fallback prompt so user never gets a hard error
  try {
    window.prompt('Copy this link (Ctrl+C):', text);
    return true;
  } catch {
    return false;
  }
}
