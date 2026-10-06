import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { onDataChanged, getDataSession } from '../lib/local-data';
import { syncReminders } from '../lib/notifications';
import { useAuth } from './AuthContext';
import { useBilling } from './BillingContext';
export function ReminderSync() {
  const { scope, isLoading } = useAuth();
  const { isPlus } = useBilling();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    const sync = () => {
      void syncReminders().catch(() => {
        /* Details screen reports scheduling errors; retry on focus/foreground. */
      });
    };
    sync();
    const off = onDataChanged(sync);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      off();
      listener.remove();
    };
  }, [scope, isLoading, isPlus]);
  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      Constants.executionEnvironment === 'storeClient' ||
      isLoading
    )
      return;
    const N =
      require('expo-notifications') as typeof import('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const open = (
      response: import('expo-notifications').NotificationResponse,
    ) => {
      const data = response.notification.request.content.data;
      if (
        data?.pigeonsub &&
        data.scope === getDataSession().scope &&
        Number.isInteger(data.subscriptionId)
      ) {
        router.push(`/(tabs)/subscriptions/${Number(data.subscriptionId)}`);
        void N.clearLastNotificationResponseAsync();
      }
    };
    const listener = N.addNotificationResponseReceivedListener(open);
    void N.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
    });
    return () => listener.remove();
  }, [isLoading, router]);
  return null;
}
