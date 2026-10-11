import { getDataSession, readJSON, dataChanged } from './local-data';
import { API_BASE_URL } from './config';
import { buildApiUrl } from './api-url';
import { getStoredToken } from './api';
import { emptyCatalog, validCatalog, validCategoryName, type CategoryCatalog } from './category-catalog';
import { iconChoices, type CategoryIconName } from './categories';
import AsyncStorage from '@react-native-async-storage/async-storage';
const key = (scope: string) => `pigeonsub.v2.${scope}.category-catalog`;
let queue = Promise.resolve();
function locked<T>(work: () => Promise<T>): Promise<T> {
  const pending = queue.then(work);
  queue = pending.then(() => undefined, () => undefined);
  return pending;
}
async function server(path: string, method = 'GET', body?: unknown) {
  const token = await getStoredToken();
  const res = await fetch(buildApiUrl(API_BASE_URL, `/categories${path}`), {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { message = (await res.json()).error || message; } catch {}
    throw new Error(message);
  }
  return res.json();
}
export async function getCatalog(scope = getDataSession().scope): Promise<CategoryCatalog> {
  if (getDataSession().mode === 'account' && scope === getDataSession().scope) return validCatalog(await server(''));
  return validCatalog(await readJSON<CategoryCatalog>(key(scope), emptyCatalog()));
}
export async function categoryMutation(action: 'create' | 'update' | 'delete',
  input: { id?: string; name?: string; icon?: CategoryIconName | null },
  onDeleted?: (id: string) => Promise<void>,
): Promise<void> {
  const session = getDataSession();
  if (session.mode === 'none') throw new Error('Ouvrez votre espace.');
  const id = input.id;
  const name = action === 'delete' ? '' : validCategoryName(input.name);
  if (input.icon !== undefined && input.icon !== null && !(iconChoices as readonly string[]).includes(input.icon))
    throw new Error('Icône invalide.');
  if (session.mode === 'account') {
    await server(action === 'create' ? '' : `/${encodeURIComponent(id || '')}`,
      action === 'create' ? 'POST' : action === 'update' ? 'PATCH' : 'DELETE',
      action === 'delete' ? undefined : { name, icon: input.icon });
  } else {
    await locked(async () => {
      const catalog = await getCatalog(session.scope);
      if (getDataSession().scope !== session.scope) throw new Error('La session a changé.');
      if (action === 'create') {
        if (catalog.custom.length >= 60) throw new Error('Maximum 60 catégories.');
        if (catalog.custom.some(c => c.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr')))
          throw new Error('Cette catégorie existe déjà.');
        catalog.custom.push({ id: `custom_${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name, icon: input.icon ?? 'grid-outline' });
      } else {
        if (!id || id === 'other' && action === 'delete') throw new Error('Catégorie non modifiable.');
        const row = catalog.custom.find(item => item.id === id);
        if (action === 'update') {
          if (row) { row.name = name; if (input.icon !== undefined) row.icon = input.icon; }
          else catalog.overrides[id] = { ...(catalog.overrides[id] ?? {}), name,
            ...(input.icon !== undefined ? { icon: input.icon } : {}) };
        } else {
          catalog.custom = catalog.custom.filter(item => item.id !== id);
          if (!row && !catalog.hidden.includes(id)) catalog.hidden.push(id);
          delete catalog.overrides[id];
          await onDeleted?.(id);
        }
      }
      await AsyncStorage.setItem(key(session.scope), JSON.stringify(catalog));
    });
  }
  if (getDataSession().scope === session.scope) dataChanged();
}
