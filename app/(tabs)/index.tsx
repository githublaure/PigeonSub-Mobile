import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { SubscriptionCard } from '../../src/components/ui/SubscriptionCard';
import { useAuth } from '../../src/contexts/AuthContext';
import { Stats, statsApi, Subscription, subscriptions } from '../../src/lib/api';
import { Colors } from '../../src/theme/colors';

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card style={styles.statCard} elevated>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function fmt(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [s, u] = await Promise.all([
        statsApi.get(),
        subscriptions.upcoming(30),
      ]);
      setStats(s);
      setUpcoming(u.slice(0, 5));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) return <LoadingScreen message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  // Parse backend numeric-string fields
  const monthlyTotal = parseFloat(stats?.totalMonthlyCost ?? '0');
  const wastedEst = parseFloat(stats?.wastedEstimate ?? '0');
  const budgetGap = parseFloat(stats?.budgetGap ?? '0');
  const budgetCap = stats?.budgetCap ?? 0;
  const budgetPct = budgetCap > 0 ? Math.min(100, (monthlyTotal / budgetCap) * 100) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey {user?.name?.split(' ')[0]} 🐦</Text>
            <Text style={styles.subheading}>Here's your subscription snapshot</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/subscriptions/new')}
            style={styles.addBtn}
            accessibilityLabel="Add subscription"
            hitSlop={8}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        </View>

        {/* Stat cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsRow}
          contentContainerStyle={{ gap: 12, paddingRight: 24 }}
        >
          <StatCard label="Monthly spend" value={fmt(monthlyTotal)} />
          {budgetCap > 0 && (
            <StatCard
              label="Budget left"
              value={fmt(Math.max(0, budgetCap - monthlyTotal))}
              accent={budgetGap > 0 ? Colors.danger : Colors.success}
            />
          )}
          {(stats?.suspectCount ?? 0) > 0 && (
            <StatCard
              label="Suspects"
              value={`${stats!.suspectCount} sub${stats!.suspectCount !== 1 ? 's' : ''}`}
              accent={Colors.warning}
            />
          )}
          {wastedEst > 0 && (
            <StatCard label="Wasted est." value={fmt(wastedEst)} accent={Colors.danger} />
          )}
        </ScrollView>

        {/* Budget bar */}
        {budgetPct !== null && (
          <Card style={styles.budgetCard}>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Budget usage</Text>
              <Text style={[styles.budgetPct, budgetPct > 90 && { color: Colors.danger }]}>
                {Math.round(budgetPct)}%
              </Text>
            </View>
            <View style={styles.budgetTrack}>
              <View
                style={[
                  styles.budgetFill,
                  {
                    width: `${budgetPct}%` as `${number}%`,
                    backgroundColor: budgetPct > 90 ? Colors.danger : Colors.primary,
                  },
                ]}
              />
            </View>
          </Card>
        )}

        {/* Upcoming renewals */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Renewing soon</Text>
              <Pressable onPress={() => router.push('/(tabs)/calendar')} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.list}>
              {upcoming.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Trials & Suspects quick-link */}
        {((stats?.trialCount ?? 0) > 0 || (stats?.suspectCount ?? 0) > 0) && (
          <Pressable
            style={styles.trialsCard}
            onPress={() => router.push('/(tabs)/coupons')}
            accessibilityRole="button"
          >
            <View style={styles.trialsLeft}>
              <Text style={styles.trialsTitle}>Trials & Suspects</Text>
              <Text style={styles.trialsDesc}>
                {[
                  (stats?.trialCount ?? 0) > 0 ? `${stats!.trialCount} trial${stats!.trialCount !== 1 ? 's' : ''}` : null,
                  (stats?.suspectCount ?? 0) > 0 ? `${stats!.suspectCount} suspect${stats!.suspectCount !== 1 ? 's' : ''}` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.warning} />
          </Pressable>
        )}

        {/* Category breakdown */}
        {stats?.categoryTotals && Object.keys(stats.categoryTotals).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By category</Text>
            <Card style={styles.categoryCard}>
              {Object.entries(stats.categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, total]) => {
                  const pct = monthlyTotal > 0 ? (total / monthlyTotal) * 100 : 0;
                  return (
                    <View key={cat} style={styles.categoryRow}>
                      <Text style={styles.categoryName}>{cat}</Text>
                      <View style={styles.categoryBar}>
                        <View style={[styles.categoryFill, { width: `${pct}%` as `${number}%` }]} />
                      </View>
                      <Text style={styles.categoryAmount}>{fmt(total)}</Text>
                    </View>
                  );
                })}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  subheading: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { paddingLeft: 24, marginBottom: 16 },
  statCard: { width: 140, gap: 4 },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: 12 },
  budgetCard: { marginHorizontal: 24, marginBottom: 24, gap: 10 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabel: { color: Colors.textSecondary, fontSize: 13 },
  budgetPct: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  budgetTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: 6, borderRadius: 3 },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  seeAll: { color: Colors.primary, fontSize: 14 },
  list: { gap: 10 },
  categoryCard: { gap: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryName: {
    color: Colors.textSecondary,
    fontSize: 13,
    width: 90,
    textTransform: 'capitalize',
  },
  categoryBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  categoryAmount: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    width: 70,
    textAlign: 'right',
  },
  trialsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.warning + '66',
    padding: 16,
    minHeight: 60,
  },
  trialsLeft: { flex: 1, gap: 4 },
  trialsTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  trialsDesc: { color: Colors.textSecondary, fontSize: 13 },
});
