import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { onDataChanged } from '../lib/local-data';
import { getCatalog } from '../lib/category-api';
import { emptyCatalog, type CategoryCatalog } from '../lib/category-catalog';

export function useCategoryCatalog() {
  const { scope } = useAuth();
  const [state, setState] = useState<{ scope: string; catalog: CategoryCatalog }>();
  useEffect(() => {
    let alive = true, request = 0;
    const reload = () => {
      const current = ++request;
      void getCatalog(scope).then(catalog => {
        if (alive && current === request) setState({ scope, catalog });
      }).catch(() => { if (alive && current === request) setState({ scope, catalog: emptyCatalog() }); });
    };
    reload();
    const off = onDataChanged(reload);
    return () => { alive = false; off(); };
  }, [scope]);
  return state?.scope === scope ? state.catalog : emptyCatalog();
}
