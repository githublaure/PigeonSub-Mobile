import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { Subscription, subscriptions } from '../../src/lib/api';
import { Colors } from '../../src/theme/colors';

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function addDays(d: Date, n: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

export default function CalendarScreen() {
  const router = useRouter();
  const [allSubs, setAllSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await subscriptions.list();
      setAllSubs(data.filter((s) => s.nextRenewal));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build calendar grid for viewMonth
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map renewals to their date
  const renewalMap = new Map<string, Subscription[]>();
  allSubs.forEach((s) => {
    if (!s.nextRenewal) return;
    const d = new Date(s.nextRenewal);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!renewalMap.has(key)) renewalMap.set(key, []);
    renewalMap.get(key)!.push(s);
  });

  const calendarDays: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const selectedKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
  const selectedRenewals = renewalMap.get(selectedKey) ?? [];

  const prevMonth = () => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Upcoming 30 days list
  const upcomingDates: { date: Date; subs: Subscription[] }[] = [];
  for (let i = 0; i <= 30; i++) {
    const d = addDays(new Date(), i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const subs = renewalMap.get(key);
    if (subs?.length) upcomingDates.push({ date: d, subs });
  }

  if (loading) return <LoadingScreen message="Loading calendar…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Renewals</Text>
        </View>

        {/* Calendar */}
        <Card style={styles.calendarCard}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={Colors.text} />
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {calendarDays.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.dayCell} />;
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const hasRenewals = renewalMap.has(key);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelectedDate(day)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && styles.dayTextToday,
                  ]}>
                    {day.getDate()}
                  </Text>
                  {hasRenewals && (
                    <View style={[styles.dot, isSelected && styles.dotSelected]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Selected date renewals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{formatDate(selectedDate)}</Text>
          {selectedRenewals.length === 0 ? (
            <Text style={styles.noneText}>No renewals on this day</Text>
          ) : (
            <View style={styles.renewalList}>
              {selectedRenewals.map((sub) => (
                <Pressable
                  key={sub.id}
                  style={styles.renewalItem}
                  onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
                >
                  <View style={[styles.renewalDot, { backgroundColor: sub.categoryColor || Colors.primary }]} />
                  <Text style={styles.renewalName}>{sub.name}</Text>
                  <Text style={styles.renewalPrice}>
                    {parseFloat(sub.price).toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Next 30 days */}
        {upcomingDates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next 30 days</Text>
            {upcomingDates.map(({ date, subs }) => (
              <Card key={date.toISOString()} style={styles.upcomingCard}>
                <Text style={styles.upcomingDate}>{formatDate(date)}</Text>
                {subs.map((sub) => (
                  <Pressable
                    key={sub.id}
                    style={styles.upcomingRow}
                    onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
                  >
                    <View style={[styles.renewalDot, { backgroundColor: sub.categoryColor || Colors.primary }]} />
                    <Text style={styles.renewalName} numberOfLines={1}>{sub.name}</Text>
                    <Text style={styles.renewalPrice}>
                      {parseFloat(sub.price).toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            ))}
          </View>
        )}

        {upcomingDates.length === 0 && (
          <EmptyState icon="calendar-outline" title="Nothing renewing soon" description="No subscriptions are due in the next 30 days." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  calendarCard: { marginHorizontal: 24, marginBottom: 16 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayCellSelected: { backgroundColor: Colors.primary, borderRadius: CELL_SIZE / 2 },
  dayCellToday: { borderWidth: 1, borderColor: Colors.primary, borderRadius: CELL_SIZE / 2 },
  dayText: { color: Colors.text, fontSize: 14 },
  dayTextSelected: { color: Colors.white, fontWeight: '700' },
  dayTextToday: { color: Colors.primary, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  dotSelected: { backgroundColor: Colors.white },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  noneText: { color: Colors.textMuted, fontSize: 14 },
  renewalList: { gap: 8 },
  renewalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, minHeight: 48,
  },
  renewalDot: { width: 8, height: 8, borderRadius: 4 },
  renewalName: { flex: 1, color: Colors.text, fontSize: 15 },
  renewalPrice: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  upcomingCard: { marginBottom: 10, gap: 10 },
  upcomingDate: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
});
