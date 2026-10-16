import { CategoryFilters } from '../../../src/components/CategoryFilters';
import { normalizeCategory } from '../../../src/lib/categories';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getDataSession } from '../../../src/lib/local-data';
import { askReminderPermission } from '../../../src/lib/notifications';
import { changeReminder } from '../../../src/lib/reminder-actions';
import { FilterRail } from '../../../src/components/ui/FilterRail';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useBilling } from '../../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { canAddSubscription, currentMonthlyCost, euro, isEnded, lifetimeAmortization, monthlyCost, nextRenewal } from '../../../src/lib/subscription-math';
import { familySeats } from '../../../src/lib/family-sharing';
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
  const { mode, scope } = useAuth();
  const [reminderBusy, setReminderBusy] = useState<number | null>(null);
  const { view: routeView, reset, select, family: routeFamily } = useLocalSearchParams<{ view?: string; reset?: string; select?: string; family?: string }>();
  const [category, setCategory] = useState('all');
  const [familyView, setFamilyView] = useState<'all' | 'personal' | 'family'>(routeFamily === 'family' ? 'family' : routeFamily === 'personal' ? 'personal' : 'all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<SubscriptionView>('all');
  const [sort, setSort] = useState<'newest' | 'renewal' | 'name' | 'price'>('newest');
  const [safetyView, setSafetyView] = useState<SafetyView>('hidden');
  const [includeLifetime, setIncludeLifetime] = useState(false);
  useEffect(() => { if (SUBSCRIPTION_VIEWS.some(v => v.id === routeView)) { setView(routeView as SubscriptionView); setCategory('all'); setSearch(''); setSort('newest'); setSafetyView('hidden'); } }, [routeView, select]);
  useEffect(() => { setFamilyView(routeFamily === 'family' ? 'family' : routeFamily === 'personal' ? 'personal' : 'all'); }, [routeFamily]);
  useEffect(() => { if (reset) { setView('all'); setCategory('all'); setFamilyView('all'); setSearch(''); setSort('newest'); setSafetyView('hidden'); } }, [reset]);
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const matching = sortNewestFirst(filterSubscriptions(data, follow, view))
    .filter(s => familyView === 'all' || (familyView === 'family' ? s.familySharing?.shareable === true : s.familySharing?.shareable !== true))
    .filter(s => category === 'all' || normalizeCategory(s.category) === category)
    .filter(s => `${s.name} ${s.category}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')))
    .sort((a, b) => sort === 'newest' ? 0 : sort === 'name' ? a.name.localeCompare(b.name) : sort === 'price' ? monthlyCost(b) - monthlyCost(a) : (nextRenewal(a)?.getTime() ?? Infinity) - (nextRenewal(b)?.getTime() ?? Infinity));
  const filtered = safetyView === 'sorted' ? sortBySafetyDate(matching, follow) : matching;
  const active = data.filter(sub => !isEnded(sub, follow[sub.id]));
  const recurringMonthly = active.reduce((sum, sub) => sum + currentMonthlyCost(sub), 0);
  const lifetimeMonthly = active.reduce((sum, sub) => sum + lifetimeAmortization(sub).monthly, 0);
  const displayedMonthly = recurringMonthly + (includeLifetime ? lifetimeMonthly : 0);
  const family = active.filter(sub => sub.familySharing?.shareable === true);
  const familyFreeSeats = family.reduce((sum, sub) => sum + (familySeats(sub) ?? 0), 0);
  const toggleReminder = async (subId: number) => {
    if (reminderBusy !== null) return;
    const sub = data.find(item => item.id === subId);
    if (!sub) return;
    const previous = !!follow[subId]?.reminderEnabled;
    setReminderBusy(subId);
    try {
      if (!previous) {
        if (sub.frequency === 'lifetime') throw new Error('Un achat à vie ne nécessite pas de rappel de renouvellement.');
        if (!sub.nextRenewal && !sub.trialEndsAt) {
          throw new Error('Ajoutez une date de renouvellement ou de fin d’essai avant d’activer une notification.');
        }
        if (mode !== 'demo' && !(await askReminderPermission())) {
          throw new Error('Autorisez les notifications dans les réglages de votre téléphone.');
        }
      }
      if (getDataSession().scope !== scope) throw new Error('La session a changé.');
      await changeReminder(subId, !previous, scope);
    } catch (error) {
      Alert.alert('Rappels PigeonSub', error instanceof Error ? error.message : 'Impossible de modifier ce rappel.');
    } finally {
      setReminderBusy(null);
    }
  };
  return <Page title="Abonnements" headerAccessory={<AddSubscriptionButton onPress={() => router.push(canAddSubscription(data, canUsePlus, follow) ? '/(tabs)/subscriptions/new' : '/(tabs)/premium?reason=limit')} premium={!canAddSubscription(data, false, follow)} />}>
    <View testID="subscriptions-cost-hero" style={[ui.card, { backgroundColor: c.surfaceRaised, borderColor: c.border, gap: 10 }]}>
      <Text style={ui.label}>{includeLifetime ? 'DÉPENSES NUMÉRIQUES · PRORATA 12 MOIS' : 'ABONNEMENTS RÉCURRENTS'}</Text>
      <Text style={[ui.value, { color: c.text }]}>{euro(displayedMonthly)} <Text style={{ fontSize: 18, fontWeight: '700' }}>/ mois</Text></Text>
      <Text style={ui.body}>{euro(displayedMonthly * 12)} / an · {active.length} abonnement{active.length > 1 ? 's' : ''} actif{active.length > 1 ? 's' : ''}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <View style={{ flex: 1 }}>
          <Text style={[ui.body, { color: c.text }]}>Inclure les achats à vie</Text>
          <Text style={ui.small}>Prorata analytique sur les 12 premiers mois après l’achat.</Text>
        </View>
        <Switch
          testID="subscriptions-lifetime-toggle"
          accessibilityLabel="Inclure les achats à vie au prorata sur 12 mois"
          value={includeLifetime}
          onValueChange={setIncludeLifetime}
          trackColor={{ false: c.border, true: c.primary }}
        />
      </View>
      {includeLifetime && lifetimeMonthly === 0 && <Text style={ui.small}>Aucun achat à vie avec une date d’achat actuellement amortissable.</Text>}
    </View>

    <Pressable
      testID="subscriptions-family-banner"
      accessibilityRole="button"
      accessibilityLabel="Voir le mode Famille"
      onPress={() => family.length
        ? setFamilyView('family')
        : active.length
          ? router.push(`/(tabs)/subscriptions/${active[0].id}`)
          : router.push('/(tabs)/subscriptions/new')}
      style={[ui.card, { overflow: 'hidden', paddingVertical: 14, backgroundColor: c.goldSurface, borderColor: c.goldBorder }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[ui.label, { color: c.gold }]}>MODE FAMILLE</Text>
          <Text style={[ui.heading, { fontSize: 18 }]}>{family.length ? `${family.length} abonnement${family.length > 1 ? 's' : ''} à partager` : 'Partagez mieux, payez plus juste'}</Text>
          <Text style={ui.body}>{family.length
            ? `${familyFreeSeats} place${familyFreeSeats > 1 ? 's' : ''} libre${familyFreeSeats > 1 ? 's' : ''} renseignée${familyFreeSeats > 1 ? 's' : ''}. Suivez aussi le reste à charge dans les Stats.`
            : 'Repérez les abonnements partageables, les places libres et les contributions reçues.'}</Text>
          <Text style={[ui.small, { color: c.primary, fontWeight: '700' }]}>{family.length ? 'Voir mes abonnements famille →' : active.length ? 'Ouvrir une fiche pour configurer →' : 'Ajouter un abonnement →'}</Text>
        </View>
        <Image
          source={require('../../../assets/mascots/pigeon-family.png')}
          style={{ width: 116, height: 88 }}
          resizeMode="contain"
          accessible={false}
        />
      </View>
    </Pressable>

    <Button title="Importer un CSV · prototype" variant="ghost" onPress={() => router.push('/(tabs)/subscriptions/import')} />
    <GuideAnchor id="subscription-views"><View style={{ gap: 12 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.label}>VUE DES ABONNEMENTS</Text><Text style={ui.small}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</Text></View>
      <FilterRail label="Vue" value={view} onChange={setView} options={SUBSCRIPTION_VIEWS.map(option => ({ ...option, count: filterSubscriptions(data, follow, option.id).length }))} testID="subscription-view-tags" />
      <FilterRail label="Usage" value={familyView} onChange={setFamilyView} options={[
        { id: 'all', label: 'Tous', icon: 'apps-outline', count: filterSubscriptions(data, follow, view).length },
        { id: 'personal', label: 'Perso', icon: 'person-outline', count: filterSubscriptions(data, follow, view).filter(s => s.familySharing?.shareable !== true).length },
        { id: 'family', label: 'Famille', icon: 'people-outline', count: filterSubscriptions(data, follow, view).filter(s => s.familySharing?.shareable === true).length },
      ] as const} testID="subscription-family-filter" />
      <CategoryFilters value={category} onChange={setCategory} categories={data.map(s => s.category)} />
      <View style={[ui.input, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 0 }]}><Ionicons name="search-outline" size={19} color={c.textMuted} /><TextInput accessibilityLabel="Rechercher un abonnement" placeholder="Rechercher un abonnement…" placeholderTextColor={c.textMuted} value={search} onChangeText={setSearch} style={{ flex: 1, minHeight: 46, color: c.text, fontSize: 15 }} /></View>
      <View style={[ui.row, { gap: 6 }]}>
        {(['newest', 'renewal', 'name', 'price'] as const).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`Trier par ${{ newest: 'ajout récent', renewal: 'échéance', name: 'nom', price: 'coût mensuel' }[key]}`} accessibilityState={{ checked: sort === key && safetyView !== 'sorted' }} aria-checked={sort === key && safetyView !== 'sorted'} onPress={() => { setSort(key); if (safetyView === 'sorted') setSafetyView('visible'); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: sort === key && safetyView !== 'sorted' ? c.surfaceRaised : 'transparent' }}><Text style={{ color: sort === key && safetyView !== 'sorted' ? c.primary : c.textSecondary, fontSize: 12 }}>{({ newest: 'Récents', renewal: 'Échéance', name: 'Nom', price: 'Coût mensuel' })[key]}</Text></Pressable>)}
      </View>
      <SafetyViewToggle value={safetyView} onChange={setSafetyView} testID="subscriptions-safety-toggle" />
    </View></GuideAnchor>
    <View style={{ gap: 10 }} testID="subscription-results">
      {filtered.map(sub => <SubscriptionCard key={sub.id} subscription={sub} archived={isEnded(sub, follow[sub.id])} showSafety={safetyView !== 'hidden'} safetyDate={subscriptionSafetyDate(sub, follow)} remindersEnabled={!!follow[sub.id]?.reminderEnabled} onToggleReminder={() => void toggleReminder(sub.id)} onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} />)}
      {!filtered.length && <View style={ui.card}><Text style={ui.heading}>Aucun abonnement dans cette vue</Text><Text style={ui.body}>Changez de vue ou de recherche.</Text><Button title="Réinitialiser les filtres" variant="secondary" onPress={() => { setView('all'); setCategory('all'); setFamilyView('all'); setSearch(''); setSort('newest'); setSafetyView('hidden'); }} /></View>}
    </View>
  </Page>;
}
