import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Subscription } from '../../lib/api';
import { getPhotos, photoLimit, type Photo, type PendingPhoto } from '../../lib/subscription-photos';
import { preparePhoto } from '../../lib/prepare-photo';
import { getDataSession } from '../../lib/local-data';
import { useAuth } from '../../contexts/AuthContext';
import { useBilling } from '../../contexts/BillingContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { useUI } from '../ui/Page';
import { PlusBadge } from '../ui/PlusBadge';

export function FormPhotos({ sub, drafts, onChange, allowed, disabled, onBusy, premiumSlot = false }: {
  sub?: Subscription; drafts: PendingPhoto[]; onChange: (photos: PendingPhoto[]) => void;
  allowed: boolean; disabled: boolean; onBusy: (busy: boolean) => void;
  premiumSlot?: boolean;
}) {
  const { scope } = useAuth();
  const router = useRouter();
  const { canUsePlus } = useBilling();
  const { colors: c } = useTheme();
  const ui = useUI();
  const [existing, setExisting] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(!!sub);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const lock = useRef(false);
  const total = existing.length + drafts.length;
  useEffect(() => {
    let alive = true;
    if (sub) {
      setLoading(true);
      void getPhotos(scope, sub).then((items) => {
        if (alive) { setExisting(items); setLoading(false); }
      }).catch((e) => { if (alive) setError(e.message); });
    }
    return () => { alive = false; };
  }, [scope, sub?.id]);
  const pick = async (camera = false) => {
    if (lock.current || !allowed || disabled || loading || total >= photoLimit(canUsePlus)) return;
    lock.current = true; setBusy(true); onBusy(true); setError('');
    try {
      if (camera && Platform.OS !== 'web' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        setDenied(true);
        throw new Error('Autorisez la caméra pour prendre une photo.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const uri = await preparePhoto(result.assets[0]);
      if (getDataSession().scope !== scope) throw new Error('La session a changé.');
      onChange([...drafts, { id: `${Date.now()}-${Math.random()}`, uri, label: 'Justificatif' }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Photo indisponible.'); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  };
  return (
    <View style={[ui.card, { gap: 12 }]} testID="form-photos">
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.heading}>Photos et justificatifs</Text>
        {premiumSlot && <PlusBadge reason="photos" />}
      </View>
      <Text style={ui.small}>{canUsePlus ? `${total} photo${total > 1 ? 's' : ''}` : `${total} / 5 photos`}</Text>
      <View style={ui.row}>
        {existing.map((photo, i) => <Image key={photo.id} source={{ uri: photo.uri }} style={{ width: 70, height: 70, borderRadius: 12 }} accessibilityLabel={`Photo enregistrée ${i + 1}`} />)}
        {drafts.map((photo, i) => <View key={photo.id} style={{ gap: 4 }}>
          <Image source={{ uri: photo.uri }} style={{ width: 80, height: 80, borderRadius: 12 }} accessibilityLabel={`Nouvelle photo ${i + 1}`} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Retirer la nouvelle photo ${i + 1}`} disabled={busy || disabled} onPress={() => onChange(drafts.filter((p) => p.id !== photo.id))} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle-outline" size={24} color={c.danger} /></Pressable>
        </View>)}
      </View>
      <View style={ui.row}>
        <Button title="Ajouter une photo" variant="secondary" style={{ flex: 1 }} loading={busy} disabled={disabled || loading || !allowed || total >= photoLimit(canUsePlus)} onPress={() => void pick()} />
        {total >= 5 && canUsePlus && <PlusBadge compact reason="photos" />}
      </View>
      {!canUsePlus && total >= 5 && <Pressable accessibilityRole="button" accessibilityLabel="Plus de photos avec Plus" onPress={() => router.push('/(tabs)/premium?reason=photos')} style={[ui.row, { minHeight: 44 }]}><PlusBadge reason="photos" interactive={false} /><Text style={{ color: c.gold, fontWeight: '700' }}>Plus de photos</Text></Pressable>}
      {Platform.OS !== 'web' && <Button title="Prendre une photo" variant="ghost" disabled={busy || disabled || loading || !allowed || total >= photoLimit(canUsePlus)} onPress={() => void pick(true)} />}
      {drafts.length > 0 && <Text style={ui.small}>Les nouvelles photos seront enregistrées avec l’abonnement.</Text>}
      {total >= photoLimit(canUsePlus) && <Text style={ui.small}>{canUsePlus ? 'Retirez une photo pour en ajouter une autre.' : '5 photos incluses. Plus permet d’en ajouter davantage.'}</Text>}
      {!allowed && <Text style={ui.small}>Ajout disponible pour les abonnements actifs inclus dans votre offre.</Text>}
      {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
      {denied && <Button title="Ouvrir les réglages" variant="ghost" onPress={() => void Linking.openSettings()} />}
    </View>
  );
}
