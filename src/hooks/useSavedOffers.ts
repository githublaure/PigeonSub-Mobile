import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getSavedOffers, onDataChanged } from '../lib/local-data';
import type { SavedOffer } from '../lib/offers';
export function useSavedOffers() {
  const { scope } = useAuth();
  const [offers, setOffers] = useState<SavedOffer[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let request = 0;
      setLoading(true);
      const load = async () => {
        const current = ++request;
        try {
          const rows = await getSavedOffers(scope);
          if (alive && current === request) {
            setOffers(rows);
            setError('');
          }
        } catch (e) {
          if (alive && current === request)
            setError(e instanceof Error ? e.message : 'Chargement impossible.');
        } finally {
          if (alive && current === request) setLoading(false);
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
  return { offers, error, loading, reload: () => setRevision((v) => v + 1) };
}
