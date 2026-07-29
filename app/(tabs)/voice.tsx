import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { Subscription, subscriptions as subsApi, voice, VoiceReminder } from '../../src/lib/api';
import { Colors } from '../../src/theme/colors';

const EL_KEY_STORAGE = 'pigeonsub_elevenlabs_key';
const REMINDER_TYPES = ['renewal', 'cancellation', 'usage'] as const;
type ReminderType = typeof REMINDER_TYPES[number];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VoiceScreen() {
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [reminders, setReminders] = useState<VoiceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [reminderType, setReminderType] = useState<ReminderType>('renewal');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [playing, setPlaying] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [subList, storedKey, allReminders] = await Promise.all([
        subsApi.list(),
        SecureStore.getItemAsync(EL_KEY_STORAGE),
        voice.getAllReminders(),
      ]);
      setSubs(subList);
      if (storedKey) setElevenLabsKey(storedKey);
      setReminders(allReminders);

      // Pre-select from navigation param
      if (params.subscriptionId) {
        const match = subList.find((s) => s.id === Number(params.subscriptionId));
        if (match) setSelectedSub(match);
      } else if (subList.length > 0) {
        setSelectedSub(subList[0]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [params.subscriptionId]);

  useEffect(() => { load(); }, [load]);

  const saveKey = async (key: string) => {
    await SecureStore.setItemAsync(EL_KEY_STORAGE, key);
    setElevenLabsKey(key);
    setShowKeyModal(false);
    setTempKey('');
  };

  /** Build the text the backend forwards to ElevenLabs */
  const buildReminderText = (sub: Subscription, type: ReminderType): string => {
    const price = parseFloat(sub.price).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
    });
    if (type === 'renewal') {
      return `Hey! Your ${sub.name} subscription for ${price} is renewing soon. Do you still want to keep it?`;
    }
    if (type === 'cancellation') {
      return `Heads up — you might want to cancel ${sub.name}. You're paying ${price} and barely using it. Time to cut the cord?`;
    }
    return `Quick check: how often are you actually using ${sub.name}? You're paying ${price} every ${sub.frequency} for it. Worth it?`;
  };

  const generate = async () => {
    if (!selectedSub) return Alert.alert('Select a subscription first');
    if (!elevenLabsKey) { setShowKeyModal(true); return; }
    setGenError('');
    setGenerating(true);
    try {
      const text = buildReminderText(selectedSub, reminderType);
      const reminder = await voice.generate(
        { subscriptionId: selectedSub.id, reminderType, text },
        elevenLabsKey
      );
      setReminders((prev) => [reminder, ...prev]);
      Alert.alert('🎙️ Reminder generated!', 'Scroll down to play it.');
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const playAudio = async (reminder: VoiceReminder) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (playing === reminder.id) { setPlaying(null); return; }

      const { sound } = await Audio.Sound.createAsync({ uri: reminder.audioUrl });
      soundRef.current = sound;
      setPlaying(reminder.id);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlaying(null);
      });
    } catch {
      Alert.alert('Playback error', 'Could not play this reminder.');
    }
  };

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  if (loading) return <LoadingScreen message="Loading voice reminders…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const subReminders = selectedSub
    ? reminders.filter((r) => r.subscriptionId === selectedSub.id)
    : reminders;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Voice Reminders 🎙️</Text>
          <Pressable onPress={() => setShowKeyModal(true)} hitSlop={8} style={styles.keyBtn}>
            <Ionicons name="key-outline" size={20} color={elevenLabsKey ? Colors.success : Colors.warning} />
          </Pressable>
        </View>

        {!elevenLabsKey && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ ElevenLabs API key required. Tap the key icon to add it — your key is stored securely on-device only.
            </Text>
          </Card>
        )}

        {/* Subscription picker */}
        <Text style={styles.sectionLabel}>Subscription</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subPicker} contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
          {subs.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSelectedSub(s)}
              style={[styles.subChip, selectedSub?.id === s.id && styles.subChipActive]}
            >
              <Text style={[styles.subChipText, selectedSub?.id === s.id && styles.subChipTextActive]} numberOfLines={1}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Reminder type */}
        <Text style={styles.sectionLabel}>Reminder type</Text>
        <View style={styles.typeRow}>
          {REMINDER_TYPES.map((t) => (
            <Pressable key={t} onPress={() => setReminderType(t)} style={[styles.typeChip, reminderType === t && styles.typeChipActive]}>
              <Text style={[styles.typeChipText, reminderType === t && styles.typeChipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {genError ? <Text style={styles.genError}>{genError}</Text> : null}

        <Button
          title={generating ? 'Generating…' : '🎙️ Generate reminder'}
          onPress={generate}
          loading={generating}
          disabled={!selectedSub}
          fullWidth
          size="lg"
          style={styles.generateBtn}
        />

        {/* Past reminders */}
        <Text style={styles.sectionLabel}>
          {selectedSub ? `Past reminders for ${selectedSub.name}` : 'All past reminders'}
        </Text>

        {subReminders.length === 0 ? (
          <EmptyState
            icon="mic-off-outline"
            title="No reminders yet"
            description="Generate your first voice reminder above."
          />
        ) : (
          <View style={styles.reminderList}>
            {subReminders.map((r) => (
              <Card key={r.id} style={styles.reminderCard}>
                <View style={styles.reminderRow}>
                  <View style={styles.reminderMeta}>
                    <Text style={styles.reminderType}>{r.reminderType}</Text>
                    <Text style={styles.reminderDate}>{formatDate(r.createdAt)}</Text>
                  </View>
                  <Pressable
                    onPress={() => playAudio(r)}
                    style={[styles.playBtn, playing === r.id && styles.playBtnActive]}
                    accessibilityLabel={playing === r.id ? 'Stop playback' : 'Play reminder'}
                  >
                    <Ionicons
                      name={playing === r.id ? 'stop' : 'play'}
                      size={20}
                      color={playing === r.id ? Colors.white : Colors.primary}
                    />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ElevenLabs key modal */}
      <Modal visible={showKeyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>ElevenLabs API Key</Text>
            <Text style={styles.modalSubtitle}>
              Your key is stored in SecureStore on this device. When you generate a reminder, it is sent to the PigeonSub backend as a request header, which then calls ElevenLabs on your behalf. It is never stored server-side.
            </Text>
            <TextInput
              style={styles.keyInput}
              placeholder="Paste your ElevenLabs key…"
              placeholderTextColor={Colors.textMuted}
              value={tempKey}
              onChangeText={setTempKey}
              secureTextEntry={!keyVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setKeyVisible((v) => !v)} style={styles.keyToggle}>
              <Ionicons name={keyVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textSecondary} />
              <Text style={styles.keyToggleText}>{keyVisible ? 'Hide' : 'Show'}</Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowKeyModal(false)} />
              <Button title="Save" onPress={() => saveKey(tempKey)} disabled={!tempKey.trim()} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  keyBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  warningCard: { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#2D2000' },
  warningText: { color: Colors.warning, fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginHorizontal: 24, marginBottom: 8, marginTop: 16,
  },
  subPicker: { paddingLeft: 24, marginBottom: 4 },
  subChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 40 },
  subChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  subChipText: { color: Colors.textSecondary, fontSize: 13 },
  subChipTextActive: { color: Colors.white, fontWeight: '600' },
  typeRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', minHeight: 44 },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { color: Colors.textSecondary, fontSize: 13 },
  typeChipTextActive: { color: Colors.white, fontWeight: '600' },
  genError: { color: Colors.danger, fontSize: 14, paddingHorizontal: 24 },
  generateBtn: { marginHorizontal: 24, marginTop: 8 },
  reminderList: { paddingHorizontal: 24, gap: 10, marginTop: 8 },
  reminderCard: { padding: 14 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderMeta: { flex: 1, gap: 4 },
  reminderType: { color: Colors.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  reminderDate: { color: Colors.textSecondary, fontSize: 12 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  playBtnActive: { backgroundColor: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  modalSubtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  keyInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, color: Colors.text, fontSize: 15,
  },
  keyToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyToggleText: { color: Colors.textSecondary, fontSize: 13 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});
