import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useBilling } from '../../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { canAddSubscription, isEnded, monthlyCost, nextRenewal } from '../../../src/lib/subscription-math';
import { SUBSCRIPTION_VIEWS, filterSubscriptions, sortBySafetyDate, subscriptionSafetyDate, type SafetyView, type SubscriptionView } from '../../../src/lib/subscription-views';
import { SafetyViewToggle } from '../../../src/components/SafetyViewToggle';
import { AddSubscriptionButton } from '../../../src/components/ui/AddSubscriptionButton';
import { SubscriptionCalendar } from '../../../src/components/SubscriptionCalendar';
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
  const { view: routeView } = useLocalSearchParams<{ view?: string }>();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<SubscriptionView>('active');
  const [sort, setSort] = useState<'renewal' | 'name' | 'price'>('renewal');
  const [safetyView, setSafetyView] = useState<SafetyView>('hidden');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayIds, setDayIds] = useState<number[]>([]);
  useEffect(() => { if (SUBSCRIPTION_VIEWS.some(v => v.id === routeView)) setView(routeView as SubscriptionView); }, [routeView]);
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const matching = filterSubscriptions(data, follow, view)
    .filter(s => !selectedDay || dayIds.includes(s.id))
    .filter(s => `${s.name} ${s.category}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'price' ? monthlyCost(b) - monthlyCost(a) : (nextRenewal(a)?.getTime() ?? Infinity) - (nextRenewal(b)?.getTime() ?? Infinity));
  const filtered = safetyView === 'sorted' ? sortBySafetyDate(matching, follow) : matching;
  return <Page title="Abonnements" headerAccessory={<AddSubscriptionButton onPress={() => router.push(canAddSubscription(data, canUsePlus, follow) ? '/(tabs)/subscriptions/new' : '/(tabs)/premium?reason=limit')} premium={!canAddSubscription(data, false, follow)} />}>
    <SubscriptionCalendar data={data} follow={follow} selected={selectedDay} onSelect={(day, ids) => { setSelectedDay(day); setDayIds(ids); }} />
    <GuideAnchor id="subscription-views"><View style={{ gap: 12 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.label}>VUE DES ABONNEMENTS</Text><Text style={ui.small}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</Text></View>
      <View style={[ui.row, { gap: 6 }]} testID="subscription-view-tags">
        {SUBSCRIPTION_VIEWS.map(option => {
          const count = filterSubscriptions(data, follow, option.id).filter(s => !selectedDay || dayIds.includes(s.id)).length;
          return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={`Vue ${option.label}`} accessibilityState={{ checked: view === option.id }} aria-checked={view === option.id} onPress={() => setView(option.id)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 16, backgroundColor: view === option.id ? c.primary : c.surface, borderWidth: 1, borderColor: view === option.id ? c.primary : c.border }}><Text style={{ color: view === option.id ? c.white : c.text, fontSize: 12, fontWeight: '600' }}>{option.label} · {count}</Text></Pressable>;
        })}
      </View>
      <View style={[ui.input, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 0 }]}><Ionicons name="search-outline" size={19} color={c.textMuted} /><TextInput accessibilityLabel="Rechercher un abonnement" placeholder="Rechercher un abonnement…" placeholderTextColor={c.textMuted} value={search} onChangeText={setSearch} style={{ flex: 1, minHeight: 46, color: c.text, fontSize: 15 }} /></View>
      <View style={[ui.row, { gap: 6 }]}>
        {(['renewal', 'name', 'price'] as const).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`Trier par ${{ renewal: 'échéance', name: 'nom', price: 'coût mensuel' }[key]}`} accessibilityState={{ checked: sort === key && safetyView !== 'sorted' }} aria-checked={sort === key && safetyView !== 'sorted'} onPress={() => { setSort(key); if (safetyView === 'sorted') setSafetyView('visible'); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: sort === key && safetyView !== 'sorted' ? c.surfaceRaised : 'transparent' }}><Text style={{ color: sort === key && safetyView !== 'sorted' ? c.primary : c.textSecondary, fontSize: 12 }}>{({ renewal: 'Échéance', name: 'Nom', price: 'Coût mensuel' })[key]}</Text></Pressable>)}
      </View>
      <SafetyViewToggle value={safetyView} onChange={setSafetyView} testID="subscriptions-safety-toggle" />
    </View></GuideAnchor>
    <View style={{ gap: 10 }} testID="subscription-results">
      {filtered.map(sub => <SubscriptionCard key={sub.id} subscription={sub} archived={isEnded(sub, follow[sub.id])} showSafety={safetyView !== 'hidden'} safetyDate={subscriptionSafetyDate(sub, follow)} onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} />)}
      {!filtered.length && <View style={ui.card}><Text style={ui.heading}>Aucun abonnement dans cette vue</Text><Text style={ui.body}>Changez de vue, de date ou de recherche.</Text><Button title="Réinitialiser les filtres" variant="secondary" onPress={() => { setView('active'); setSelectedDay(null); setSearch(''); }} /></View>}
    </View>
  </Page>;
}
