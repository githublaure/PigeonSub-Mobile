import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { subscriptions, type Subscription } from '../lib/api';
import { getFollowUps, onDataChanged } from '../lib/local-data';
import type { FollowUps } from '../lib/subscription-math';
import { useAuth } from '../contexts/AuthContext';
export function useSubscriptionData() {
  const { scope } = useAuth();
  const [data, setData] = useState<Subscription[]>([]);
  const [follow, setFollow] = useState<FollowUps>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let request = 0;
      const load = async () => {
        const current = ++request;
        try {
          const [list, metadata] = await Promise.all([
            subscriptions.list(true),
            getFollowUps(scope),
          ]);
          if (alive && request === current) {
            setData(list);
            setFollow(metadata);
            setError('');
          }
        } catch (e) {
          if (alive && request === current)
            setError(e instanceof Error ? e.message : 'Chargement impossible.');
        } finally {
          if (alive && request === current) setLoading(false);
        }
      };
      void load();
      const off = onDataChanged(() => void load());
      const appState = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });
      return () => {
        alive = false;
        off();
        appState.remove();
      };
    }, [scope, revision]),
  );
  return {
    data,
    follow,
    loading,
    error,
    reload: () => setRevision((v) => v + 1),
  };
}
