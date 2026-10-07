import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useBilling } from '../../contexts/BillingContext';
import { assertIconChangeAllowed, type IconDraft } from '../../lib/subscription-icons';
import { getSubscriptionIcon } from '../../lib/subscription-icon-store';
import { prepareIcon } from '../../lib/prepare-icon';
import { Button } from '../ui/Button';
import { PlusBadge } from '../ui/PlusBadge';
import { SubscriptionIcon } from '../ui/SubscriptionIcon';
import { useUI } from '../ui/Page';

export function FormIcon({ id, name, draft, onChange, disabled, onBusy }: {
  id?: number; name: string; draft: IconDraft; onChange: (draft: IconDraft) => void;
  disabled: boolean; onBusy: (busy: boolean) => void;
}) {
  const { scope } = useAuth();
  const { canUsePlus } = useBilling();
  const router = useRouter(), ui = useUI();
  const lock = useRef(false);
  const [hasSaved, setHasSaved] = useState(false);
  useEffect(() => {
    let alive = true;
    setHasSaved(false);
    if (id !== undefined) void getSubscriptionIcon(scope, id).then(uri => { if (alive) setHasSaved(!!uri); }).catch(() => {});
    return () => { alive = false; };
  }, [scope, id]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pick = async () => {
    if (disabled || lock.current) return;
    if (!canUsePlus) { router.push('/(tabs)/premium?reason=icons'); return; }
    lock.current = true; setBusy(true); onBusy(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (result.canceled || !result.assets?.length) return;
      const uri = await prepareIcon(result.assets[0]);
      assertIconChangeAllowed(scope, uri);
      onChange(uri);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import impossible. Réessayez.'); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  };
  return <View style={[ui.card, { gap: 10 }]} testID="form-icon">
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={[ui.heading, { flex: 1 }]}>Icône personnalisée</Text><PlusBadge compact reason="icons" /></View>
    <View style={[ui.row, { flexWrap: 'nowrap', gap: 14 }]}>
      <SubscriptionIcon id={id} name={name} size={60} uri={draft} />
      <Button title="Importer une icône" variant="secondary" style={{ flex: 1 }} loading={busy} disabled={disabled} onPress={() => void pick()} />
    </View>
    <Text style={ui.small}>Une photo à vous, enregistrée sur cet appareil.</Text>
    {(hasSaved || typeof draft === 'string') && draft !== null && <Button title="Rétablir l’icône par défaut" variant="ghost" disabled={disabled || busy} onPress={() => { setError(''); onChange(null); }} />}
    {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
  </View>;
}
