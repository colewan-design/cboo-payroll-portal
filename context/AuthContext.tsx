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
  hasSeenOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  markOnboardingDone: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const ONBOARDING_KEY = (userId: number) => `onboarding_done_${userId}`;

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

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
        const userData: User = res.data.data;
        const done = await storage.getItem(ONBOARDING_KEY(userData.id));
        setToken(stored);
        setUser(userData);
        setHasSeenOnboarding(!!done);
      }
    } catch {
      await storage.deleteItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    const done = await storage.getItem(ONBOARDING_KEY(newUser.id));
    await storage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setHasSeenOnboarding(!!done);
  }

  async function logout() {
    await storage.deleteItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setHasSeenOnboarding(true);
  }

  async function refreshUser() {
    if (!token) return;
    const res = await api.get('/api/user');
    setUser(res.data.data);
  }

  async function markOnboardingDone() {
    if (!user) return;
    await storage.setItem(ONBOARDING_KEY(user.id), 'true');
    setHasSeenOnboarding(true);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, hasSeenOnboarding, login, logout, refreshUser, markOnboardingDone }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
