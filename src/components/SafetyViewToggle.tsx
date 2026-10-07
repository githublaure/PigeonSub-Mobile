import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { nextSafetyView, type SafetyView } from '../lib/subscription-views';

const STATES = {
  hidden: { icon: 'shield-outline', label: 'Afficher la sûreté', hint: 'Affiche les dates de sûreté sans changer l’ordre des abonnements.' },
  visible: { icon: 'shield-checkmark-outline', label: 'Sûreté visible', hint: 'Trie les abonnements par date de sûreté, les dates dépassées en premier.' },
  sorted: { icon: 'funnel', label: 'Tri par sûreté', hint: 'Masque les dates de sûreté et rétablit le tri précédent.' },
} as const;

export function SafetyViewToggle({ value, onChange, testID }: { value: SafetyView; onChange: (value: SafetyView) => void; testID: string }) {
  const { colors: c } = useTheme();
  const state = STATES[value];
  const color = value === 'sorted' ? c.white : value === 'visible' ? c.warning : c.textSecondary;
  return <View style={{ gap: 6, alignItems: 'flex-start' }}>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={state.label} accessibilityHint={state.hint} accessibilityValue={{ text: `${{ hidden: 1, visible: 2, sorted: 3 }[value]} sur 3` }} onPress={() => onChange(nextSafetyView(value))}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: value === 'sorted' ? c.primary : value === 'visible' ? c.warning : c.border, backgroundColor: value === 'sorted' ? c.primary : value === 'visible' ? c.warningSurface : c.surface, opacity: pressed ? 0.8 : 1 })}>
      <Ionicons name={state.icon} size={19} color={color} />
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{state.label}</Text>
      {value === 'sorted' && <Ionicons name="arrow-up" size={15} color={color} />}
    </Pressable>
    <Text style={{ color: c.success, fontSize: 12, lineHeight: 17 }}>Gratuit · dates et rappels sur vos 5 abos</Text>
  </View>;
}
