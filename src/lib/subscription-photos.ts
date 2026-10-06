import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription } from './api';
import { canCustomizeSubscription, type FollowUps } from './subscription-math';

export type Photo = {
  id: string;
  uri: string;
  label: string;
  legacy?: 'purchaseProofImage' | 'unsubscribeProofImage';
};
type PhotoMeta = Omit<Photo, 'uri' | 'legacy'>;
type Index = Record<string, PhotoMeta[]>;
export const photoLimit = (plus: boolean) => (plus ? 10 : 5);
// Separate small image records avoid AsyncStorage's per-row Android limit.
export const MAX_PHOTO_LENGTH = 800_000;
const prefix = (scope: string) =>
  `pigeonsub.photos.${encodeURIComponent(scope)}.`;
const indexKey = (scope: string) => `${prefix(scope)}index`;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}
async function readIndex(scope: string): Promise<Index> {
  const value = await AsyncStorage.getItem(indexKey(scope));
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Galerie illisible. Vos photos ont été conservées.');
  }
}
export function legacyPhotos(sub: Subscription): Photo[] {
  return (['purchaseProofImage', 'unsubscribeProofImage'] as const).flatMap(
    (field) =>
      sub[field]
        ? [
            {
              id: field,
              uri: sub[field]!,
              legacy: field,
              label:
                field === 'purchaseProofImage'
                  ? 'Justificatif d’achat'
                  : 'Preuve de résiliation',
            },
          ]
        : [],
  );
}
export async function getPhotos(
  scope: string,
  sub: Subscription,
): Promise<Photo[]> {
  const rows = (await readIndex(scope))[sub.id] ?? [];
  const photos = await Promise.all(
    rows.map(async (row) => {
      const uri = await AsyncStorage.getItem(`${prefix(scope)}${row.id}`);
      if (!uri)
        throw new Error(
          'Une photo est indisponible. Les autres ont été conservées.',
        );
      return { ...row, uri };
    }),
  );
  return [...legacyPhotos(sub), ...photos];
}
export function addPhoto(
  scope: string,
  sub: Subscription,
  all: Subscription[],
  follow: FollowUps,
  plus: boolean,
  uri: string,
  label: string,
): Promise<void> {
  return serial(async () => {
    if (!canCustomizeSubscription(sub, all, plus, follow))
      throw new Error(
        'L’ajout de photos est inclus pour vos 5 abonnements actifs gratuits. Plus permet d’en suivre davantage.',
      );
    const index = await readIndex(scope);
    const rows = index[sub.id] ?? [];
    if (rows.length + legacyPhotos(sub).length >= photoLimit(plus))
      throw new Error(
        plus
          ? 'Cet abonnement ne peut plus recevoir de photo. Retirez-en une pour en ajouter une autre.'
          : 'Vos 5 photos sont enregistrées. Retirez-en une ou passez à Plus pour en ajouter davantage.',
      );
    if (
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri) ||
      uri.length > MAX_PHOTO_LENGTH
    )
      throw new Error(
        'Cette image ne peut pas être enregistrée. Essayez une photo moins volumineuse.',
      );
    const id = `${sub.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const blobKey = `${prefix(scope)}${id}`;
    await AsyncStorage.setItem(blobKey, uri);
    try {
      index[sub.id] = [...rows, { id, label }];
      await AsyncStorage.setItem(indexKey(scope), JSON.stringify(index));
    } catch (e) {
      await AsyncStorage.removeItem(blobKey).catch(() => undefined);
      throw e;
    }
  });
}
export function removePhoto(
  scope: string,
  subId: number,
  id: string,
): Promise<void> {
  return serial(async () => {
    const index = await readIndex(scope);
    if (!(index[subId] ?? []).some((p) => p.id === id))
      throw new Error('Photo introuvable.');
    index[subId] = index[subId].filter((p) => p.id !== id);
    await AsyncStorage.setItem(indexKey(scope), JSON.stringify(index));
    await AsyncStorage.removeItem(`${prefix(scope)}${id}`);
  });
}
export function clearPhotos(scope: string, subId?: number): Promise<void> {
  return serial(async () => {
    if (subId === undefined) {
      for (const name of await AsyncStorage.getAllKeys())
        if (name.startsWith(prefix(scope))) await AsyncStorage.removeItem(name);
      return;
    }
    const index = await readIndex(scope);
    const rows = index[subId] ?? [];
    delete index[subId];
    await AsyncStorage.setItem(indexKey(scope), JSON.stringify(index));
    for (const row of rows)
      await AsyncStorage.removeItem(`${prefix(scope)}${row.id}`);
  });
}
