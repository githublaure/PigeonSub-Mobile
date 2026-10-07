import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { subscriptions } from './api';
import { getDataSession, getFollowUps, isGuidePreview } from './local-data';
import { hasPlusAccess } from './entitlements-state';
import { reminderPlan } from './reminder-plan';
const supported = () =>
  Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient';
const notifications = () =>
  require('expo-notifications') as typeof import('expo-notifications');
export async function askReminderPermission(): Promise<boolean> {
  if (!supported())
    throw new Error(
      'Les rappels sont disponibles dans l’application installée sur votre téléphone.',
    );
  const N = notifications();
  if (Platform.OS === 'android')
    await N.setNotificationChannelAsync('renewals', {
      name: 'Échéances des abonnements',
      importance: N.AndroidImportance.DEFAULT,
    });
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  return (
    await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    })
  ).granted;
}
let queue = Promise.resolve();
let scheduledScope = '';
export function syncReminders(): Promise<void> {
  queue = queue
    .catch(() => undefined)
    .then(async () => {
      if (!supported() || isGuidePreview()) return;
      const N = notifications();
      const session = getDataSession();
      const clearOwned = async () => {
        for (const request of await N.getAllScheduledNotificationsAsync()) {
          if (request.content.data?.pigeonsub === true)
            await N.cancelScheduledNotificationAsync(request.identifier);
        }
      };
      if (
        scheduledScope !== session.scope ||
        session.mode === 'demo' ||
        session.mode === 'none'
      ) {
        await clearOwned();
        scheduledScope = session.scope;
      }
      if (
        session.mode === 'demo' ||
        session.mode === 'none' ||
        !(await N.getPermissionsAsync()).granted
      )
        return;
      const [subs, follow] = await Promise.all([
        subscriptions.list(true),
        getFollowUps(session.scope),
      ]);
      if (getDataSession().scope !== session.scope) return;
      const plan = reminderPlan(subs, follow, hasPlusAccess());
      await clearOwned();
      for (const item of plan) {
        if (getDataSession().scope !== session.scope) {
          if (!isGuidePreview()) await clearOwned();
          return;
        }
        await N.scheduleNotificationAsync({
          content: {
            title: item.isTrial
              ? `${item.name} : votre essai gratuit se termine`
              : `${item.name} : on garde ou on résilie ?`,
            body: item.isTrial
              ? 'Vérifiez le tarif après essai et décidez avant le premier prélèvement.'
              : 'Votre date de sûreté approche. Vérifiez votre abonnement avant le prochain prélèvement.',
            sound: true,
            data: {
              pigeonsub: true,
              scope: session.scope,
              subscriptionId: item.subscriptionId,
            },
          },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DATE,
            date: item.at,
            channelId: 'renewals',
          },
        });
      }
    });
  return queue;
}
