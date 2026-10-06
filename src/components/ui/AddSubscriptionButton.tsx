import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { PlusBadge } from './PlusBadge';

export function AddSubscriptionButton({ onPress, premium = false }: { onPress: () => void; premium?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter un abonnement"
        onPress={onPress}
        style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryLight, boxShadow: '0 6px 15px rgba(124,58,237,0.22)', transform: [{ scale: pressed ? 0.95 : 1 }] })}
      ><Ionicons name="add" size={34} color={colors.white} /></Pressable>
      {premium && <PlusBadge compact />}
    </View>
  );
}
