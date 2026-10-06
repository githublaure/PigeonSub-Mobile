import { subscriptions, type Subscription } from './api';
import { getDataSession, getFollowUps } from './local-data';
import { hasPlusAccess } from './entitlements-state';
import { addPhotos, type PendingPhoto } from './subscription-photos';

export async function saveFormPhotos(scope: string, sub: Subscription, photos: PendingPhoto[]) {
  if (!photos.length) return;
  if (getDataSession().scope !== scope) throw new Error('La session a changé.');
  const [all, follow] = await Promise.all([subscriptions.list(true), getFollowUps(scope)]);
  const current = all.find((item) => item.id === sub.id);
  if (!current || getDataSession().scope !== scope) throw new Error('Abonnement indisponible.');
  try { await addPhotos(scope, current, all, follow, hasPlusAccess(), photos); }
  catch (e) {
    throw new Error(`Abonnement enregistré, photos non enregistrées. ${e instanceof Error ? e.message : 'Réessayez.'} Vous pouvez réessayer ici sans créer de doublon.`);
  }
}
