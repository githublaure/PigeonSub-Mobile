import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useBilling } from '../../../../src/contexts/BillingContext';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { subscriptions, type Subscription } from '../../../../src/lib/api';
import { getDataSession, getFollowUps } from '../../../../src/lib/local-data';
import { hasPlusAccess } from '../../../../src/lib/entitlements-state';
import { canCustomizeSubscription } from '../../../../src/lib/subscription-math';
import {
  addPhoto,
  getPhotos,
  photoLimit,
  removePhoto,
  type Photo,
} from '../../../../src/lib/subscription-photos';
import { preparePhoto } from '../../../../src/lib/prepare-photo';
import { Page, useUI } from '../../../../src/components/ui/Page';
import { Button } from '../../../../src/components/ui/Button';
import { LoadingScreen } from '../../../../src/components/ui/LoadingScreen';

export default function ReceiptsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subId = Number(id);
  const router = useRouter();
  const { scope } = useAuth();
  const { canUsePlus } = useBilling();
  const { colors } = useTheme();
  const ui = useUI();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [note, setNote] = useState('');
  const [label, setLabel] = useState('Justificatif');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const load = useCallback(
    async (preserveNote = false) => {
      const [all, follow] = await Promise.all([
        subscriptions.list(true),
        getFollowUps(scope),
      ]);
      const item = all.find((s) => s.id === subId);
      if (!item) throw new Error('Abonnement introuvable.');
      const rows = await getPhotos(scope, item);
      if (getDataSession().scope !== scope) return;
      setSub(item);
      if (!preserveNote) setNote(item.note ?? '');
      setPhotos(rows);
      setAllowed(canCustomizeSubscription(item, all, canUsePlus, follow));
    },
    [scope, subId, canUsePlus],
  );
  useFocusEffect(
    useCallback(() => {
      void load().catch((e) => setError(e.message));
    }, [load]),
  );
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const pick = (source: 'library' | 'camera') =>
    void run(async () => {
      if (!allowed || photos.length >= photoLimit(canUsePlus)) return;
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setDenied(true);
          throw new Error(
            'Autorisez la caméra dans les réglages pour prendre une photo.',
          );
        }
      }
      // Invoke the web picker directly from the tap; an awaited permission prompt loses its user gesture.
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const uri = await preparePhoto(result.assets[0]);
      if (getDataSession().scope !== scope)
        throw new Error(
          'La session a changé. Recommencez depuis votre compte.',
        );
      const [all, follow] = await Promise.all([
        subscriptions.list(true),
        getFollowUps(scope),
      ]);
      const current = all.find((s) => s.id === subId);
      if (!current || getDataSession().scope !== scope)
        throw new Error('Abonnement indisponible.');
      await addPhoto(scope, current, all, follow, hasPlusAccess(), uri, label);
      await load(true);
      setMessage('Photo enregistrée.');
    });
  const remove = (photo: Photo) =>
    void run(async () => {
      if (photo.legacy)
        await subscriptions.update(subId, { [photo.legacy]: null });
      else await removePhoto(scope, subId, photo.id);
      setRemoveId(null);
      await load(true);
      setMessage('Photo retirée.');
    });
  if (!sub && !error) return <LoadingScreen />;
  const full = photos.length >= photoLimit(canUsePlus);
  return (
    <Page title="Photos et justificatifs" subtitle={sub?.name}>
      <Button title="Retour" variant="ghost" onPress={() => router.back()} />
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
      {!sub && <Button title="Réessayer" onPress={() => void run(load)} />}
      {sub && (
        <>
          <View
            style={[
              ui.card,
              {
                backgroundColor: colors.goldSurface,
                borderColor: colors.goldBorder,
              },
            ]}
          >
            <Text style={[ui.heading, { color: colors.gold }]}>
              Gardez vos preuves à portée de main.
            </Text>
            <Text style={ui.body}>
              Reçu, capture d’écran ou confirmation de résiliation : tout reste
              avec votre abonnement.
            </Text>
            <Text style={ui.small}>
              {canUsePlus
                ? `${photos.length} photo${photos.length > 1 ? 's' : ''} enregistrée${photos.length > 1 ? 's' : ''}`
                : `${photos.length} / 5 photos · inclus dans le mode gratuit`}
            </Text>
            <Text style={ui.small}>
              Les nouvelles photos sont enregistrées sur cet appareil, sans
              synchronisation entre appareils. Conservez vos originaux.
            </Text>
          </View>
          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[ui.body, ui.success]}
            >
              {message}
            </Text>
          ) : null}
          <View style={ui.row}>
            {['Justificatif', 'Résiliation', 'Autre'].map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={value}
                accessibilityState={{ checked: label === value }}
                aria-checked={label === value}
                onPress={() => setLabel(value)}
                style={[
                  ui.pill,
                  label === value && { backgroundColor: colors.goldSoft },
                ]}
              >
                <Text style={ui.body}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Button
            title="Ajouter une photo"
            disabled={busy || full || !allowed}
            onPress={() => pick('library')}
          />
          {Platform.OS !== 'web' && (
            <Button
              title="Prendre une photo"
              variant="secondary"
              disabled={busy || full || !allowed}
              onPress={() => pick('camera')}
            />
          )}
          {busy && <Text style={ui.small}>Enregistrement en cours…</Text>}
          {full && (
            <Text style={ui.body}>
              {canUsePlus
                ? 'Cet abonnement ne peut plus recevoir de photo. Retirez-en une pour en ajouter une autre.'
                : 'Vos 5 photos sont enregistrées. Vous pouvez en retirer une ou passer à Plus.'}
            </Text>
          )}
          {!allowed && (
            <Text style={ui.body}>
              L’ajout est disponible pour vos 5 abonnements actifs gratuits. Les
              photos existantes restent accessibles.
            </Text>
          )}
          {!canUsePlus && (full || !allowed) && (
            <Button
              title="Découvrir Plus"
              variant="secondary"
              onPress={() => router.push('/(tabs)/premium?reason=photos')}
            />
          )}
          {denied && (
            <Button
              title="Ouvrir les réglages"
              variant="ghost"
              onPress={() => void Linking.openSettings()}
            />
          )}
          {photos.length === 0 && (
            <Text style={ui.body}>Ajoutez votre première photo.</Text>
          )}
          <View style={ui.row}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={[ui.card, { width: '100%' }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Agrandir la photo ${index + 1}`}
                  onPress={() => setSelected(photo)}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ height: 180, width: '100%', borderRadius: 12 }}
                    resizeMode="contain"
                    accessibilityLabel={photo.label}
                  />
                </Pressable>
                <Text style={ui.body}>{photo.label}</Text>
                {removeId === photo.id ? (
                  <>
                    <Text style={ui.body}>
                      Retirer cette photo de l’abonnement ? Votre original reste
                      dans votre photothèque.
                    </Text>
                    <Button
                      title="Confirmer le retrait"
                      variant="danger"
                      disabled={busy}
                      onPress={() => remove(photo)}
                    />
                    <Button
                      title="Conserver cette photo"
                      variant="ghost"
                      disabled={busy}
                      onPress={() => setRemoveId(null)}
                    />
                  </>
                ) : (
                  <Button
                    title="Retirer la photo"
                    accessibilityLabel={`Retirer la photo ${index + 1}`}
                    variant="ghost"
                    disabled={busy}
                    onPress={() => setRemoveId(photo.id)}
                  />
                )}
              </View>
            ))}
          </View>
          <View style={ui.card}>
            <Text style={ui.heading}>Note</Text>
            <TextInput
              accessibilityLabel="Note de l’abonnement"
              style={[ui.input, { minHeight: 96 }]}
              multiline
              maxLength={2000}
              value={note}
              onChangeText={setNote}
            />
            <Button
              title="Enregistrer la note"
              disabled={busy}
              variant="secondary"
              onPress={() =>
                void run(async () => {
                  await subscriptions.update(subId, {
                    note: note.trim() || null,
                  });
                  setMessage('Note enregistrée.');
                })
              }
            />
          </View>
        </>
      )}
      <Modal
        visible={!!selected}
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={[ui.safe, { padding: 20, gap: 12 }]}>
          <Button
            title="Fermer la photo"
            variant="secondary"
            onPress={() => setSelected(null)}
          />
          {selected && (
            <Image
              source={{ uri: selected.uri }}
              accessibilityLabel={selected.label}
              resizeMode="contain"
              style={{ flex: 1 }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </Page>
  );
}
