import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryIcons, onDataChanged } from '../lib/local-data';
import { categoryIcons, type CategoryIconPreferences } from '../lib/categories';

export function useCategoryIcons() {
  const { scope } = useAuth();
  const [saved, setSaved] = useState<{ scope: string; icons: CategoryIconPreferences }>();
  useEffect(() => {
    let alive = true, request = 0;
    const load = () => {
      const current = ++request;
      void getCategoryIcons(scope).then(icons => {
        if (alive && current === request) setSaved({ scope, icons });
      }).catch(() => { if (alive && current === request) setSaved(undefined); });
    };
    load();
    const unsubscribe = onDataChanged(load);
    return () => { alive = false; unsubscribe(); };
  }, [scope]);
  return { ...categoryIcons, ...(saved?.scope === scope ? saved.icons : {}) };
}
