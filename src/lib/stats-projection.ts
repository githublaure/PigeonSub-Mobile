import type { Subscription } from './api';
import {
  dayKey,
  isEnded,
  monthlyCost,
  firstPayment,
  type FollowUps,
} from './subscription-math';
// Equivalent recurring cost at each month's end, not a bank-payment history.
export function costProjection(
  subs: Subscription[],
  follow: FollowUps,
  months: number,
  now = new Date(),
) {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 12);
    return {
      month: dayKey(date).slice(0, 7),
      label: date.toLocaleDateString('fr-FR', { month: 'short' }),
      amount: subs
        .filter(
          (s) =>
            !isEnded(s, follow[s.id], date) &&
            (!s.isTrial ||
              (!!firstPayment(s) && dayKey(firstPayment(s)!) <= dayKey(date))),
        )
        .reduce((sum, s) => sum + monthlyCost(s), 0),
    };
  });
}
