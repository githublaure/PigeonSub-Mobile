import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getSubscriptionIcon } from '../../lib/subscription-icon-store';
import { onDataChanged } from '../../lib/local-data';

export function SubscriptionIcon({ id, name, size = 40, uri }: { id?: number; name: string; size?: number; uri?: string | null }) {
  const { scope } = useAuth();
  const { colors: c } = useTheme();
  const [saved, setSaved] = useState<{ scope: string; id: number; uri: string | null } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (id === undefined || uri !== undefined) return;
    let alive = true, request = 0;
    const reload = () => {
      const current = ++request;
      void getSubscriptionIcon(scope, id).then(value => {
        if (alive && request === current) setSaved({ scope, id, uri: value });
      }).catch(() => { if (alive && request === current) setSaved(null); });
    };
    reload();
    const unsubscribe = onDataChanged(reload);
    return () => { alive = false; unsubscribe(); };
  }, [scope, id, uri]);
  const source = uri !== undefined ? uri : saved?.scope === scope && saved.id === id ? saved.uri : null;
  const style = { width: size, height: size, borderRadius: size * 0.28, flexShrink: 0 as const };
  if (source && failed !== source) return <Image testID={`subscription-icon-${id ?? 'preview'}`} accessibilityLabel={`Icône de ${name || 'l’abonnement'}`} source={{ uri: source }} resizeMode="cover" style={style} onError={() => setFailed(source)} />;
  return <View testID={`subscription-icon-default-${id ?? 'preview'}`} style={[style, { backgroundColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' }]} accessible={false}><Text style={{ color: c.primary, fontWeight: '800', fontSize: size * 0.45 }}>{name.trim().charAt(0).toLocaleUpperCase('fr') || '+'}</Text></View>;
}
