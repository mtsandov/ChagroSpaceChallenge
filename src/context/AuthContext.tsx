import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppUser, Role } from '../types';
import { isDemoMode, supabase } from '../lib/supabase';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isDemo: boolean;
  /** Token para llamar a /api (JWT de Supabase o token demo) */
  getAccessToken: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { email: string; password: string; fullName: string; role: Role }) => Promise<{ needsConfirmation: boolean }>;
  signInDemo: (role: Role) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_STORAGE_KEY = 'chagro.demoUser';
const DEMO_USERS_KEY = 'chagro.demoUsers';

const DEMO_ACCOUNTS: Record<Role, AppUser> = {
  farmer: { id: 'demo-farmer-1', email: 'agricultor@chagro.demo', full_name: 'Agricultor Demo', role: 'farmer' },
  public: { id: 'demo-public-1', email: 'comunidad@chagro.demo', full_name: 'Junta de Agua Demo', role: 'public' },
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: la sesión demo dura solo esta pestaña */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Carga inicial de sesión ---
  useEffect(() => {
    if (isDemoMode) {
      setUser(readJson<AppUser | null>(DEMO_STORAGE_KEY, null));
      setLoading(false);
      return;
    }
    const client = supabase!;
    const loadProfile = async (id: string, email: string, meta: Record<string, unknown>) => {
      const { data } = await client.from('profiles').select('full_name, role').eq('id', id).single();
      setUser({
        id,
        email,
        full_name: (data?.full_name as string) || (meta.full_name as string) || email,
        role: data?.role === 'farmer' ? 'farmer' : 'public',
      });
    };
    client.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (u) await loadProfile(u.id, u.email ?? '', u.user_metadata);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) void loadProfile(u.id, u.email ?? '', u.user_metadata);
      else setUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isDemoMode) {
      const users = readJson<Record<string, AppUser>>(DEMO_USERS_KEY, {});
      const found =
        users[email.toLowerCase()] ?? Object.values(DEMO_ACCOUNTS).find((a) => a.email === email.toLowerCase());
      if (!found) throw new Error('Usuario no encontrado. Regístrate o usa una cuenta demo.');
      writeJson(DEMO_STORAGE_KEY, found);
      setUser(found);
      return;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async ({ email, password, fullName, role }) => {
    if (isDemoMode) {
      const users = readJson<Record<string, AppUser>>(DEMO_USERS_KEY, {});
      const newUser: AppUser = { id: `demo-${Date.now()}`, email: email.toLowerCase(), full_name: fullName, role };
      users[newUser.email] = newUser;
      writeJson(DEMO_USERS_KEY, users);
      writeJson(DEMO_STORAGE_KEY, newUser);
      setUser(newUser);
      return { needsConfirmation: false };
    }
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  }, []);

  const signInDemo = useCallback((role: Role) => {
    const account = DEMO_ACCOUNTS[role];
    writeJson(DEMO_STORAGE_KEY, account);
    setUser(account);
  }, []);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      writeJson(DEMO_STORAGE_KEY, null);
      setUser(null);
      return;
    }
    await supabase!.auth.signOut();
    setUser(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    if (isDemoMode) return user?.role === 'farmer' ? `demo-farmer:${user.id}` : null;
    const { data } = await supabase!.auth.getSession();
    return data.session?.access_token ?? null;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isDemo: isDemoMode, getAccessToken, signIn, signUp, signInDemo, signOut }),
    [user, loading, getAccessToken, signIn, signUp, signInDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
