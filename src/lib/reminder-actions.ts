import { getDataSession, getFollowUps, updateFollowUp } from './local-data';
import { syncReminders } from './notifications';

/** Persist the choice only if scheduling succeeds, with scoped rollback. */
export async function changeReminder(id: number, enabled: boolean, expectedScope: string) {
  const previous = !!(await getFollowUps(expectedScope))[id]?.reminderEnabled;
  if (getDataSession().scope !== expectedScope) throw new Error('La session a changé.');
  await updateFollowUp(id, { reminderEnabled: enabled });
  try {
    if (getDataSession().mode !== 'demo') await syncReminders();
  } catch (error) {
    if (getDataSession().scope === expectedScope) {
      try {
        await updateFollowUp(id, { reminderEnabled: previous });
      } catch {
        throw new Error('La programmation du rappel et la restauration du réglage ont échoué. Vérifiez les rappels dans la fiche.');
      }
      // Restore any notifications removed before the scheduling failure. Keep
      // the original error visible even if the native scheduler is still down.
      await syncReminders().catch(() => undefined);
    }
    throw error;
  }
}
