import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Custom event emitted on 401 responses. AuthContext listens for this
 * to trigger a React-based redirect instead of a hard page reload.
 */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Stub for login api call
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export default api;
