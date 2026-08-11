/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { login as apiLogin, logoutApi, AUTH_EXPIRED_EVENT } from '../api/client';

import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: (showToast?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        const parsed: unknown = JSON.parse(storedUser);

        // Validate the shape before trusting it
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'id' in parsed &&
          'email' in parsed &&
          'role' in parsed
        ) {
          setUser(parsed as User);
        } else {
          // Invalid shape — clear corrupted session
          localStorage.removeItem('user');
        }
      }
    } catch {
      // Corrupted localStorage — clear and continue
      localStorage.removeItem('user');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiLogin(email, password);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async (showToast = true) => {
    try {
      await logoutApi();
    } catch (e) {
      // Ignore errors on logout
    }
    setUser(null);
    localStorage.removeItem('user');
    if (showToast) {
      toast.success('Successfully logged out');
    }
  }, []);

  // Listen for 401 expired-auth events from the API interceptor
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
    logout
  }), [user, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
