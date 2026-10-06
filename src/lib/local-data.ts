import { clearPhotos } from './subscription-photos';
import {
  demoOffers,
  validateOffer,
  type SavedOffer,
  type OfferDraft,
} from './offers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  InsertSubscription,
  Stats,
  Subscription,
  UserSettings,
} from './api';
import {
  addDays,
  dayKey,
  deadlines,
  monthlyCost,
  currentMonthlyCost,
  overview,
  type FollowUp,
  type FollowUps,
} from './subscription-math';

export type SessionMode = 'none' | 'guest' | 'demo' | 'account';
let scope = 'none';
let mode: SessionMode = 'none';
const listeners = new Set<() => void>();
export const dataChanged = () => listeners.forEach((fn) => fn());
export function onDataChanged(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function setDataSession(nextMode: SessionMode, nextScope: string) {
  mode = nextMode;
  scope = nextScope;
  dataChanged();
}
export const getDataSession = () => ({ mode, scope });
export const isLocalSession = () => mode === 'guest' || mode === 'demo';
const key = (part: string, namespace = scope) =>
  `pigeonsub.v2.${namespace}.${part}`;
export async function readJSON<T>(name: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(name);
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(
      'Données locales illisibles. Elles ont été conservées ; contactez le support.',
    );
  }
}
let queue: Promise<unknown> = Promise.resolve();
// Serialize read-modify-write transactions, including rapid taps on different cards.
function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}
export const getFollowUps = (namespace = scope) =>
  readJSON<FollowUps>(key('followups', namespace), {});
export function updateFollowUp(id: number, patch: FollowUp): Promise<void> {
  const namespace = scope;
  return transaction(async () => {
    const all = await getFollowUps(namespace);
    const before = all[id] ?? {};
    const next = { ...before, ...patch };
    if (patch.decision)
      next.history = [
        ...(before.history ?? []),
        {
          decision: patch.decision,
          at: new Date().toISOString(),
          effectiveOn: patch.effectiveOn,
        },
      ];
    all[id] = next;
    await AsyncStorage.setItem(
      key('followups', namespace),
      JSON.stringify(all),
    );
    if (namespace === scope) dataChanged();
  });
}
export async function clearAccountFollowUps(namespace: string) {
  await clearPhotos(namespace);
  await AsyncStorage.removeItem(key('followups', namespace));
  await AsyncStorage.removeItem(key('offers', namespace));
}
interface LocalData {
  subscriptions: Subscription[];
  settings: UserSettings;
  nextId: number;
}
const empty = (): LocalData => ({
  subscriptions: [],
  settings: { budgetCap: null, monthlyOverrides: null },
  nextId: 1,
});
function subscription(data: InsertSubscription, id: number): Subscription {
  return {
    id,
    userId: 0,
    categoryColor: '#7C3AED',
    usageFrequency: 'used',
    nextRenewal: null,
    safetyDate: null,
    iconClass: null,
    bgColor: null,
    note: null,
    purchaseProofImage: null,
    unsubscribeProofImage: null,
    rating: null,
    isSuspect: false,
    isFlagged: false,
    useSafetyDate: false,
    isActive: true,
    isTrial: false,
    trialEndsAt: null,
    purchaseDate: null,
    createdAt: new Date().toISOString(),
    ...data,
  };
}
export const getSavedOffers = (namespace = scope) =>
  readJSON<SavedOffer[]>(
    key('offers', namespace),
    namespace === 'demo' ? demoOffers() : [],
  );
