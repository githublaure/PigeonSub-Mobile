import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Subscription } from '../lib/api';
import { familySeats } from '../lib/family-sharing';
import { isEnded, type FollowUps } from '../lib/subscription-math';
import { useUI } from './ui/Page';
import { useTheme } from '../contexts/ThemeContext';

export function FamilyAvailability({ data, follow }: { data: Subscription[]; follow: FollowUps }) {
  const ui = useUI(), { colors: c } = useTheme(), router = useRouter();
  const available = data.filter(sub => !isEnded(sub, follow[sub.id]) && (familySeats(sub) ?? 0) > 0);
  if (!available.length) return null;
  return <View testID="family-availability" style={ui.card}>
    <Text style={ui.heading}>Places familiales disponibles</Text>
    <Text style={ui.small}>D’après vos déclarations. Vérifiez les règles du fournisseur avant tout partage. Aucune contribution n’est présumée reçue.</Text>
    {available.map(sub => <Pressable key={sub.id} accessibilityRole="button"
      onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
      style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[ui.body, { color: c.primary }]}>{sub.name} · {familySeats(sub)} place(s) libre(s)</Text>
    </Pressable>)}
  </View>;
}
