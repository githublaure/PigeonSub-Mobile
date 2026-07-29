import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { SubscriptionCard } from '../../../src/components/ui/SubscriptionCard';
import { Subscription, subscriptions } from '../../../src/lib/api';
import { Colors } from '../../../src/theme/colors';

type SortKey = 'name' | 'price' | 'renewal';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('renewal');

  const load = useCallback(async () => {
    try {
      setError('');
      const list = await subscriptions.list(includeArchived);
      setData(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeArchived]);

  useEffect(() => { load(); }, [load]);

  const filtered = data
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return parseFloat(b.price) - parseFloat(a.price);
      // renewal
      const da = a.nextRenewal ? new Date(a.nextRenewal).getTime() : Infinity;
      const db = b.nextRenewal ? new Date(b.nextRenewal).getTime() : Infinity;
      return da - db;
    });

  if (loading) return <LoadingScreen message="Loading subscriptions…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Subscriptions</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/subscriptions/new')}
          style={styles.addBtn}
          accessibilityLabel="Add subscription"
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subscriptions…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        {(['renewal', 'name', 'price'] as SortKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setSortBy(key)}
            style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
          >
            <Text style={[styles.sortChipText, sortBy === key && styles.sortChipTextActive]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setIncludeArchived((v) => !v)}
          style={[styles.sortChip, includeArchived && styles.sortChipActive]}
        >
          <Text style={[styles.sortChipText, includeArchived && styles.sortChipTextActive]}>
            Archived
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            onPress={() => router.push(`/(tabs)/subscriptions/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        ListEmptyComponent={
          <EmptyState
            icon="card-outline"
            title="No subscriptions found"
            description={search ? 'Try a different search term.' : 'Tap + to add your first subscription.'}
            actionLabel={search ? undefined : 'Add subscription'}
            onAction={search ? undefined : () => router.push('/(tabs)/subscriptions/new')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 34,
  },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  sortChipTextActive: { color: Colors.white },
  list: { paddingHorizontal: 24, paddingBottom: 32 },
});
