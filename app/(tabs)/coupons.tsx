import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { Subscription, subscriptions as subsApi } from '../../src/lib/api';
import { Colors } from '../../src/theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtPrice(price: string): string {
  return parseFloat(price).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// CountdownBadge
// ---------------------------------------------------------------------------
function CountdownBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const urgent = days <= 7;
  const expired = days < 0;
  const bg = expired ? Colors.danger + '26' : urgent ? Colors.warning + '26' : Colors.info + '26';
  const fg = expired ? Colors.danger : urgent ? Colors.warning : Colors.info;
  const label = expired
    ? `Expired ${Math.abs(days)}d ago`
    : days === 0
    ? 'Expires today'
    : `${days}d left`;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SubscriptionRow
// ---------------------------------------------------------------------------
function SubscriptionRow({
  sub,
  dateLabel,
  dateValue,
  countdownDate,
  onPress,
}: {
  sub: Subscription;
  dateLabel: string;
  dateValue: string | null;
  countdownDate: string | null;
  onPress: () => void;
}) {
  const days = daysUntil(countdownDate);
  const accent = sub.categoryColor || Colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[styles.rowAccent, { backgroundColor: accent }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{sub.name}</Text>
          <Text style={styles.rowPrice}>{fmtPrice(sub.price)}</Text>
        </View>
        <View style={styles.rowBottom}>
          {dateValue ? (
            <Text style={styles.rowMeta}>
              <Text style={styles.rowMetaLabel}>{dateLabel} </Text>
              {fmtDate(dateValue)}
            </Text>
          ) : null}
          <CountdownBadge days={days} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.rowChevron} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ title, count, color }: { title: string; count: number; color?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.countBadge, { backgroundColor: (color || Colors.primary) + '26' }]}>
        <Text style={[styles.countText, { color: color || Colors.primary }]}>{count}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
type RowItem = {
  sub: Subscription;
  dateLabel: string;
  dateValue: string | null;
  countdownDate: string | null;
};

export default function CouponsScreen() {
  const router = useRouter();
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const list = await subsApi.list(true); // include archived to surface inactive trials
      setData(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen message="Loading trials & offers…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  // ── Group into sections ──────────────────────────────────────────────────
  const activeTrials = data.filter(
    (s) => s.isTrial && (!s.trialEndsAt || daysUntil(s.trialEndsAt) === null || daysUntil(s.trialEndsAt)! >= 0)
  );
  const expiringSoon = data.filter(
    (s) => s.trialEndsAt && daysUntil(s.trialEndsAt) !== null && daysUntil(s.trialEndsAt)! <= 14 && daysUntil(s.trialEndsAt)! >= 0
  );
  const expiredTrials = data.filter(
    (s) => s.trialEndsAt && daysUntil(s.trialEndsAt) !== null && daysUntil(s.trialEndsAt)! < 0
  );
  const suspects = data.filter((s) => s.isSuspect || s.isFlagged);

  const toItem = (s: Subscription, dateLabel: string, dateValue: string | null, countdownDate: string | null): RowItem => ({
    sub: s,
    dateLabel,
    dateValue,
    countdownDate,
  });

  const sections = [
    {
      key: 'expiring',
      title: 'Expiring Soon',
      color: Colors.warning,
      data: expiringSoon.map((s) => toItem(s, 'Ends', s.trialEndsAt, s.trialEndsAt)),
    },
    {
      key: 'active',
      title: 'Active Trials',
      color: Colors.info,
      data: activeTrials.map((s) => toItem(s, 'Ends', s.trialEndsAt, s.trialEndsAt)),
    },
    {
      key: 'suspects',
      title: 'Review Candidates',
      color: Colors.danger,
      data: suspects.map((s) =>
        toItem(s, 'Renews', s.nextRenewal, s.nextRenewal)
      ),
    },
    {
      key: 'expired',
      title: 'Expired Trials',
      color: Colors.textMuted,
      data: expiredTrials.map((s) => toItem(s, 'Ended', s.trialEndsAt, s.trialEndsAt)),
    },
  ].filter((sec) => sec.data.length > 0);

  const totalCount = activeTrials.length + expiringSoon.length + suspects.length + expiredTrials.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trials & Suspects</Text>
        {totalCount > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{totalCount}</Text>
          </View>
        )}
      </View>

      {/* Summary chips */}
      {totalCount > 0 && (
        <View style={styles.summaryRow}>
          {expiringSoon.length > 0 && (
            <View style={[styles.chip, { borderColor: Colors.warning }]}>
              <Text style={[styles.chipText, { color: Colors.warning }]}>
                ⚠️ {expiringSoon.length} expiring
              </Text>
            </View>
          )}
          {suspects.length > 0 && (
            <View style={[styles.chip, { borderColor: Colors.danger }]}>
              <Text style={[styles.chipText, { color: Colors.danger }]}>
                🚩 {suspects.length} to review
              </Text>
            </View>
          )}
          {activeTrials.length > 0 && (
            <View style={[styles.chip, { borderColor: Colors.info }]}>
              <Text style={[styles.chipText, { color: Colors.info }]}>
                🧪 {activeTrials.length} active
              </Text>
            </View>
          )}
        </View>
      )}

      {totalCount === 0 ? (
        <EmptyState
          icon="ribbon-outline"
          title="Nothing to review"
          description="No active trials, expiring subscriptions, or suspects here."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => `${item.sub.id}-${idx}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <SectionHeader
              title={section.title}
              count={section.data.length}
              color={section.color}
            />
          )}
          renderItem={({ item }) => (
            <Card style={styles.itemCard}>
              <SubscriptionRow
                sub={item.sub}
                dateLabel={item.dateLabel}
                dateValue={item.dateValue}
                countdownDate={item.countdownDate}
                onPress={() => router.push(`/(tabs)/subscriptions/${item.sub.id}`)}
              />
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
          renderSectionFooter={() => <View />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  totalBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  totalBadgeText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: { fontSize: 11, fontWeight: '700' },
  itemCard: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowContent: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { color: Colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  rowPrice: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMeta: { color: Colors.textSecondary, fontSize: 12, flex: 1 },
  rowMetaLabel: { fontWeight: '600' },
  rowChevron: { paddingRight: 12 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
