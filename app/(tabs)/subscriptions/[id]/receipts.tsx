import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '../../../../src/components/ui/Card';
import { ErrorState } from '../../../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../../../src/components/ui/LoadingScreen';
import { Subscription, subscriptions as subsApi } from '../../../../src/lib/api';
import { Colors } from '../../../../src/theme/colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ImageSlot = 'purchaseProofImage' | 'unsubscribeProofImage';

const SLOT_LABELS: Record<ImageSlot, string> = {
  purchaseProofImage: 'Purchase Receipt',
  unsubscribeProofImage: 'Cancellation Proof',
};

const SLOT_ICONS: Record<ImageSlot, keyof typeof Ionicons.glyphMap> = {
  purchaseProofImage: 'receipt-outline',
  unsubscribeProofImage: 'shield-checkmark-outline',
};

// ---------------------------------------------------------------------------
// PermissionDenied helper
// ---------------------------------------------------------------------------
function PermissionDenied({ source }: { source: 'camera' | 'library' }) {
  return (
    <View style={styles.permissionBox}>
      <Ionicons
        name={source === 'camera' ? 'camera-outline' : 'images-outline'}
        size={28}
        color={Colors.textMuted}
      />
      <Text style={styles.permissionTitle}>
        {source === 'camera' ? 'Camera access denied' : 'Photo library access denied'}
      </Text>
      <Text style={styles.permissionDesc}>
        PigeonSub needs access to your {source === 'camera' ? 'camera' : 'photo library'} to
        attach receipt photos. Enable it in System Settings.
      </Text>
      <Pressable
        onPress={() => Linking.openSettings()}
        style={styles.permissionBtn}
        accessibilityRole="button"
      >
        <Text style={styles.permissionBtnText}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ImageSlotCard
// ---------------------------------------------------------------------------
function ImageSlotCard({
  slot,
  imageUri,
  uploading,
  onPickLibrary,
  onPickCamera,
  onRemove,
}: {
  slot: ImageSlot;
  imageUri: string | null;
  uploading: boolean;
  onPickLibrary: () => void;
  onPickCamera: () => void;
  onRemove: () => void;
}) {
  return (
    <Card style={styles.slotCard}>
      {/* Slot label */}
      <View style={styles.slotHeader}>
        <Ionicons name={SLOT_ICONS[slot]} size={16} color={Colors.textSecondary} />
        <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>
      </View>

      {/* Image or placeholder */}
      {imageUri ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={SLOT_LABELS[slot]}
          />
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={Colors.white} size="large" />
              <Text style={styles.uploadText}>Uploading…</Text>
            </View>
          )}
          <Pressable
            onPress={onRemove}
            style={styles.removeBtn}
            hitSlop={8}
            accessibilityLabel="Remove image"
          >
            <Ionicons name="close-circle" size={24} color={Colors.danger} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.placeholderText}>No image attached</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.slotActions}>
        <Pressable
          onPress={onPickCamera}
          style={styles.actionChip}
          accessibilityRole="button"
          disabled={uploading}
        >
          <Ionicons name="camera-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionChipText}>Take photo</Text>
        </Pressable>
        <Pressable
          onPress={onPickLibrary}
          style={styles.actionChip}
          accessibilityRole="button"
          disabled={uploading}
        >
          <Ionicons name="images-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionChipText}>Choose</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ReceiptsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const subId = Number(id);

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Local editable state
  const [purchaseUri, setPurchaseUri] = useState<string | null>(null);
  const [unsubscribeUri, setUnsubscribeUri] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Upload states
  const [uploadingSlot, setUploadingSlot] = useState<ImageSlot | null>(null);
  const [saving, setSaving] = useState(false);

  // Camera/library permission denial state
  const [cameraPermDenied, setCameraPermDenied] = useState(false);
  const [libraryPermDenied, setLibraryPermDenied] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  // ── Load subscription ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setError('');
      const data = await subsApi.get(subId);
      if (!isMounted.current) return;
      setSub(data);
      setPurchaseUri(data.purchaseProofImage ?? null);
      setUnsubscribeUri(data.unsubscribeProofImage ?? null);
      setNote(data.note ?? '');
    } catch (e: unknown) {
      if (!isMounted.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [subId]);

  useEffect(() => { load(); }, [load]);

  // ── Permission helpers ───────────────────────────────────────────────────
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setCameraPermDenied(true);
      return false;
    }
    setCameraPermDenied(false);
    return true;
  };

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setLibraryPermDenied(true);
      return false;
    }
    setLibraryPermDenied(false);
    return true;
  };

  // ── Image picker helpers ─────────────────────────────────────────────────
  const pickImage = async (
    slot: ImageSlot,
    source: 'camera' | 'library'
  ) => {
    if (source === 'camera') {
      const ok = await requestCameraPermission();
      if (!ok) return;
    } else {
      const ok = await requestLibraryPermission();
      if (!ok) return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
      base64: true,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const uri =
      asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

    // Optimistic update
    if (slot === 'purchaseProofImage') setPurchaseUri(uri);
    else setUnsubscribeUri(uri);

    // Upload immediately
    setUploadingSlot(slot);
    try {
      await subsApi.update(subId, { [slot]: uri });
    } catch (e: unknown) {
      // Revert on failure
      if (slot === 'purchaseProofImage') setPurchaseUri(sub?.purchaseProofImage ?? null);
      else setUnsubscribeUri(sub?.unsubscribeProofImage ?? null);
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not save image');
    } finally {
      if (isMounted.current) setUploadingSlot(null);
    }
  };

  const removeImage = (slot: ImageSlot) => {
    Alert.alert(
      'Remove image',
      `Remove the ${SLOT_LABELS[slot]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (slot === 'purchaseProofImage') setPurchaseUri(null);
            else setUnsubscribeUri(null);
            try {
              await subsApi.update(subId, { [slot]: null });
            } catch (e: unknown) {
              // Revert
              if (slot === 'purchaseProofImage') setPurchaseUri(sub?.purchaseProofImage ?? null);
              else setUnsubscribeUri(sub?.unsubscribeProofImage ?? null);
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not remove image');
            }
          },
        },
      ]
    );
  };

  // ── Save note ────────────────────────────────────────────────────────────
  const saveNote = async () => {
    setSaving(true);
    try {
      await subsApi.update(subId, { note: note.trim() || null });
      Alert.alert('Saved', 'Note saved successfully.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save note');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen message="Loading receipts…" />;
  if (error || !sub) return <ErrorState message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Receipts & Notes</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{sub.name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Permission denial banners */}
          {cameraPermDenied && <PermissionDenied source="camera" />}
          {libraryPermDenied && <PermissionDenied source="library" />}

          {/* Image slots */}
          <Text style={styles.sectionLabel}>Proof Images</Text>
          <Text style={styles.sectionDesc}>
            Attach screenshots or photos of your receipts and cancellation confirmations.
          </Text>

          {((['purchaseProofImage', 'unsubscribeProofImage'] as ImageSlot[])).map((slot) => (
            <ImageSlotCard
              key={slot}
              slot={slot}
              imageUri={slot === 'purchaseProofImage' ? purchaseUri : unsubscribeUri}
              uploading={uploadingSlot === slot}
              onPickCamera={() => pickImage(slot, 'camera')}
              onPickLibrary={() => pickImage(slot, 'library')}
              onRemove={() => removeImage(slot)}
            />
          ))}

          {/* Note */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Note</Text>
          <Card style={styles.noteCard}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note about this subscription…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={2000}
              accessibilityLabel="Subscription note"
            />
            <View style={styles.noteFooter}>
              <Text style={styles.noteCount}>{note.length}/2000</Text>
              <Pressable
                onPress={saveNote}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save note"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={styles.saveBtnText}>Save note</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  headerSub: { color: Colors.textSecondary, fontSize: 13 },
  content: { paddingHorizontal: 24, paddingBottom: 48 },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionDesc: { color: Colors.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 19 },
  // Permission denial
  permissionBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
  },
  permissionTitle: { color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  permissionDesc: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  // Image slot card
  slotCard: { marginBottom: 16, gap: 12 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  imageWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', height: 200, borderRadius: 12 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.background + 'CC',
    borderRadius: 12,
  },
  placeholder: {
    height: 140,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { color: Colors.textMuted, fontSize: 13 },
  slotActions: { flexDirection: 'row', gap: 10 },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    minHeight: 44,
  },
  actionChipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  // Note
  noteCard: { gap: 0 },
  noteInput: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    paddingVertical: 4,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  noteCount: { color: Colors.textMuted, fontSize: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
