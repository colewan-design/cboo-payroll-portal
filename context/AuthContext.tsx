import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from 'react';
import * as storage from '@/services/storage';
import api, { TOKEN_KEY } from '@/services/api';

export type Role = {
  id: number;
  name: string;
  guard_name: string;
};

export type User = {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  employee_id: string;
  email: string;
  profile_image: string | null;
  file_password: string | null;
  roles: Role[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const stored = await storage.getItem(TOKEN_KEY);
      if (stored) {
        const res = await api.get('/api/user', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        setToken(stored);
        setUser(res.data.data);
      }
    } catch {
      await storage.deleteItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    // Use the dedicated stateless API endpoint — no session/CSRF involved
    const res = await api.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    await storage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function logout() {
    await storage.deleteItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!token) return;
    const res = await api.get('/api/user');
    setUser(res.data.data);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
