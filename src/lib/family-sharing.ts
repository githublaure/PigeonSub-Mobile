import type { Subscription } from './api';
import { monthlyCost, priceAmount } from './subscription-math';
export { validateFamilySharing } from '../../shared/family-sharing';
export type { FamilySharing, FamilySharingInput } from '../../shared/family-sharing';

export function familySeats(sub: Subscription): number | null {
  const family = sub.familySharing;
  if (!family?.shareable || family.totalSeats === null || family.occupiedSeats === null) return null;
  return Math.max(0, family.totalSeats - family.occupiedSeats);
}

/** Analytical amounts only: never used by budgets, renewals or confirmed savings. */
export function familyCost(sub: Subscription, gross: number) {
  const family = sub.familySharing;
  const compatible = family?.shareable && family.frequency === sub.frequency;
  const factor = sub.frequency === 'lifetime' ? 1 / 12 : monthlyCost({ ...sub, price: '1' });
  const contribution = compatible ? Math.min(gross, priceAmount(family.receivedContribution) * factor) : 0;
  const net = Math.max(0, gross - contribution);
  const free = familySeats(sub);
  const potential = compatible && free !== null ? Math.min(net, free * priceAmount(family.estimatedContribution) * factor) : 0;
  return { gross, contribution, net, potential };
}
