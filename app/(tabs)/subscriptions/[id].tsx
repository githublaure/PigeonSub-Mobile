import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../../../src/components/ui/Card';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { Subscription, subscriptions } from '../../../src/lib/api';
import { Colors } from '../../../src/theme/colors';

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await subscriptions.get(Number(id));
      setSub(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = () => {
    Alert.alert(
      'Delete subscription',
      `Are you sure you want to delete "${sub?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptions.remove(Number(id));
              router.back();
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingScreen />;
  if (error || !sub) return <ErrorState message={error} onRetry={load} />;

  const accentColor = sub.categoryColor || Colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{sub.name}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push(`/(tabs)/subscriptions/${id}/edit`)}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityLabel="Edit subscription"
          >
            <Ionicons name="pencil-outline" size={20} color={Colors.text} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityLabel="Delete subscription"
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: sub.bgColor || Colors.surface }]}>
          <View style={[styles.heroBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.heroBadgeText}>{sub.category.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroName}>{sub.name}</Text>
          <Text style={styles.heroPrice}>
            {parseFloat(sub.price).toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
            <Text style={styles.heroFreq}>/{sub.frequency}</Text>
          </Text>
          {sub.isTrial && <Text style={styles.trialBadge}>🧪 Trial</Text>}
        </View>

        {/* Details */}
        <Card style={styles.card}>
          <Row label="Category" value={sub.category} />
          <Row label="Usage" value={sub.usageFrequency} />
          {sub.rating !== null && <Row label="Rating" value={'★'.repeat(sub.rating) + '☆'.repeat(5 - sub.rating)} />}
          <Row label="Next renewal" value={formatDate(sub.nextRenewal)} />
          <Row label="Safety date" value={sub.useSafetyDate ? formatDate(sub.safetyDate) : null} />
          <Row label="Trial ends" value={sub.isTrial ? formatDate(sub.trialEndsAt) : null} />
          <Row label="Purchase date" value={formatDate(sub.purchaseDate)} />
          <Row label="Active" value={sub.isActive ? 'Yes' : 'No'} />
          {sub.isSuspect && <Row label="Status" value="⚠️ Suspect — you may not be using this" />}
          {sub.isFlagged && <Row label="Flagged" value="🚩 Flagged for review" />}
        </Card>

        {/* Note */}
        {sub.note ? (
          <Card style={styles.card}>
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{sub.note}</Text>
          </Card>
        ) : null}

        {/* Receipts */}
        {(sub.purchaseProofImage || sub.unsubscribeProofImage) ? (
          <Card style={styles.card}>
            <Text style={styles.noteLabel}>Receipts</Text>
            {sub.purchaseProofImage ? (
              <Image source={{ uri: sub.purchaseProofImage }} style={styles.receipt} resizeMode="cover" />
            ) : null}
            {sub.unsubscribeProofImage ? (
              <Image source={{ uri: sub.unsubscribeProofImage }} style={styles.receipt} resizeMode="cover" />
            ) : null}
          </Card>
        ) : null}

        {/* Receipts & Notes link */}
        <Pressable
          style={[styles.voiceLink, styles.receiptsLink]}
          onPress={() => router.push(`/(tabs)/subscriptions/${id}/receipts`)}
        >
          <Ionicons name="receipt-outline" size={20} color={Colors.info} />
          <Text style={[styles.voiceLinkText, { color: Colors.info }]}>Receipts & Notes</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.info} />
        </Pressable>

        {/* Voice reminder link */}
        <Pressable
          style={styles.voiceLink}
          onPress={() => router.push(`/(tabs)/voice?subscriptionId=${id}`)}
        >
          <Ionicons name="mic-outline" size={20} color={Colors.primary} />
          <Text style={styles.voiceLinkText}>Generate voice reminder</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  hero: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroName: { color: Colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroPrice: { color: Colors.text, fontSize: 32, fontWeight: '800' },
  heroFreq: { color: Colors.textSecondary, fontSize: 16, fontWeight: '400' },
  trialBadge: { color: Colors.textSecondary, fontSize: 14 },
  card: { marginHorizontal: 24, marginBottom: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowLabel: { color: Colors.textSecondary, fontSize: 14 },
  rowValue: { color: Colors.text, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  noteLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  receipt: { width: '100%', height: 200, borderRadius: 10, marginTop: 8 },
  voiceLink: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    minHeight: 52,
  },
  voiceLinkText: { flex: 1, color: Colors.primary, fontWeight: '600', fontSize: 15 },
  receiptsLink: {
    marginBottom: 12,
    backgroundColor: Colors.info + '1A',
  },
});
