import { createContext } from 'react';
import type { User, UserRole } from '../types';

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: (showToast?: boolean) => Promise<void>;
}

/** Isolated so Fast Refresh can reload AuthProvider without replacing this object. */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
