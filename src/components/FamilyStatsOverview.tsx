import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Subscription } from '../lib/api';
import { currentMonthlyCost, euro, isEnded, type FollowUps } from '../lib/subscription-math';
import { familyCost, familySeats } from '../lib/family-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';
import { Button } from './ui/Button';

export function FamilyStatsOverview({ data, follow }: { data: Subscription[]; follow: FollowUps }) {
  const ui = useUI();
  const { colors: c } = useTheme();
  const router = useRouter();
  const family = data.filter(sub => !isEnded(sub, follow[sub.id]) && sub.familySharing?.shareable === true);

  if (!family.length) {
    return <View testID="family-stats-overview" style={ui.card}>
      <Text style={ui.label}>MODE FAMILLE</Text>
      <Text style={ui.heading}>Aucun abonnement famille configuré</Text>
      <Text style={ui.body}>Marquez un abonnement comme partageable pour suivre ses places et retrouver cette vue dans vos statistiques.</Text>
      <Button title="Configurer un abonnement" variant="secondary" onPress={() => router.push('/(tabs)/subscriptions')} />
    </View>;
  }

  let grossMonthly = 0, contributionMonthly = 0, netMonthly = 0;
  let totalSeats = 0, occupiedSeats = 0, freeSeats = 0, knownSeatPlans = 0, knownSeatGrossMonthly = 0;
  for (const sub of family) {
    const gross = currentMonthlyCost(sub);
    const costs = familyCost(sub, gross);
    grossMonthly += gross;
    contributionMonthly += costs.contribution;
    netMonthly += costs.net;
    const sharing = sub.familySharing;
    if (sharing?.totalSeats !== null && sharing?.occupiedSeats !== null &&
        sharing?.totalSeats !== undefined && sharing?.occupiedSeats !== undefined) {
      totalSeats += sharing.totalSeats;
      occupiedSeats += sharing.occupiedSeats;
      freeSeats += familySeats(sub) ?? 0;
      knownSeatGrossMonthly += gross;
      knownSeatPlans += 1;
    }
  }
  const averagePerOccupiedSeat = occupiedSeats > 0 ? knownSeatGrossMonthly / occupiedSeats : null;

  return <View testID="family-stats-overview" style={[ui.card, { gap: 8 }]}>
    <Text style={ui.label}>MODE FAMILLE</Text>
    <Text style={ui.heading}>{family.length} abonnement{family.length > 1 ? 's' : ''} partagé{family.length > 1 ? 's' : ''}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <View style={{ minWidth: 120, flex: 1 }}>
        <Text style={ui.small}>Coût fournisseur</Text>
        <Text style={[ui.heading, { color: c.primary }]}>{euro(grossMonthly)} / mois</Text>
      </View>
      <View style={{ minWidth: 120, flex: 1 }}>
        <Text style={ui.small}>Reste à charge déclaré</Text>
        <Text style={ui.heading}>{euro(netMonthly)} / mois</Text>
      </View>
    </View>
    <Text style={ui.body}>Contributions déjà reçues et confirmées : {euro(contributionMonthly)} / mois.</Text>
    {knownSeatPlans > 0
      ? <Text style={ui.body}>{occupiedSeats} place{occupiedSeats > 1 ? 's' : ''} occupée{occupiedSeats > 1 ? 's' : ''} sur {totalSeats} renseignée{totalSeats > 1 ? 's' : ''} · {freeSeats} libre{freeSeats > 1 ? 's' : ''}.</Text>
      : <Text style={ui.body}>Renseignez les places autorisées et occupées pour compléter cette analyse.</Text>}
    {averagePerOccupiedSeat !== null && <Text style={ui.small}>Coût fournisseur moyen : {euro(averagePerOccupiedSeat)} par place occupée. C’est une moyenne analytique, pas le montant payé par chaque personne.</Text>}
    <Text style={ui.small}>Les achats à vie ne sont pas ajoutés artificiellement au coût mensuel ici ; leur comparaison reste disponible via l’option d’amortissement sur 12 mois.</Text>
    <Button title="Voir les abonnements famille" variant="secondary" onPress={() => router.push('/(tabs)/subscriptions?family=family')} />
  </View>;
}
