import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { login as apiLogin, AUTH_EXPIRED_EVENT } from '../api/client';

import { IS_MOCK } from '../lib/env';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USERS: Record<string, User> = {
  'admin@nippon.test': { id: '1', email: 'admin@nippon.test', full_name: 'System Admin', role: 'SUPER_ADMIN' },
  'hr@nippon.test': { id: '3', email: 'hr@nippon.test', full_name: 'HR Rep', role: 'HR' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        const parsed: unknown = JSON.parse(storedUser);

        // Validate the shape before trusting it
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'id' in parsed &&
          'email' in parsed &&
          'role' in parsed
        ) {
          setToken(storedToken);
          setUser(parsed as User);
        } else {
          // Invalid shape — clear corrupted session
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    } catch {
      // Corrupted localStorage — clear and continue
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (IS_MOCK) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockUser = MOCK_USERS[email];
        if (mockUser) {
          const mockToken = `mock-jwt-token-${mockUser.id}`;
          setUser(mockUser);
          setToken(mockToken);
          localStorage.setItem('token', mockToken);
          localStorage.setItem('user', JSON.stringify(mockUser));
        } else {
          throw new Error('Invalid mock credentials');
        }
      } else {
        // Real API call
        const response = await apiLogin(email, password);
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Listen for 401 expired-auth events from the API interceptor
  useEffect(() => {
    const handleAuthExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, token, isLoading, login, logout }}>
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
