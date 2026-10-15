import { getDataSession } from './local-data';
import { categoryApi } from './api';
import { emptyCatalog, validCatalog, validCategoryName, type CategoryCatalog } from './category-catalog';
import { iconChoices, type CategoryIconName } from './categories';

export async function getCatalog(scope = getDataSession().scope): Promise<CategoryCatalog> {
  if (scope !== getDataSession().scope || getDataSession().mode === 'none') return emptyCatalog();
  const value = await categoryApi.get();
  if (scope !== getDataSession().scope) throw new Error('La session a changé.');
  return validCatalog(value);
}
export async function categoryMutation(action: 'create' | 'update' | 'delete',
  input: { id?: string; name?: string; icon?: CategoryIconName | null },
): Promise<void> {
  const session = getDataSession();
  if (session.mode === 'none') throw new Error('Ouvrez votre espace.');
  const name = action === 'delete' ? '' : validCategoryName(input.name);
  if (input.icon !== undefined && input.icon !== null && !(iconChoices as readonly string[]).includes(input.icon)) throw new Error('Icône invalide.');
  await categoryApi.mutate(action, { ...input, name });
  if (session.scope !== getDataSession().scope) throw new Error('La session a changé.');
}
