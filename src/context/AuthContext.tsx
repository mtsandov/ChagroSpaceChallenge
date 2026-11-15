import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppUser, Role } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInDemo: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'chagro.demoUser';

const DEMO_ACCOUNTS: Record<Role, AppUser> = {
  farmer: { id: 'demo-farmer-1', email: 'agricultor@chagro.demo', full_name: 'Agricultor Demo', role: 'farmer' },
  public: { id: 'demo-public-1', email: 'comunidad@chagro.demo', full_name: 'Junta de Agua Demo', role: 'public' },
};

function readUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function writeUser(user: AppUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(readUser);

  const signInDemo = useCallback((role: Role) => {
    writeUser(DEMO_ACCOUNTS[role]);
    setUser(DEMO_ACCOUNTS[role]);
  }, []);

  const signOut = useCallback(() => {
    writeUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, loading: false, signInDemo, signOut }), [user, signInDemo, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
