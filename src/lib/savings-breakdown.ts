import type { Subscription } from './api';
import { euro, monthlyCost, type FollowUps } from './subscription-math';

export function savingsBreakdown(subscriptions: Subscription[], follow: FollowUps) {
  const rows = subscriptions.map((sub) => ({ sub, annual: monthlyCost(sub) * 12 }));
  return {
    pending: rows.filter(({ sub }) => sub.isActive && follow[sub.id]?.decision === 'cancel_requested'),
    confirmed: rows.filter(({ sub }) => follow[sub.id]?.decision === 'cancel_confirmed'),
  };
}

/** Show the actual billing interval, avoiding rounding an annual plan to months. */
export function annualSavingsCalculation(sub: Subscription): string {
  const multipliers: Record<string, string> = {
    weekly: '52 semaines', monthly: '12 mois', quarterly: '4 trimestres',
    semiannual: '2 semestres', yearly: '1 an',
  };
  const multiplier = multipliers[sub.frequency];
  return multiplier
    ? `${euro(Number(sub.price.replace(',', '.')) || 0)} × ${multiplier}`
    : 'Aucun renouvellement récurrent';
}
