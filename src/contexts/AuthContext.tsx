import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { auth, clearStoredToken, getStoredToken, setStoredToken, User } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount, try to restore session from SecureStore
  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const user = await auth.me();
          setState({ user, token, isLoading: false, isAuthenticated: true });
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        // Token invalid/expired — clear it
        await clearStoredToken();
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  const handleAuthResponse = useCallback(async (token: string, user: User) => {
    await setStoredToken(token);
    setState({ user, token, isLoading: false, isAuthenticated: true });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    await handleAuthResponse(res.token, res.user);
  }, [handleAuthResponse]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await auth.register({ name, email, password });
    await handleAuthResponse(res.token, res.user);
  }, [handleAuthResponse]);

  const demoLogin = useCallback(async () => {
    const res = await auth.demoLogin();
    await handleAuthResponse(res.token, res.user);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const deleteAccount = useCallback(async () => {
    await auth.deleteAccount();
    await clearStoredToken();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await auth.me();
    setState((s) => ({ ...s, user }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, demoLogin, logout, deleteAccount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
