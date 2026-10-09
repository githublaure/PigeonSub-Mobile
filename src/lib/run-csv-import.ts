import { subscriptions } from './api';
import { getDataSession } from './local-data';
import { hasPlusAccess } from './entitlements-state';
import { matchesExisting, validateImportCandidate, type ImportCandidate } from './csv-import';

export async function runCsvImport(scope: string, selected: ImportCandidate[], completed: (id: string, subscriptionId: number | null) => void) {
  if (!selected.length || selected.length > 50) throw new Error('Sélectionnez de 1 à 50 abonnements.');
  if (selected.length > 1 && !hasPlusAccess()) throw new Error('PLUS_IMPORT: L’import groupé est inclus dans Plus.');
  // Validate the entire selection before the first write.
  const payloads = selected.map(validateImportCandidate);
  if (getDataSession().scope !== scope || getDataSession().mode === 'none') throw new Error('La session a changé.');
  if (selected.length > 1 && getDataSession().mode === 'account') {
    const saved = await subscriptions.importBatch(payloads);
    if (getDataSession().scope !== scope) throw new Error('La session a changé.');
    saved.forEach((sub, index) => completed(selected[index].id, sub.id));
    return;
  }
  for (let index = 0; index < selected.length; index++) {
    const assertSession = () => {
      if (getDataSession().scope !== scope || getDataSession().mode === 'none') throw new Error('La session a changé. Relancez l’import depuis votre espace.');
      if (selected.length > 1 && !hasPlusAccess()) throw new Error('PLUS_IMPORT: Votre accès Plus doit être actif pour poursuivre l’import groupé.');
    };
    assertSession();
    // Refresh for retries after partial failures and check other imports/edits.
    const all = await subscriptions.list(true);
    assertSession();
    if (matchesExisting(selected[index], all)) { completed(selected[index].id, null); continue; }
    const sub = await subscriptions.create(payloads[index]);
    assertSession();
    completed(selected[index].id, sub.id);
  }
}
