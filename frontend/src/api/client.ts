const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const AUTH_EXPIRED_EVENT = 'auth:expired';

class FetchError extends Error {
  response: { status: number; data?: any };
  constructor(status: number, data?: any) {
    super(`Request failed with status ${status}`);
    this.response = { status, data };
  }
}

export async function request(method: string, endpoint: string, body?: any, config?: { headers?: Record<string, string> }) {
  const url = `${baseURL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config?.headers || {}),
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let fetchBody: any = body;
  if (body instanceof FormData) {
    // Let browser set the boundary
    delete headers['Content-Type'];
    fetchBody = body;
  } else if (body) {
    fetchBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  if (!response.ok) {
    throw new FetchError(response.status, data);
  }

  return { data };
}


export const login = async (email: string, password: string) => {
  const response = await request('POST', '/auth/login', { email, password });
  return response.data;
};