export function saveOffer(draft: OfferDraft, id?: string): Promise<void> {
  const namespace = scope;
  const checked = validateOffer(draft);
  return transaction(async () => {
    const rows = await getSavedOffers(namespace);
    const index = id ? rows.findIndex((o) => o.id === id) : -1;
    if (id && index < 0) throw new Error('Offre introuvable.');
    if (index >= 0) rows[index] = { ...rows[index], ...checked };
    else
      rows.push({
        ...checked,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        used: false,
      });
    await AsyncStorage.setItem(key('offers', namespace), JSON.stringify(rows));
    if (scope === namespace) dataChanged();
  });
}
export function changeOffer(
  id: string,
  action: 'used' | 'saved' | 'delete',
): Promise<void> {
  const namespace = scope;
  return transaction(async () => {
    const rows = await getSavedOffers(namespace);
    const found = rows.find((o) => o.id === id);
    if (!found) throw new Error('Offre introuvable.');
    found.used = action === 'used';
    await AsyncStorage.setItem(
      key('offers', namespace),
      JSON.stringify(
        action === 'delete' ? rows.filter((o) => o.id !== id) : rows,
      ),
    );
    if (scope === namespace) dataChanged();
  });
}
export async function seedDemo() {
  await clearPhotos('demo');
  const now = new Date();
  await AsyncStorage.setItem(
    key('offers', 'demo'),
    JSON.stringify(demoOffers(now)),
  );
  const rows = [
    ['Netflix', '13.49', 'monthly', 'entertainment', 3, 'rarely_used'],
    ['Spotify', '11.99', 'monthly', 'entertainment', 6, 'very_used'],
    ['Salle de sport', '29.90', 'monthly', 'health', 32, 'rarely_used'],
    ['iCloud+', '2.99', 'monthly', 'utilities', 12, 'used'],
    ['Canva Pro', '109.99', 'yearly', 'productivity', 18, 'used'],
    ['Magazine', '8.90', 'monthly', 'news', 9, 'rarely_used'],
  ] as const;
  const data: LocalData = {
    nextId: 7,
    settings: { budgetCap: '50', monthlyOverrides: null },
    subscriptions: rows.map((r, i) =>
      subscription(
        {
          name: r[0],
          price: r[1],
          frequency: r[2],
          category: r[3],
          nextRenewal: dayKey(addDays(now, r[4])),
          usageFrequency: r[5],
          rating: [2, 5, 1, 4, 4, 2][i],
          isTrial: i === 4,
          trialEndsAt: i === 4 ? dayKey(addDays(now, 4)) : null,
          note: 'Exemple fictif pour découvrir PigeonSub.',
          isActive: i !== 5,
        },
        i + 1,
      ),
    ),
  };
  await AsyncStorage.setItem(key('data', 'demo'), JSON.stringify(data));
  await AsyncStorage.setItem(
    key('followups', 'demo'),
    JSON.stringify({
      1: {
        decision: 'cancel_requested',
        decidedAt: now.toISOString(),
        noticeDays: 0,
        leadDays: 2,
      },
      2: { decision: 'keep', decidedAt: now.toISOString() },
      3: { noticeDays: 30, leadDays: 1 },
      6: {
        decision: 'cancel_confirmed',
        decidedAt: addDays(now, -10).toISOString(),
        effectiveOn: dayKey(addDays(now, -2)),
        confirmationNote: 'Confirmation fictive reçue par e-mail.',
      },
    }),
  );
}
export async function localRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const namespace = scope;
  if (!isLocalSession()) throw new Error('Session locale indisponible.');
  return transaction(async () => {
    const data = await readJSON<LocalData>(key('data', namespace), empty());
    const url = new URL(path, 'https://local.invalid');
    const route = url.pathname;
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(String(options.body)) : {};
    let result: unknown;
    if (route === '/subscriptions' && method === 'GET')
      result = data.subscriptions.filter(
        (s) => url.searchParams.get('includeArchived') === 'true' || s.isActive,
      );
    else if (route === '/subscriptions' && method === 'POST') {
      const item = subscription(body, data.nextId++);
      data.subscriptions.push(item);
      result = item;
    } else if (/^\/subscriptions\/upcoming\//.test(route)) {
      const until = dayKey(addDays(new Date(), Number(route.split('/').pop())));
      result = data.subscriptions.filter((s) => {
        const d = deadlines(s).renewal;
        return d && dayKey(d) <= until;
      });
    } else if (/^\/subscriptions\/\d+$/.test(route)) {
      const id = Number(route.split('/').pop());
      const index = data.subscriptions.findIndex((s) => s.id === id);
      if (index < 0) throw new Error('Abonnement introuvable.');
      if (method === 'DELETE') {
        data.subscriptions.splice(index, 1);
      } else if (method === 'PUT') {
        data.subscriptions[index] = { ...data.subscriptions[index], ...body };
        result = data.subscriptions[index];
      } else result = data.subscriptions[index];
    } else if (route === '/settings') result = data.settings;
    else if (route === '/settings/budget') {
      data.settings.budgetCap = String(body.budgetCap);
      result = { budgetCap: data.settings.budgetCap };
    } else if (route === '/settings/monthly-overrides') {
      data.settings.monthlyOverrides = body.monthlyOverrides;
      result = { monthlyOverrides: body.monthlyOverrides };
    } else if (route === '/settings/budgets') {
      if (method === 'PUT') {
        data.settings.budgetCap = String(body.defaultBudget);
        data.settings.monthlyOverrides = Object.fromEntries(
          body.budgets.map((b: { month: string; amount: number }) => [
            b.month,
            String(b.amount),
          ]),
        );
        result = {
          success: true,
          defaultBudget: body.defaultBudget,
          monthlyBudgets: body.budgets,
        };
      } else {
        const start = String(
          url.searchParams.get('start') ?? dayKey(new Date()).slice(0, 7),
        );
        const months = Array.from(
          {
            length: Math.min(Number(url.searchParams.get('months') ?? 12), 24),
          },
          (_, i) => {
            const [y, m] = start.split('-').map(Number);
            return dayKey(new Date(y, m - 1 + i, 1)).slice(0, 7);
          },
        );
        result = {
          defaultBudget: Number(data.settings.budgetCap) || null,
          months,
          monthlyBudgets: months.map((month) => ({
            month,
            amount: Number(
              data.settings.monthlyOverrides?.[month] ??
                data.settings.budgetCap ??
                0,
            ),
          })),
        };
      }
    } else if (route === '/stats') {
      const follow = await getFollowUps(namespace);
      const summary = overview(data.subscriptions, follow);
      const stats: Stats = {
        totalMonthlyCost: summary.monthly.toFixed(2),
        activeSubscriptions: summary.active,
        upcomingRenewals: 0,
        trialsEnding: 0,
        trialCount: 0,
        suspectMonthly: '0',
        wastedEstimate: summary.potentialAnnual
          ? (summary.potentialAnnual / 12).toFixed(2)
          : '0',
        budgetCap: Number(data.settings.budgetCap ?? 0),
        budgetGap: '0',
        suspectCount: 0,
        categoryTotals: {},
        usageBreakdown: { very_used: 0, used: 0, rarely_used: 0 },
      };
      for (const sub of data.subscriptions.filter((s) => s.isActive)) {
        stats.categoryTotals[sub.category] =
          (stats.categoryTotals[sub.category] ?? 0) + currentMonthlyCost(sub);
        stats.usageBreakdown[sub.usageFrequency] =
          (stats.usageBreakdown[sub.usageFrequency] ?? 0) + 1;
      }
      result = stats;
    } else
      throw new Error(
        'Cette fonction nécessite un compte connecté. Vos données locales sont conservées.',
      );
    if (method !== 'GET') {
      await AsyncStorage.setItem(key('data', namespace), JSON.stringify(data));
      if (namespace === scope) dataChanged();
    }
    return result as T;
  });
}
