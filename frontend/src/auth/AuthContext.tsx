import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { login as apiLogin } from '../api/client';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USERS: Record<string, User> = {
  'local@nippon.test': { id: '1', email: 'local@nippon.test', full_name: 'Local HR', role: 'LOCAL_HR', branch_location: 'Kochi' },
  'hq@nippon.test': { id: '2', email: 'hq@nippon.test', full_name: 'HQ HR', role: 'HEAD_OFFICE_HR' },
  'salary@nippon.test': { id: '3', email: 'salary@nippon.test', full_name: 'Salary Team', role: 'SALARY_TEAM' },
  'admin@nippon.test': { id: '4', email: 'admin@nippon.test', full_name: 'System Admin', role: 'ADMIN' },
  'dept@nippon.test': { id: '5', email: 'dept@nippon.test', full_name: 'Service Head', role: 'DEPARTMENT_HEAD' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const useMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
      
      if (useMock) {
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
        const response = await apiLogin(email, password || '');
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

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
