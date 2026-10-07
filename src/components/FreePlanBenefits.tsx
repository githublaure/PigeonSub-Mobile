import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';

const BENEFITS = [
  '5 abonnements actifs, essais compris',
  'Date de sûreté et rappel pour chacun',
  '5 photos par abonnement',
  'Budget, économies et calendrier',
  'Coupons et export de vos données',
];
export function FreePlanBenefits() {
  const { colors: c } = useTheme();
  const ui = useUI();
  return <View testID="free-plan-benefits" style={[ui.card, { borderColor: c.success }]}>
    <Text style={[ui.heading, { color: c.success }]}>Inclus gratuitement · 0 €</Text>
    {BENEFITS.map(label => <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Ionicons name="checkmark-circle" size={18} color={c.success} />
      <Text style={[ui.body, { flex: 1, color: c.text }]}>{label}</Text>
    </View>)}
  </View>;
}
