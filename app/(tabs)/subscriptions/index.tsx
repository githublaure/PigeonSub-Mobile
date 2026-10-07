import { CategoryFilters } from '../../../src/components/CategoryFilters';
import { normalizeCategory } from '../../../src/lib/categories';
import { FilterRail } from '../../../src/components/ui/FilterRail';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useBilling } from '../../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { canAddSubscription, isEnded, monthlyCost, nextRenewal } from '../../../src/lib/subscription-math';
import { SUBSCRIPTION_VIEWS, filterSubscriptions, sortBySafetyDate, sortNewestFirst, subscriptionSafetyDate, type SafetyView, type SubscriptionView } from '../../../src/lib/subscription-views';
import { SafetyViewToggle } from '../../../src/components/SafetyViewToggle';
import { AddSubscriptionButton } from '../../../src/components/ui/AddSubscriptionButton';
import { SubscriptionCard } from '../../../src/components/ui/SubscriptionCard';
import { GuideAnchor } from '../../../src/components/guide/GuideScrollView';
import { Page, useUI } from '../../../src/components/ui/Page';
import { Button } from '../../../src/components/ui/Button';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../../src/components/ui/ErrorState';

export default function SubscriptionsScreen() {
  const { colors: c } = useTheme();
  const ui = useUI();
  const router = useRouter();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  const { canUsePlus } = useBilling();
  const { view: routeView, reset, select } = useLocalSearchParams<{ view?: string; reset?: string; select?: string }>();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<SubscriptionView>('all');
  const [sort, setSort] = useState<'newest' | 'renewal' | 'name' | 'price'>('newest');
  const [safetyView, setSafetyView] = useState<SafetyView>('hidden');
  useEffect(() => { if (SUBSCRIPTION_VIEWS.some(v => v.id === routeView)) { setView(routeView as SubscriptionView); setCategory('all'); setSearch(''); setSort('newest'); setSafetyView('hidden'); } }, [routeView, select]);
  useEffect(() => { if (reset) { setView('all'); setCategory('all'); setSearch(''); setSort('newest'); setSafetyView('hidden'); } }, [reset]);
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const matching = sortNewestFirst(filterSubscriptions(data, follow, view))
    .filter(s => category === 'all' || normalizeCategory(s.category) === category)
    .filter(s => `${s.name} ${s.category}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')))
    .sort((a, b) => sort === 'newest' ? 0 : sort === 'name' ? a.name.localeCompare(b.name) : sort === 'price' ? monthlyCost(b) - monthlyCost(a) : (nextRenewal(a)?.getTime() ?? Infinity) - (nextRenewal(b)?.getTime() ?? Infinity));
  const filtered = safetyView === 'sorted' ? sortBySafetyDate(matching, follow) : matching;
  return <Page title="Abonnements" headerAccessory={<AddSubscriptionButton onPress={() => router.push(canAddSubscription(data, canUsePlus, follow) ? '/(tabs)/subscriptions/new' : '/(tabs)/premium?reason=limit')} premium={!canAddSubscription(data, false, follow)} />}>
    <Button title="Importer un CSV · prototype" variant="ghost" onPress={() => router.push('/(tabs)/subscriptions/import')} />
    <GuideAnchor id="subscription-views"><View style={{ gap: 12 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.label}>VUE DES ABONNEMENTS</Text><Text style={ui.small}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</Text></View>
      <FilterRail label="Vue" value={view} onChange={setView} options={SUBSCRIPTION_VIEWS.map(option => ({ ...option, count: filterSubscriptions(data, follow, option.id).length }))} testID="subscription-view-tags" />
      <CategoryFilters value={category} onChange={setCategory} categories={data.map(s => s.category)} />
      <View style={[ui.input, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 0 }]}><Ionicons name="search-outline" size={19} color={c.textMuted} /><TextInput accessibilityLabel="Rechercher un abonnement" placeholder="Rechercher un abonnement…" placeholderTextColor={c.textMuted} value={search} onChangeText={setSearch} style={{ flex: 1, minHeight: 46, color: c.text, fontSize: 15 }} /></View>
      <View style={[ui.row, { gap: 6 }]}>
        {(['newest', 'renewal', 'name', 'price'] as const).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`Trier par ${{ newest: 'ajout récent', renewal: 'échéance', name: 'nom', price: 'coût mensuel' }[key]}`} accessibilityState={{ checked: sort === key && safetyView !== 'sorted' }} aria-checked={sort === key && safetyView !== 'sorted'} onPress={() => { setSort(key); if (safetyView === 'sorted') setSafetyView('visible'); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: sort === key && safetyView !== 'sorted' ? c.surfaceRaised : 'transparent' }}><Text style={{ color: sort === key && safetyView !== 'sorted' ? c.primary : c.textSecondary, fontSize: 12 }}>{({ newest: 'Récents', renewal: 'Échéance', name: 'Nom', price: 'Coût mensuel' })[key]}</Text></Pressable>)}
      </View>
      <SafetyViewToggle value={safetyView} onChange={setSafetyView} testID="subscriptions-safety-toggle" />
    </View></GuideAnchor>
    <View style={{ gap: 10 }} testID="subscription-results">
      {filtered.map(sub => <SubscriptionCard key={sub.id} subscription={sub} archived={isEnded(sub, follow[sub.id])} showSafety={safetyView !== 'hidden'} safetyDate={subscriptionSafetyDate(sub, follow)} onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} />)}
      {!filtered.length && <View style={ui.card}><Text style={ui.heading}>Aucun abonnement dans cette vue</Text><Text style={ui.body}>Changez de vue ou de recherche.</Text><Button title="Réinitialiser les filtres" variant="secondary" onPress={() => { setView('all'); setCategory('all'); setSearch(''); setSort('newest'); setSafetyView('hidden'); }} /></View>}
    </View>
  </Page>;
}
