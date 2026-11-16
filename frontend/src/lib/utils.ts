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

export interface DiagnosticErrorInfo {
  title: string;
  message: string;
  statusCode?: number;
  detail?: string;
  url?: string;
  endpoint?: string;
  method?: string;
  isNetworkError?: boolean;
  isOffline?: boolean;
  timestamp: string;
  tokenSnippet?: string;
  rawError?: string;
}

export function extractDiagnosticInfo(
  err: any,
  fallbackTitle = 'Link unavailable',
  fallbackMsg = 'This link is invalid, expired, or has already been used.',
  token?: string,
): DiagnosticErrorInfo {
  if (isAbortError(err)) {
    return {
      title: fallbackTitle,
      message: '',
      timestamp: new Date().toISOString(),
    };
  }

  const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) || err?.isOffline === true;
  const status = Number(err?.status ?? err?.response?.status ?? 0);
  const detail = typeof err?.response?.data?.detail === 'string'
    ? err.response.data.detail
    : (typeof err?.response?.data?.message === 'string' ? err.response.data.message : undefined);
  const url = err?.url || err?.response?.url;
  const endpoint = err?.endpoint;
  const method = err?.method;
  const isNetwork = err?.isNetworkError || status === 0 || err instanceof TypeError || /network|failed to fetch/i.test(String(err?.message || ''));

  let title = fallbackTitle;
  let message = detail || err?.message || fallbackMsg;

  if (isOffline) {
    title = 'No Internet Connection';
    message = 'Your device appears to be offline. Please reconnect to the internet and try again.';
  } else if (status === 404) {
    title = 'Link Expired or Not Found (404)';
    message = detail || 'This link does not exist, has expired, or has already been used.';
  } else if (status === 400 || status === 410) {
    title = 'Link Unavailable or Already Completed';
    message = detail || 'This link has already been completed or is no longer accessible.';
  } else if (status === 401 || status === 403) {
    title = 'Access Restricted';
    message = detail || 'You do not have permission to view this page or your session has ended.';
  } else if (status === 408 || status === 504) {
    title = 'Request Timed Out';
    message = 'The server took too long to respond. Please check your connection and try again.';
  } else if (status >= 500) {
    title = `Server Error (${status})`;
    message = detail || 'The server encountered a temporary error. Please try again in a few moments.';
  } else if (isNetwork) {
    title = 'Unable to Connect to Server';
    message = detail || 'The server could not be reached. Check your internet connection or verify if your network or ad blocker is blocking the request.';
  }

  const tokenSnippet = token
    ? (token.length > 16 ? `${token.slice(0, 8)}...${token.slice(-8)}` : token)
    : undefined;

  return {
    title,
    message,
    statusCode: status || undefined,
    detail,
    url,
    endpoint,
    method,
    isNetworkError: isNetwork,
    isOffline,
    timestamp: new Date().toISOString(),
    tokenSnippet,
    rawError: err?.message ? String(err.message) : undefined,
  };
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
