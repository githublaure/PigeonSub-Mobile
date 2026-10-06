import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setDataSession,
  seedDemo,
  clearAccountFollowUps,
  type SessionMode,
} from '../lib/local-data';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ApiError,
  auth,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  User,
} from '../lib/api';

const SESSION_RESTORE_TIMEOUT_MS = 8_000;

class SessionRestoreTimeoutError extends Error {
  constructor() {
    super('Session restoration timed out');
    this.name = 'SessionRestoreTimeoutError';
  }
}

async function restoreUserWithinTimeout(): Promise<User> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      auth.me(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new SessionRestoreTimeoutError()),
          SESSION_RESTORE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function isExplicitlyInvalidToken(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401) return true;

  return /(?:invalid|expired).*token|token.*(?:invalid|expired)/i.test(
    error.message,
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthState {
  mode: SessionMode;
  scope: string;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  startGuest: () => Promise<void>;
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
    mode: 'none',
    scope: 'none',
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount, try to restore session from SecureStore
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let token: string | null = null;
      let user: User | null = null;
      let isAuthenticated = false;
      let mode: SessionMode = 'none';
      let scope = 'none';

      try {
        const savedMode = await AsyncStorage.getItem('pigeonsub.sessionMode');
        if (savedMode === 'guest' || savedMode === 'demo') {
          mode = savedMode;
          scope = savedMode;
          isAuthenticated = true;
          setDataSession(mode, scope);
          return;
        }
        token = await getStoredToken();
        if (token) {
          try {
            user = await restoreUserWithinTimeout();
            isAuthenticated = true;
          } catch (error) {
            if (isExplicitlyInvalidToken(error)) {
              token = null;
              try {
                await clearStoredToken();
              } catch {
                // A secondary SecureStore failure must not block startup.
              }
            } else {
              // Preserve a potentially valid local session during timeouts,
              // network failures and server errors. Late auth.me responses are
              // ignored because only the bounded race updates local state.
              isAuthenticated = true;
            }
          }
        }
      } catch {
        // SecureStore could not be read. Do not attempt destructive cleanup.
      } finally {
        if (token) {
          mode = 'account';
          scope = user
            ? `account:${user.id}`
            : ((await AsyncStorage.getItem('pigeonsub.lastAccountScope').catch(
                () => null,
              )) ?? 'account:pending');
        }
        if (user && mode === 'account') {
          await AsyncStorage.setItem('pigeonsub.lastAccountScope', scope).catch(
            () => undefined,
          );
        }
        setDataSession(mode, scope);
        if (!cancelled) {
          setState({
            mode,
            scope,
            user,
            token,
            isLoading: false,
            isAuthenticated,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthResponse = useCallback(async (token: string, user: User) => {
    await setStoredToken(token);
    const scope = `account:${user.id}`;
    await AsyncStorage.multiSet([
      ['pigeonsub.sessionMode', 'account'],
      ['pigeonsub.lastAccountScope', scope],
    ]);
    setDataSession('account', scope);
    setState({
      user,
      token,
      mode: 'account',
      scope,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await auth.login({ email, password });
      await handleAuthResponse(res.token, res.user);
    },
    [handleAuthResponse],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await auth.register({ name, email, password });
      await handleAuthResponse(res.token, res.user);
    },
    [handleAuthResponse],
  );

  const startLocal = useCallback(async (mode: 'guest' | 'demo') => {
    if (mode === 'demo') await seedDemo();
    await AsyncStorage.setItem('pigeonsub.sessionMode', mode);
    setDataSession(mode, mode);
    setState({
      user: null,
      token: null,
      mode,
      scope: mode,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);
  const demoLogin = useCallback(() => startLocal('demo'), [startLocal]);
  const startGuest = useCallback(() => startLocal('guest'), [startLocal]);

  const logout = useCallback(async () => {
    await clearStoredToken();
    await startLocal('guest');
  }, [startLocal]);

  const deleteAccount = useCallback(async () => {
    if (state.mode !== 'account') return;
    await auth.deleteAccount();
    await clearAccountFollowUps(state.scope);
    await logout();
  }, [state.mode, state.scope, logout]);

  const refreshUser = useCallback(async () => {
    const user = await auth.me();
    setState((s) => ({ ...s, user }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        demoLogin,
        startGuest,
        logout,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
