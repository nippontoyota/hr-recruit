import { isAbortError } from '../lib/utils';

const baseURL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '/api/v1');

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

class FetchError extends Error {
  response: { status: number; data?: any };
  constructor(status: number, data?: any) {
    super(`Request failed with status ${status}`);
    this.response = { status, data };
  }
}

function normalizeFetchAbort(err: unknown, callerSignal?: AbortSignal): never {
  if (callerSignal?.aborted) {
    throw isAbortError(err) ? err : new DOMException('Aborted', 'AbortError');
  }
  if (isAbortError(err)) {
    throw new FetchError(408, { detail: 'Request timed out. Try again.' });
  }
  throw err;
}

const inflightGets = new Map<string, Promise<{ data: any }>>();

export async function request(method: string, endpoint: string, body?: any, config?: { headers?: Record<string, string>; signal?: AbortSignal }) {
  const coalesceKey = method === 'GET' && body == null && !config?.signal ? endpoint : null;
  if (coalesceKey) {
    const existing = inflightGets.get(coalesceKey);
    if (existing) return existing;
  }

  const pending = executeRequest(method, endpoint, body, config).finally(() => {
    if (coalesceKey) inflightGets.delete(coalesceKey);
  });
  if (coalesceKey) inflightGets.set(coalesceKey, pending);
  return pending;
}

async function executeRequest(method: string, endpoint: string, body?: any, config?: { headers?: Record<string, string>; signal?: AbortSignal }) {
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
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
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
    throw normalizeFetchAbort(err, config?.signal);
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
  } else {
    let text: string;
    try {
      text = await response.text();
    } catch (err) {
      throw normalizeFetchAbort(err, config?.signal);
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
    throw new FetchError(response.status, data);
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
