import type { Subscription } from './api';
import { addDays, dayKey, isEnded, monthlyCost, nextRenewal, type FollowUps } from './subscription-math';

export const SUBSCRIPTION_VIEWS = [
  { id: 'active', label: 'Actifs' }, { id: 'soon', label: 'Sous 7 jours' },
  { id: 'trials', label: 'Essais' }, { id: 'underused', label: 'Peu utilisés' },
  { id: 'low_rated', label: 'Notes 1–2' }, { id: 'cancelling', label: 'À résilier' },
  { id: 'archived', label: 'Archives' },
] as const;
export type SubscriptionView = (typeof SUBSCRIPTION_VIEWS)[number]['id'];
export function filterSubscriptions(subs: Subscription[], follow: FollowUps, view: SubscriptionView, now = new Date()) {
  return subs.filter(sub => {
    const ended = isEnded(sub, follow[sub.id], now);
    if (view === 'archived') return ended;
    if (ended) return false;
    if (view === 'trials') return sub.isTrial;
    if (view === 'underused') return sub.usageFrequency === 'rarely_used';
    if (view === 'low_rated') return sub.rating !== null && sub.rating >= 1 && sub.rating <= 2;
    if (view === 'cancelling') return follow[sub.id]?.decision === 'cancel_requested';
    if (view === 'soon') {
      const renewal = nextRenewal(sub, now);
      return !!renewal && dayKey(renewal) <= dayKey(addDays(now, 7));
    }
    return true;
  });
}
export function reviewCandidates(subs: Subscription[], follow: FollowUps, now = new Date()) {
  return subs.filter(sub => !isEnded(sub, follow[sub.id], now) && monthlyCost(sub) > 0
    && !['keep', 'cancel_confirmed'].includes(follow[sub.id]?.decision ?? '')
    && (sub.usageFrequency === 'rarely_used' || (sub.rating !== null && sub.rating >= 1 && sub.rating <= 2) || follow[sub.id]?.decision === 'cancel_requested'))
    .sort((a, b) => (nextRenewal(a, now)?.getTime() ?? Infinity) - (nextRenewal(b, now)?.getTime() ?? Infinity) || monthlyCost(b) - monthlyCost(a));
}
export function budgetUsage(amount: number, budget: number | null) {
  const ratio = budget === null ? 0 : budget > 0 ? amount / budget : amount > 0 ? 1 : 0;
  return { percent: Math.max(0, Math.min(100, ratio * 100)), over: budget !== null ? Math.max(0, amount - budget) : 0 };
}
