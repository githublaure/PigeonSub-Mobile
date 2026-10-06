import type { Subscription } from './api';
import { currentMonthlyCost, isEnded, type FollowUps } from './subscription-math';

export const STATS_VIEWS = [
  { id: 'current', label: 'Coût actuel', plus: false },
  { id: 'cancellations', label: 'Après mes résiliations', plus: false },
  { id: 'underused', label: 'Sans les peu utilisés', plus: true },
  { id: 'low_rated', label: 'Sans les notes 1–2 étoiles', plus: true },
  { id: 'optimized', label: 'Vue combinée', plus: true },
] as const;
export type StatsView = (typeof STATS_VIEWS)[number]['id'];
export function availableStatsView(view: StatsView, plus: boolean): StatsView {
  return STATS_VIEWS.find((v) => v.id === view && (!v.plus || plus))?.id ?? 'current';
}
export function statsScenario(subs: Subscription[], follow: FollowUps, view: StatsView, now = new Date()) {
  const excluded = subs.filter((sub) => {
    if (isEnded(sub, follow[sub.id], now)) return false;
    const cancelling = follow[sub.id]?.decision === 'cancel_requested' || follow[sub.id]?.decision === 'cancel_confirmed';
    const underused = sub.usageFrequency === 'rarely_used';
    const lowRated = sub.rating !== null && sub.rating >= 1 && sub.rating <= 2;
    return view === 'cancellations' ? cancelling
      : view === 'underused' ? underused
      : view === 'low_rated' ? lowRated
      : view === 'optimized' ? cancelling || underused || lowRated
      : false;
  });
  const excludedIds = new Set(excluded.map((s) => s.id));
  const included = subs.filter((s) => !excludedIds.has(s.id));
  const current = subs.filter((s) => !isEnded(s, follow[s.id], now)).reduce((sum, s) => sum + currentMonthlyCost(s), 0);
  const monthly = included.filter((s) => !isEnded(s, follow[s.id], now)).reduce((sum, s) => sum + currentMonthlyCost(s), 0);
  return { included, excluded, current, monthly, avoidedMonthly: Math.max(0, current - monthly) };
}
export function parseMonthlyBudget(text: string): number {
  const value = text.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 1_000_000)
    throw new Error('Saisissez un budget positif ou nul, avec 2 décimales maximum.');
  return Number(value);
}
