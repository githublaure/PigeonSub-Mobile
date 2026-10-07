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
      const clearOwned = async (includeTests = false) => {
        for (const request of await N.getAllScheduledNotificationsAsync()) {
          if (request.content.data?.pigeonsub === true && (includeTests || !request.content.data?.diagnostic))
            await N.cancelScheduledNotificationAsync(request.identifier);
        }
      };
      if (
        scheduledScope !== session.scope ||
        session.mode === 'demo' ||
        session.mode === 'none'
      ) {
        await clearOwned(true);
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
              scheduledAt: item.at.toISOString(),
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

export async function getReminderStatus() {
  const session = getDataSession();
  if (session.mode === 'demo') return { state: 'demo' as const, count: 0, nextAt: null };
  if (!supported()) return { state: 'unsupported' as const, count: 0, nextAt: null };
  const N = notifications();
  if (!(await N.getPermissionsAsync()).granted) return { state: 'denied' as const, count: 0, nextAt: null };
  const requests = (await N.getAllScheduledNotificationsAsync()).filter(r => r.content.data?.pigeonsub === true && r.content.data?.scope === session.scope && !r.content.data?.diagnostic);
  const next = requests.map(r => r.content.data?.scheduledAt).filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now()).sort()[0];
  return { state: 'ready' as const, count: requests.length, nextAt: next ?? null };
}

export async function sendTestReminder() {
  const session = getDataSession();
  if (session.mode === 'demo' || session.mode === 'none' || isGuidePreview()) throw new Error('Le test nécessite votre espace personnel, hors démo.');
  if (!(await askReminderPermission())) throw new Error('Autorisez les notifications dans les réglages du téléphone.');
  if (getDataSession().scope !== session.scope) throw new Error('La session a changé.');
  const N = notifications();
  await N.scheduleNotificationAsync({
    identifier: `pigeonsub-test-${session.scope}`,
    content: { title: 'PigeonSub · notification test', body: 'Ce test permet de vérifier la réception sur ce téléphone.', sound: true, data: { pigeonsub: true, scope: session.scope, diagnostic: true } },
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: 'renewals' },
  });
}
