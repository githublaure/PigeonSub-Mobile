import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { Stats, statsApi } from '../../src/lib/api';
import { Colors } from '../../src/theme/colors';

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: color || Colors.primary }]} />
      </View>
      <Text style={styles.barValue}>{fmt(value)}</Text>
    </View>
  );
}

/** Keys returned by usageBreakdown */
const USAGE_LABELS: Record<string, string> = {
  very_used: 'Very used',
  used: 'Used',
  rarely_used: 'Rarely used',
};
const USAGE_COLORS: Record<string, string> = {
  very_used: Colors.success,
  used: Colors.info,
  rarely_used: Colors.warning,
};
const CATEGORY_COLORS = ['#7C3AED', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeLifetime, setIncludeLifetime] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await statsApi.get({ includeArchived, includeLifetime });
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeArchived, includeLifetime]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen message="Loading statistics…" />;
  if (error || !stats) return <ErrorState message={error} onRetry={load} />;

  // Parse the numeric-string fields returned by the backend
  const monthlyTotal = parseFloat(stats.totalMonthlyCost);
  const suspectMonthly = parseFloat(stats.suspectMonthly);
  const wastedEst = parseFloat(stats.wastedEstimate);
  const budgetGap = parseFloat(stats.budgetGap);

  const maxCategory = Math.max(...Object.values(stats.categoryTotals), 0);
  const maxUsage = Math.max(...Object.values(stats.usageBreakdown), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Statistics</Text>
        </View>

        {/* Toggles */}
        <View style={styles.toggleRow}>
          {[
            { label: 'Include archived', value: includeArchived, onToggle: () => setIncludeArchived((v) => !v) },
            { label: 'Lifetime view', value: includeLifetime, onToggle: () => setIncludeLifetime((v) => !v) },
          ].map(({ label, value, onToggle }) => (
            <Pressable key={label} onPress={onToggle} style={[styles.toggle, value && styles.toggleActive]}>
              <Text style={[styles.toggleText, value && styles.toggleTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard} elevated>
            <Text style={styles.summaryValue}>{fmt(monthlyTotal)}</Text>
            <Text style={styles.summaryLabel}>Monthly spend</Text>
          </Card>

          {stats.budgetCap > 0 && (
            <Card style={styles.summaryCard} elevated>
              <Text style={[
                styles.summaryValue,
                budgetGap > 0 ? { color: Colors.danger } : { color: Colors.success },
              ]}>
                {fmt(Math.abs(budgetGap))}
              </Text>
              <Text style={styles.summaryLabel}>
                {budgetGap > 0 ? 'Over budget' : 'Under budget'}
              </Text>
            </Card>
          )}

          <Card style={styles.summaryCard} elevated>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>{fmt(wastedEst)}</Text>
            <Text style={styles.summaryLabel}>Wasted estimate</Text>
          </Card>

          {stats.suspectCount > 0 && (
            <Card style={styles.summaryCard} elevated>
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>{stats.suspectCount}</Text>
              <Text style={styles.summaryLabel}>Suspect subs</Text>
            </Card>
          )}

          <Card style={styles.summaryCard} elevated>
            <Text style={styles.summaryValue}>{stats.activeSubscriptions}</Text>
            <Text style={styles.summaryLabel}>Active subs</Text>
          </Card>

          {stats.trialCount > 0 && (
            <Card style={styles.summaryCard} elevated>
              <Text style={[styles.summaryValue, { color: Colors.info }]}>{stats.trialCount}</Text>
              <Text style={styles.summaryLabel}>Trials</Text>
            </Card>
          )}
        </View>

        {/* Category breakdown */}
        {Object.keys(stats.categoryTotals).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spend by category</Text>
            <Card>
              {Object.entries(stats.categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, val], i) => (
                  <BarRow
                    key={cat}
                    label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    value={val}
                    max={maxCategory}
                    color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  />
                ))}
            </Card>
          </View>
        )}

        {/* Usage breakdown — keys: very_used | used | rarely_used */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage breakdown</Text>
          <Card>
            {Object.entries(stats.usageBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([usageKey, count]) => (
                <View key={usageKey} style={styles.usageRow}>
                  <View style={[styles.usageDot, { backgroundColor: USAGE_COLORS[usageKey] || Colors.primary }]} />
                  <Text style={styles.barLabel}>{USAGE_LABELS[usageKey] ?? usageKey}</Text>
                  <View style={styles.usageBarTrack}>
                    <View style={[styles.barFill, {
                      width: maxUsage > 0 ? `${(count / maxUsage) * 100}%` as `${number}%` : '0%',
                      backgroundColor: USAGE_COLORS[usageKey] || Colors.primary,
                    }]} />
                  </View>
                  <Text style={styles.usageCount}>{count}</Text>
                </View>
              ))}
          </Card>
        </View>

        {/* Key numbers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key numbers</Text>
          <Card style={{ gap: 12 }}>
            <StatRow label="Monthly total" value={fmt(monthlyTotal)} />
            <StatRow label="Wasted estimate" value={fmt(wastedEst)} accent={Colors.danger} />
            <StatRow label="Suspect total" value={fmt(suspectMonthly)} accent={Colors.warning} />
            <StatRow label="Suspect count" value={`${stats.suspectCount} subscriptions`} />
            <StatRow label="Budget cap" value={fmt(stats.budgetCap)} />
            <StatRow
              label="Budget gap"
              value={fmt(Math.abs(budgetGap))}
              accent={budgetGap > 0 ? Colors.danger : Colors.success}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  toggle: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 36 },
  toggleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { color: Colors.textSecondary, fontSize: 13 },
  toggleTextActive: { color: Colors.white, fontWeight: '600' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  summaryCard: { width: '47%', gap: 6 },
  summaryValue: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: Colors.textSecondary, fontSize: 12 },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: Colors.textSecondary, fontSize: 14 },
  statValue: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel: { color: Colors.textSecondary, fontSize: 13, width: 90, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { color: Colors.text, fontSize: 12, width: 72, textAlign: 'right', fontWeight: '600' },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  usageDot: { width: 10, height: 10, borderRadius: 5 },
  usageBarTrack: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  usageCount: { color: Colors.text, fontSize: 14, fontWeight: '700', width: 28, textAlign: 'right' },
});
