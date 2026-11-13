import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken, getToken } from '../api/client';

export type User = {
  id: string;
  memberId?: string;
  username: string;
  phone: string;
  country: string;
  inviteCode: string;
  inviteLink?: string;
  balance: number;
  bonus: number;
  vipLevel?: number;
  onboardingDone?: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (payload: { phone: string; password: string; inviteCode: string; country?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (phone: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (payload: { phone: string; password: string; inviteCode: string; country?: string }) => {
    const data = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => { setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
