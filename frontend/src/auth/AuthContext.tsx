import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { login as apiLogin, logoutApi, AUTH_EXPIRED_EVENT, setAccessToken } from '../api/client';
import { toast } from 'sonner';
import { AuthContext } from './auth-context';
export { useAuth } from './useAuth';

function readStoredUser(): User | null {
  try {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && !token) {
      localStorage.removeItem('user');
      return null;
    }
    if (!storedUser) return null;
    const parsed: unknown = JSON.parse(storedUser);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      'email' in parsed &&
      'role' in parsed
    ) {
      return parsed as User;
    }
    localStorage.removeItem('user');
    setAccessToken(null);
  } catch {
    localStorage.removeItem('user');
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiLogin(email, password);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      setAccessToken(response.access_token || response.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (showToast = true) => {
    try {
      await logoutApi();
    } catch {
      // Ignore errors on logout
    }
    setUser(null);
    localStorage.removeItem('user');
    setAccessToken(null);
    if (showToast) {
      toast.success('Successfully logged out');
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => logout(false);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [logout]);

  const contextValue = React.useMemo(() => ({
    user,
    role: user?.role || null,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
