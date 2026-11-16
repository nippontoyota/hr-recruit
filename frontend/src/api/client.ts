import { isAbortError } from '../lib/utils';

const configuredBaseURL = typeof import.meta.env.VITE_API_BASE_URL === 'string'
  ? import.meta.env.VITE_API_BASE_URL.trim()
  : '';
const fallbackBaseURL = import.meta.env.DEV
  ? 'http://127.0.0.1:8000/api/v1'
  : 'https://hr-recruit-api.vercel.app/api/v1';
// A relative API URL is useful with the Vite dev proxy, but production is a
// separate static deployment and must use the backend origin explicitly.
// Force HTTPS for production
const forceHttps = (url: string) => {
  if (import.meta.env.DEV) return url;
  if (!url || url.startsWith('/')) return url;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  if (!url.startsWith('https://')) return 'https://' + url;
  return url;
};

const baseURL = forceHttps(configuredBaseURL ? configuredBaseURL : fallbackBaseURL);

export function getApiBaseUrl(): string {
  return baseURL;
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';
const ACCESS_TOKEN_KEY = 'access_token';

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export class FetchError extends Error {
  status: number;
  url?: string;
  endpoint?: string;
  method?: string;
  isNetworkError?: boolean;
  isOffline?: boolean;
  response: { status: number; data?: any };

  constructor(status: number, data?: any, meta?: { url?: string; endpoint?: string; method?: string; isNetworkError?: boolean }) {
    const detail = typeof data?.detail === 'string' ? data.detail : (data?.message || '');
    const message = detail
      ? `Request failed (${status}): ${detail}`
      : status > 0
      ? `Request failed with status ${status}`
      : (data?.detail || 'Network connection error');
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.url = meta?.url;
    this.endpoint = meta?.endpoint;
    this.method = meta?.method;
    this.isNetworkError = meta?.isNetworkError;
    this.isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    this.response = { status, data };
  }
}

function normalizeFetchAbort(err: unknown, meta?: { url?: string; endpoint?: string; method?: string }, callerSignal?: AbortSignal): never {
  if (callerSignal?.aborted) {
    throw isAbortError(err) ? err : new DOMException('Aborted', 'AbortError');
  }
  if (isAbortError(err)) {
    throw new FetchError(408, { detail: 'Request timed out. Try again.' }, meta);
  }
  if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const detail = isOffline
      ? 'You appear to be offline. Please check your internet connection.'
      : 'Network Error: The server is unreachable. Please check your internet connection or disable any strict ad blockers.';
    throw new FetchError(0, { detail }, { ...meta, isNetworkError: true });
  }
  throw err;
}

const inflightGets = new Map<string, Promise<{ data: any }>>();
const getResponseCache = new Map<string, { data: any; expiresAt: number }>();
const GET_CACHE_TTL_MS = 15_000;

type RequestConfig = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: 'json' | 'blob';
  timeoutMs?: number;
};

export async function request(method: string, endpoint: string, body?: any, config?: RequestConfig) {
  if (method !== 'GET') {
    // A write may change any dependent read, so never let a prior GET survive
    // a mutation. This cache is a latency optimization, not a source of truth.
    getResponseCache.clear();
  }

  const coalesceKey = method === 'GET' && body == null && !config?.signal ? endpoint : null;
  if (coalesceKey) {
    const cached = getResponseCache.get(coalesceKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve({ data: cached.data });
    }
    if (cached) getResponseCache.delete(coalesceKey);
    const existing = inflightGets.get(coalesceKey);
    if (existing) return existing;
  }

  const pending = executeRequest(method, endpoint, body, config)
    .then((response) => {
      if (coalesceKey) {
        getResponseCache.set(coalesceKey, {
          data: response.data,
          expiresAt: Date.now() + GET_CACHE_TTL_MS,
        });
      }
      return response;
    })
    .finally(() => {
      if (coalesceKey) inflightGets.delete(coalesceKey);
    });
  if (coalesceKey) inflightGets.set(coalesceKey, pending);
  return pending;
}

async function executeRequest(method: string, endpoint: string, body?: any, config?: RequestConfig) {
  const url = `${baseURL}${endpoint}`;
  const headers: Record<string, string> = getAuthHeaders({
    'Content-Type': 'application/json',
    ...(config?.headers || {}),
  });


  let fetchBody: any = body;
  if (body instanceof FormData) {
    // Let browser set the boundary
    delete headers['Content-Type'];
    fetchBody = body;
  } else if (body) {
    fetchBody = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), config?.timeoutMs ?? 30000);
  const onCallerAbort = () => controller.abort();
  if (config?.signal) {
    config.signal.addEventListener('abort', onCallerAbort, { once: true });
    if (config.signal.aborted) controller.abort();
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    throw normalizeFetchAbort(err, { url, endpoint, method }, config?.signal);
  } finally {
    window.clearTimeout(timeoutId);
    config?.signal?.removeEventListener('abort', onCallerAbort);
  }

  if (response.status === 401 && endpoint !== '/auth/login') {
    localStorage.removeItem('user');
    setAccessToken(null);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  let data;
  if (response.status === 204) {
    data = null;
  } else if (config?.responseType === 'blob' && response.ok) {
    try {
      data = await response.blob();
    } catch (err) {
      throw normalizeFetchAbort(err, { url, endpoint, method }, config?.signal);
    }
  } else {
    let text: string;
    try {
      text = await response.text();
    } catch (err) {
      throw normalizeFetchAbort(err, { url, endpoint, method }, config?.signal);
    }
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    if (data && typeof data === 'object' && Array.isArray(data.detail)) {
      data.detail = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
    }
    throw new FetchError(response.status, data, { url, endpoint, method });
  }

  return { data };
}


export const login = async (email: string, password: string) => {
  const response = await request('POST', '/auth/login', { email, password });
  return response.data;
};

export const logoutApi = async () => {
  await request('POST', '/auth/logout');
};
