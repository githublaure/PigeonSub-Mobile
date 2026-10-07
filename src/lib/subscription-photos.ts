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
export type PendingPhoto = { id: string; uri: string; label: string };

export function addPhoto(
  scope: string, sub: Subscription, all: Subscription[], follow: FollowUps,
  plus: boolean, uri: string, label: string,
): Promise<void> {
  return addPhotos(scope, sub, all, follow, plus, [{ uri, label }]);
}

/** Commit a form's photos together; a failed write leaves the previous gallery intact. */
export function addPhotos(
  scope: string, sub: Subscription, all: Subscription[], follow: FollowUps,
  plus: boolean, photos: { uri: string; label: string }[],
): Promise<void> {
  if (!photos.length) return Promise.resolve();
  return serial(async () => {
    if (!canCustomizeSubscription(sub, all, plus, follow))
      throw new Error('Les photos sont incluses pour vos 5 abonnements actifs gratuits.');
    const index = await readIndex(scope);
    const rows = index[sub.id] ?? [];
    if (rows.length + legacyPhotos(sub).length + photos.length > photoLimit(plus))
      throw new Error(plus
        ? 'Cet abonnement ne peut plus recevoir de photo. Retirez-en une pour en ajouter une autre.'
        : 'La limite gratuite est de 5 photos par abonnement.');
    for (const photo of photos)
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.uri) || photo.uri.length > MAX_PHOTO_LENGTH)
        throw new Error('Cette image ne peut pas être enregistrée. Essayez une photo moins volumineuse.');
    const added: PhotoMeta[] = [];
    const written: string[] = [];
    try {
      for (const photo of photos) {
        const id = `${sub.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const blobKey = `${prefix(scope)}${id}`;
        written.push(blobKey);
        await AsyncStorage.setItem(blobKey, photo.uri);
        added.push({ id, label: photo.label });
      }
      index[sub.id] = [...rows, ...added];
      await AsyncStorage.setItem(indexKey(scope), JSON.stringify(index));
    } catch (error) {
      await Promise.all(written.map((key) => AsyncStorage.removeItem(key).catch(() => undefined)));
      throw error;
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

/** Replace only the disposable demo gallery; personal/account scopes are unreachable. */
export function replaceDemoPhotos(examples: (Photo & { subscriptionId: number })[]): Promise<void> {
  return serial(async () => {
    const oldIndex = await readIndex('demo');
    const index: Index = {};
    const written: string[] = [];
    const batch = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      for (const example of examples) {
        if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(example.uri) || example.uri.length > MAX_PHOTO_LENGTH)
          throw new Error('Justificatif de démonstration invalide.');
        const id = `example-${batch}-${example.id}`;
        const blobKey = `${prefix('demo')}${id}`;
        written.push(blobKey);
        await AsyncStorage.setItem(blobKey, example.uri);
        (index[example.subscriptionId] ??= []).push({ id, label: example.label });
      }
      await AsyncStorage.setItem(indexKey('demo'), JSON.stringify(index));
    } catch (error) {
      await Promise.all(written.map((key) => AsyncStorage.removeItem(key).catch(() => undefined)));
      throw error;
    }
    // Committed examples stay usable even if stale-blob cleanup fails.
    for (const row of Object.values(oldIndex).flat())
      await AsyncStorage.removeItem(`${prefix('demo')}${row.id}`).catch(() => undefined);
  });
}
