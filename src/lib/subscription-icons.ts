import { MAX_ICON_LENGTH, writeSubscriptionIcon } from './subscription-icon-store';
export { MAX_ICON_LENGTH, getSubscriptionIcon, clearSubscriptionIcons } from './subscription-icon-store';
import { hasPlusAccess } from './entitlements-state';
import { dataChanged, getDataSession } from './local-data';

// undefined keeps the current icon; null restores the default icon.
export type IconDraft = string | null | undefined;

export function assertIconChangeAllowed(scope: string, draft: IconDraft) {
  if (getDataSession().scope !== scope || getDataSession().mode === 'none')
    throw new Error('La session a changé.');
  if (draft === undefined || draft === null) return;
  if (!hasPlusAccess()) throw new Error('PLUS_ICON: Les icônes photo sont incluses dans Plus.');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(draft) || draft.length > MAX_ICON_LENGTH)
    throw new Error('Cette icône ne peut pas être enregistrée. Choisissez une autre image.');
}

export async function saveSubscriptionIcon(scope: string, id: number, draft: IconDraft) {
  assertIconChangeAllowed(scope, draft);
  if (draft === undefined) return;
  await writeSubscriptionIcon(scope, id, draft);
  if (getDataSession().scope === scope) dataChanged();
}
