import { clearSubscriptionIcons } from './subscription-icon-store';
import { clearPhotos } from './subscription-photos';
import { Platform } from 'react-native';
import {
  isLocalSession,
  localRequest,
  dataChanged,
  getFollowUps,
  getDataSession,
} from './local-data';
import {
  canAddSubscription,
  canCustomizeSubscription,
  paidTrialPatch,
  isEnded,
} from './subscription-math';
import { hasPlusAccess } from './entitlements-state';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, stripQueryForLog } from './api-url';
import { API_BASE_URL } from './config';

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'pigeonsub_jwt';

export async function getStoredToken(): Promise<string | null> {
  return Platform.OS === 'web'
    ? typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(TOKEN_KEY)
      : null
    : SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setStoredToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearStoredToken(): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<T> {
  if (requireAuth && !path.startsWith('/auth') && isLocalSession())
    return localRequest<T>(path, options);
  if (!API_BASE_URL) {
    throw new ApiError(
      0,
      'API_BASE_URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in mobile/.env',
    );
  }

  const requestScope = getDataSession().scope;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = await getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (requireAuth && getDataSession().scope !== requestScope) throw new Error('La session a changé.');
  const requestUrl = buildApiUrl(API_BASE_URL, path);
  const method = options.method ?? 'GET';
  const diagnosticUrl = stripQueryForLog(requestUrl);

  if (__DEV__) console.info(`[PigeonSub API] ${method} ${diagnosticUrl}`);

  const res = await fetch(requestUrl, {
    ...options,
    headers,
  });

  if (__DEV__)
    console.info(`[PigeonSub API] ${method} ${diagnosticUrl} -> ${res.status}`);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.error ?? body?.message ?? message;
    } catch {}
    throw new ApiError(res.status, message);
  }

  if (method !== 'GET' && !path.startsWith('/auth')) dataChanged();
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types (matching shared/schema.ts)
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Subscription {
  id: number;
  userId: number;
  name: string;
  price: string;
  frequency: string;
  category: string;
  categoryColor: string;
  usageFrequency: string;
  nextRenewal: string | null;
  safetyDate: string | null;
  iconClass: string | null;
  bgColor: string | null;
  note: string | null;
  purchaseProofImage: string | null;
  unsubscribeProofImage: string | null;
  rating: number | null;
  isSuspect: boolean;
  isFlagged: boolean;
  useSafetyDate: boolean;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  purchaseDate: string | null;
  createdAt: string;
}

export interface InsertSubscription {
  name: string;
  price: string;
  frequency: string;
  category: string;
  categoryColor?: string;
  usageFrequency?: string;
  nextRenewal?: string | null;
  safetyDate?: string | null;
  iconClass?: string | null;
  bgColor?: string | null;
  note?: string | null;
  purchaseProofImage?: string | null;
  unsubscribeProofImage?: string | null;
  rating?: number | null;
  isSuspect?: boolean;
  isFlagged?: boolean;
  useSafetyDate?: boolean;
  isActive?: boolean;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  purchaseDate?: string | null;
}

export interface VoiceReminder {
  id: number;
  subscriptionId: number;
  audioUrl: string;
  reminderType: string;
  createdAt: string;
}

export interface UserSettings {
  budgetCap: string | null;
  monthlyOverrides: Record<string, string> | null;
}

export interface Stats {
  /** Numeric string e.g. "45.99" */
  totalMonthlyCost: string;
  activeSubscriptions: number;
  upcomingRenewals: number;
  trialsEnding: number;
  trialCount: number;
  /** Numeric string e.g. "12.00" */
  suspectMonthly: string;
  /** Numeric string e.g. "7.50" */
  wastedEstimate: string;
  budgetCap: number;
  /** Numeric string e.g. "0.00" */
  budgetGap: string;
  suspectCount: number;
  categoryTotals: Record<string, number>;
  usageBreakdown: {
    very_used: number;
    used: number;
    rarely_used: number;
  } & Record<string, number>;
}

export interface BudgetMonth {
  month: string;
  amount: number;
}

