import type { Subscription } from './api';
import {
  addDays,
  canCustomizeSubscription,
  dayKey,
  deadlines,
  type FollowUps,
} from './subscription-math';
export function reminderPlan(
  subs: Subscription[],
  followUps: FollowUps,
  plus: boolean,
  now = new Date(),
) {
  const reminders: {
    subscriptionId: number;
    name: string;
    at: Date;
    renewal: string;
  }[] = [];
  for (const sub of subs) {
    const follow = followUps[sub.id] ?? {};
    if (
      !follow.reminderEnabled ||
      !canCustomizeSubscription(sub, subs, plus, followUps, now)
    )
      continue;
    let cursor = now;
    for (let cycle = 0; cycle < 12; cycle++) {
      const dates = deadlines(sub, follow, cursor);
      if (!dates.renewal || !dates.actionBy) break;
      if (!dates.safety) break;
      const at = new Date(dates.safety);
      at.setHours(9, 0, 0, 0);
      if (at.getTime() > now.getTime())
        reminders.push({
          subscriptionId: sub.id,
          name: sub.name,
          at,
          renewal: dayKey(dates.renewal),
        });
      cursor = addDays(dates.renewal, 1);
    }
  }
  // Stay below iOS's pending-notification limit, giving the nearest dates priority across all subscriptions.
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}
