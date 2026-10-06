import { getDataSession } from './local-data';
let plus = false;
let entitlementScope = '';
export function setPlusAccess(value: boolean, scope: string) {
  plus = value;
  entitlementScope = scope;
}
export function hasPlusAccess() {
  const session = getDataSession();
  return (
    session.mode === 'demo' || (plus && session.scope === entitlementScope)
  );
}
