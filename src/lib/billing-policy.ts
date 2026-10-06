import type { PurchasesPackage } from 'react-native-purchases';
export function hasSevenDayTrial(
  item: PurchasesPackage | undefined,
  eligible: Record<string, boolean>,
): boolean {
  const intro = item?.product.introPrice;
  return (
    !!item &&
    eligible[item.product.identifier] === true &&
    intro?.price === 0 &&
    intro.cycles === 1 &&
    ((intro.periodUnit === 'DAY' && intro.periodNumberOfUnits === 7) ||
      (intro.periodUnit === 'WEEK' && intro.periodNumberOfUnits === 1))
  );
}
