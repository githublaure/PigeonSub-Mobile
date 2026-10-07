import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export function AddSubscriptionButton({ onPress, premium = false }: { onPress: () => void; premium?: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={{ paddingBottom: premium ? 7 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter un abonnement"
        accessibilityHint={premium ? 'L’ajout au-delà de cinq abonnements nécessite Plus. Disponible en démo.' : undefined}
        onPress={onPress}
        style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryLight, boxShadow: '0 6px 15px rgba(124,58,237,0.22)', transform: [{ scale: pressed ? 0.95 : 1 }] })}
      >
        <Ionicons name="add" size={34} color={colors.white} />
      </Pressable>
        {premium && <Pressable accessibilityRole="button" accessibilityLabel="Découvrir Premium pour les abonnements illimités" onPress={() => router.push('/(tabs)/premium?reason=limit')} hitSlop={8} testID="add-subscription-plus-badge" style={{ position: 'absolute', bottom: 0, right: -4, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.goldSurface, borderWidth: 1, borderColor: colors.goldBorder }}>
          <Image source={require('../../../assets/icons/navigation/plume-tab-filled.png')} style={{ width: 12, height: 12, tintColor: colors.gold }} accessible={false} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gold }}>Plus</Text>
        </Pressable>}
    </View>
  );
}