export interface BudgetsResponse {
  defaultBudget: number | null;
  months: string[];
  monthlyBudgets: BudgetMonth[];
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export const auth = {
  register: (data: { name: string; email: string; password: string }) =>
    apiFetch<AuthResponse>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    ),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    ),

  demoLogin: () =>
    apiFetch<AuthResponse>('/auth/demo-login', { method: 'POST' }, false),

  me: () => apiFetch<User>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      false,
    ),

  resetPassword: (data: { token: string; newPassword: string }) =>
    apiFetch<{ message: string }>(
      '/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    ),

  deleteAccount: () => apiFetch<void>('/auth/account', { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Subscriptions API
// ---------------------------------------------------------------------------
export const subscriptions = {
  list: (includeArchived = false) =>
    apiFetch<Subscription[]>(
      `/subscriptions?includeArchived=${includeArchived}`,
    ),

  get: (id: number) => apiFetch<Subscription>(`/subscriptions/${id}`),

  confirmTrialPaid: async (id: number) => {
    const previous = await subscriptions.get(id);
    const follow = (await getFollowUps())[id];
    if (isEnded(previous, follow) || follow?.decision === 'cancel_confirmed')
      throw new Error(
        'Cet essai est archivé ou sa résiliation est déjà confirmée.',
      );
    // Recording an observed payment remains free after a downgrade. Only the
    // existing safety offset is carried over; this does not unlock customization.
    return apiFetch<Subscription>(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paidTrialPatch(previous)),
    });
  },

  create: async (data: InsertSubscription) => {
    const expectedScope = getDataSession().scope;
    const all = await subscriptions.list(true);
    if (
      data.isActive !== false &&
      !canAddSubscription(all, hasPlusAccess(), await getFollowUps())
    )
      throw new Error(
        'PLUS_LIMIT: La version gratuite permet 5 abonnements actifs.',
      );
    if (getDataSession().scope !== expectedScope) throw new Error('La session a changé.');
    return apiFetch<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<InsertSubscription>) => {
    if ('safetyDate' in data || 'useSafetyDate' in data) {
      const all = await subscriptions.list(true);
      const previous = all.find((s) => s.id === id);
      const changed =
        previous &&
        (('safetyDate' in data &&
          (data.safetyDate ?? '').slice(0, 10) !==
            (previous.safetyDate ?? '').slice(0, 10)) ||
          ('useSafetyDate' in data &&
            data.useSafetyDate !== previous.useSafetyDate));
      if (
        changed &&
        !canCustomizeSubscription(
          previous!,
          all,
          hasPlusAccess(),
          await getFollowUps(),
        )
      )
        throw new Error(
          'PLUS_LIMIT: Les dates de sûreté sont incluses pour vos 5 abonnements gratuits.',
        );
    }
    if (data.isActive) {
      const all = await subscriptions.list(true);
      const previous = all.find((s) => s.id === id);
      if (
        !previous?.isActive &&
        !canAddSubscription(all, hasPlusAccess(), await getFollowUps())
      )
        throw new Error(
          'PLUS_LIMIT: La version gratuite permet 5 abonnements actifs.',
        );
    }
    return apiFetch<Subscription>(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  remove: async (id: number) => {
    const scope = getDataSession().scope;
    await apiFetch<void>(`/subscriptions/${id}`, { method: 'DELETE' });
    await clearPhotos(scope, id);
    await clearSubscriptionIcons(scope, id);
  },

  upcoming: (days: number) =>
    apiFetch<Subscription[]>(`/subscriptions/upcoming/${days}`),
};

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------
export const settings = {
  get: () => apiFetch<UserSettings>('/settings'),

  setBudget: (budgetCap: number) =>
    apiFetch<{ budgetCap: string }>('/settings/budget', {
      method: 'PUT',
      body: JSON.stringify({ budgetCap }),
    }),

  setMonthlyOverrides: (monthlyOverrides: Record<string, number>) =>
    apiFetch<{ monthlyOverrides: Record<string, string> }>(
      '/settings/monthly-overrides',
      {
        method: 'PATCH',
        body: JSON.stringify({ monthlyOverrides }),
      },
    ),

  getBudgets: (start: string, months: number) =>
    apiFetch<BudgetsResponse>(
      `/settings/budgets?start=${start}&months=${months}`,
    ),

  setBudgets: (data: { budgets: BudgetMonth[]; defaultBudget: number }) =>
    apiFetch<{
      success: boolean;
      defaultBudget: number;
      monthlyBudgets: BudgetMonth[];
    }>('/settings/budgets', { method: 'PUT', body: JSON.stringify(data) }),
};

// ---------------------------------------------------------------------------
// Stats API
// ---------------------------------------------------------------------------
export const statsApi = {
  get: (opts?: { includeArchived?: boolean; includeLifetime?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.includeArchived) params.set('includeArchived', 'true');
    if (opts?.includeLifetime) params.set('includeLifetime', 'true');
    const qs = params.toString();
    return apiFetch<Stats>(`/stats${qs ? `?${qs}` : ''}`);
  },
};

// ---------------------------------------------------------------------------
// Voice API
// ---------------------------------------------------------------------------
export const voice = {
  generate: (
    data: {
      subscriptionId: number;
      reminderType: string;
      text?: string;
      voiceName?: string;
    },
    elevenLabsKey: string,
  ) =>
    apiFetch<VoiceReminder>('/voice/generate', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'x-elevenlabs-key': elevenLabsKey } as Record<string, string>,
    }),

  getReminders: (subscriptionId: number) =>
    apiFetch<VoiceReminder[]>(`/voice/reminders/${subscriptionId}`),

  getAllReminders: () => apiFetch<VoiceReminder[]>('/voice/reminders'),
};

export const roadmapVotes = {
  get: () => apiFetch<string[]>('/roadmap'),
  set: (feature: string, interested: boolean) => apiFetch<{ interested: boolean }>(`/roadmap/${encodeURIComponent(feature)}`, { method: 'PUT', body: JSON.stringify({ interested }) }),
};
