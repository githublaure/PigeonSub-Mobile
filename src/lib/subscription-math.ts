import type { Subscription } from './api';

export type Decision = 'keep' | 'cancel_requested' | 'cancel_confirmed';
export interface FollowUp {
  decision?: Decision;
  decidedAt?: string;
  effectiveOn?: string;
  confirmationNote?: string;
  noticeDays?: number;
  leadDays?: number;
  reminderEnabled?: boolean;
  advancedReminder?: boolean;
  history?: { decision: Decision; at: string; effectiveOn?: string }[];
}
export type FollowUps = Record<string, FollowUp>;
export const FREE_LIMIT = 5;
export const frequencyLabels: Record<string, string> = {
  monthly: 'mois',
  yearly: 'an',
  weekly: 'semaine',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  lifetime: 'une fois',
};
export const euro = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    value,
  );
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
// Calendar dates are deliberately parsed locally: a UTC midnight must not move a due date by one day.
export function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : null;
}
export function addDays(date: Date, count: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}
export const shortDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : 'À renseigner';
export function monthlyCost(
  sub: Pick<Subscription, 'price' | 'frequency'>,
): number {
  const price = Number(sub.price.replace(',', '.'));
  if (!Number.isFinite(price) || price < 0) return 0;
  const factor: Record<string, number> = {
    monthly: 1,
    yearly: 1 / 12,
    weekly: 52 / 12,
    quarterly: 1 / 3,
    semiannual: 1 / 6,
    lifetime: 0,
  };
  return price * (factor[sub.frequency] ?? 0);
}
function cycleDate(
  anchor: Date,
  frequency: string,
  cycle: number,
): Date | null {
  if (frequency === 'weekly') return addDays(anchor, cycle * 7);
  const months = (
    { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 } as Record<
      string,
      number
    >
  )[frequency];
  if (!months) return null;
  const first = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + months * cycle,
    1,
    12,
  );
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(anchor.getDate(), last));
  return first;
}
export function nextRenewal(sub: Subscription, now = new Date()): Date | null {
  if (!sub.isActive || sub.frequency === 'lifetime') return null;
  const trial = sub.isTrial ? parseDay(sub.trialEndsAt) : null;
  const anchor = trial ?? parseDay(sub.nextRenewal);
  if (!anchor) return null;
  const today = dayKey(now);
  if (dayKey(anchor) >= today) return anchor;
  for (let cycle = 1; cycle <= 5200; cycle++) {
    const date = cycleDate(anchor, sub.frequency, cycle);
    if (!date) return null;
    if (dayKey(date) >= today) return date;
  }
  return null;
}
export function isEnded(
  sub: Subscription,
  follow: FollowUp = {},
  now = new Date(),
): boolean {
  return (
    !sub.isActive ||
    (follow.decision === 'cancel_confirmed' &&
      !!follow.effectiveOn &&
      follow.effectiveOn <= dayKey(now))
  );
}
export function deadlines(
  sub: Subscription,
  follow: FollowUp = {},
  now = new Date(),
) {
  const renewal = nextRenewal(sub, now);
  if (!renewal || isEnded(sub, follow, now))
    return { renewal: null, actionBy: null, safety: null };
  if (
    follow.decision === 'cancel_confirmed' &&
    follow.effectiveOn &&
    dayKey(renewal) >= follow.effectiveOn
  )
    return { renewal: null, actionBy: null, safety: null };
  const actionBy = addDays(renewal, -(follow.noticeDays ?? 0));
  const selected = sub.useSafetyDate ? parseDay(sub.safetyDate) : null;
  const anchor =
    (sub.isTrial ? parseDay(sub.trialEndsAt) : null) ??
    parseDay(sub.nextRenewal);
  // Preserve the selected calendar-day offset on subsequent renewals (including DST).
  const daysBetween = (a: Date, b: Date) =>
    Math.round(
      (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
        Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
        86400000,
    );
  const custom =
    selected && anchor && selected <= anchor
      ? addDays(renewal, -daysBetween(anchor, selected))
      : null;
  const safety = custom
    ? new Date(Math.min(custom.getTime(), actionBy.getTime()))
    : addDays(actionBy, -(follow.leadDays ?? 1));
  return { renewal, actionBy, safety };
}
export function overview(
  subs: Subscription[],
  follow: FollowUps,
  now = new Date(),
) {
  let monthly = 0,
    potentialAnnual = 0,
    confirmedAnnual = 0,
    active = 0;
  for (const sub of subs) {
    const item = follow[sub.id] ?? {};
    if (!isEnded(sub, item, now)) {
      monthly += monthlyCost(sub);
      active++;
    }
    if (item.decision === 'cancel_requested' && sub.isActive)
      potentialAnnual += monthlyCost(sub) * 12;
    if (item.decision === 'cancel_confirmed')
      confirmedAnnual += monthlyCost(sub) * 12;
  }
  return {
    monthly,
    annual: monthly * 12,
    potentialAnnual,
    confirmedAnnual,
    active,
  };
}
export function canAddSubscription(
  subs: Subscription[],
  plus: boolean,
  follow: FollowUps = {},
): boolean {
  return (
    plus ||
    subs.filter((sub) => !isEnded(sub, follow[sub.id])).length < FREE_LIMIT
  );
}

/** Stable free slots after a downgrade. Archived records remain readable. */
export function canCustomizeSubscription(
  sub: Subscription,
  all: Subscription[],
  plus: boolean,
  follow: FollowUps = {},
  now = new Date(),
): boolean {
  if (plus) return true;
  return all
    .filter((s) => !isEnded(s, follow[s.id], now))
    .slice()
    .sort(
      (a, b) =>
        (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id - b.id,
    )
    .slice(0, FREE_LIMIT)
    .some((s) => s.id === sub.id);
}
