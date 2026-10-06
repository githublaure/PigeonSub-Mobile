import { AddSubscriptionButton } from '../../../src/components/ui/AddSubscriptionButton';
import { useTheme, useThemedStyles } from '../../../src/contexts/ThemeContext';
import type { Palette } from '../../../src/theme/colors';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { useBilling } from '../../../src/contexts/BillingContext';
import {
  canAddSubscription,
  isEnded,
  nextRenewal,
} from '../../../src/lib/subscription-math';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

type SortKey = 'name' | 'price' | 'renewal';

export default function SubscriptionsScreen() {
  const { colors: Colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const { data, follow, loading, error, reload: load } = useSubscriptionData();
  const { canUsePlus } = useBilling();
  const refreshing = false;
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('renewal');

  const add = () =>
    router.push(
      canAddSubscription(data, canUsePlus, follow)
        ? '/(tabs)/subscriptions/new'
        : '/(tabs)/premium?reason=limit',
    );

  const filtered = data
    .filter((s) => includeArchived || !isEnded(s, follow[s.id]))
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return parseFloat(b.price) - parseFloat(a.price);
      // renewal
      const da = nextRenewal(a)?.getTime() ?? Infinity;
      const db = nextRenewal(b)?.getTime() ?? Infinity;
      return da - db;
    });

  if (loading) return <LoadingScreen message="Chargement…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Abonnements</Text>
        <AddSubscriptionButton onPress={add} premium={!canAddSubscription(data, false, follow)} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color={Colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
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
            <Text
              style={[
                styles.sortChipText,
                sortBy === key && styles.sortChipTextActive,
              ]}
            >
              {{ renewal: 'Échéance', name: 'Nom', price: 'Prix' }[key]}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setIncludeArchived((v) => !v)}
          accessibilityRole="switch"
          accessibilityLabel="Afficher aussi les abonnements archivés"
          accessibilityState={{ checked: includeArchived }}
          aria-checked={includeArchived}
          style={[styles.sortChip, includeArchived && styles.sortChipActive]}
        >
          <Text
            style={[
              styles.sortChipText,
              includeArchived && styles.sortChipTextActive,
            ]}
          >
            Archives
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            archived={isEnded(item, follow[item.id])}
            onPress={() => router.push(`/(tabs)/subscriptions/${item.id}`)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && styles.listEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshing={refreshing}
        onRefresh={load}
        ListEmptyComponent={
          <EmptyState
            imageSource={require('../../../assets/mascots/pigeon-money-bag.png')}
            title="Aucun abonnement"
            description={
              search
                ? 'Essayez une autre recherche.'
                : 'Ajoutez votre premier abonnement pour voir quand agir.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: Palette) =>
  StyleSheet.create({
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
    sortChipActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    sortChipText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    sortChipTextActive: { color: Colors.white },
    list: { paddingHorizontal: 24, paddingBottom: 32 },
    listEmpty: { flexGrow: 1 },
  });
