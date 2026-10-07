import type { Subscription } from './api';
import { addDays, dayKey, deadlines, firstPayment, isEnded, parseDay, type FollowUps } from './subscription-math';
export function calendarEvents(subs: Subscription[], follow: FollowUps, first: Date, last: Date, now = new Date()) {
  const events: { day: string; kind: string; name: string; id: number; price: string }[] = [];
  for (const sub of subs) {
    if (isEnded(sub, follow[sub.id], now)) continue;
    let cursor = new Date(Math.max(first.getTime(), new Date(now).setHours(0, 0, 0, 0)));
    const horizon = addDays(last, Math.max(366, (follow[sub.id]?.noticeDays ?? 0) + (follow[sub.id]?.leadDays ?? 1)));
    for (let cycle = 0; cycle < 160; cycle++) {
      const d = deadlines(sub, follow[sub.id], cursor);
      if (!d.renewal || d.renewal > horizon) break;
      for (const [date, kind] of [
        [d.renewal, sub.isTrial ? 'Fin de l’essai' : 'Prélèvement'],
        [sub.isTrial && firstPayment(sub) && parseDay(sub.trialEndsAt) && dayKey(firstPayment(sub)!) !== dayKey(parseDay(sub.trialEndsAt)!) ? firstPayment(sub) : null, 'Premier prélèvement prévu'],
        [d.safety, 'Date de sûreté'],
      ] as const) {
        if (date && dayKey(date) >= dayKey(first) && dayKey(date) <= dayKey(last)) events.push({ day: dayKey(date), kind, name: sub.name, id: sub.id, price: sub.price });
      }
      if (sub.isTrial) break;
      cursor = addDays(d.renewal, 1);
    }
  }
  return events;
}
