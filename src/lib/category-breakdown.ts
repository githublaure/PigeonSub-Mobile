import type { Subscription } from './api';
import {
  currentMonthlyCost, isEnded, lifetimeAmortization,
  type FollowUps, type LifetimeAmortization,
} from './subscription-math';

export type CategoryCost = {
  sub: Subscription;
  monthly: number;
  amortization: LifetimeAmortization | null;
};
export type CategoryGroup = {
  key: string;
  monthly: number;
  share: number;
  percent: number;
  items: CategoryCost[];
};
export type CategoryBreakdown = ReturnType<typeof categoryBreakdown>;

/** Pass the selected scenario's included records; filters are never applied twice. */
export function categoryBreakdown(
  subs: Subscription[],
  follow: FollowUps,
  { includeLifetime = false, now = new Date(), recurringCost = currentMonthlyCost }: {
    includeLifetime?: boolean;
    now?: Date;
    // An independently computed recurring simulation (e.g. future Family view)
    // can supply its basis. No family contributions are inferred here.
    recurringCost?: (sub: Subscription) => number;
  } = {},
) {
  const byCategory = new Map<string, CategoryCost[]>();
  const missingDates: Subscription[] = [];
  let recurringMonthly = 0, amortizedMonthly = 0;
  for (const sub of subs) {
    if (isEnded(sub, follow[sub.id], now) || sub.isTrial) continue;
    let amortization: LifetimeAmortization | null = null;
    let monthly = 0;
    if (sub.frequency === 'lifetime') {
      if (!includeLifetime) continue;
      amortization = lifetimeAmortization(sub, now);
      if (amortization.status === 'missing_date') missingDates.push(sub);
      monthly = amortization.monthly;
    } else {
      const cost = recurringCost(sub);
      monthly = Number.isFinite(cost) && cost > 0 ? cost : 0;
    }
    if (monthly <= 0) continue;
    if (amortization) amortizedMonthly += monthly;
    else recurringMonthly += monthly;
    const key = sub.category || 'other';
    const items = byCategory.get(key) ?? [];
    items.push({ sub, monthly, amortization });
    byCategory.set(key, items);
  }
  const groups: CategoryGroup[] = [...byCategory].map(([key, items]) => ({
    key, items: items.sort((a, b) => b.monthly - a.monthly || a.sub.id - b.sub.id),
    monthly: items.reduce((sum, item) => sum + item.monthly, 0), share: 0, percent: 0,
  })).sort((a, b) => b.monthly - a.monthly || a.key.localeCompare(b.key));
  const monthly = groups.reduce((sum, group) => sum + group.monthly, 0);
  for (const group of groups) {
    group.share = group.monthly / monthly;
    group.percent = Math.floor(group.share * 100);
  }
  // Largest-remainder rounding: visible percentages sum to 100, while the ring
  // uses the exact, unrounded shares. Stable ties follow category display order.
  const remainder = 100 - groups.reduce((sum, group) => sum + group.percent, 0);
  [...groups].sort((a, b) => (b.share * 100 - b.percent) - (a.share * 100 - a.percent))
    .slice(0, remainder).forEach(group => group.percent++);
  return { groups, monthly, recurringMonthly, amortizedMonthly, missingDates };
}
