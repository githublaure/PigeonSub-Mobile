import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export function PlusBadge({ compact = false, reason = 'features', interactive = true }: { compact?: boolean; reason?: string; interactive?: boolean }) {
  const { colors } = useTheme();
  const { mode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const label = mode === 'demo' ? 'Découvrir Premium, option disponible en démo' : 'Découvrir cette option Premium';
  const content = <View
    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: colors.goldSurface }}
  >
    <Image source={require('../../../assets/icons/navigation/plume-tab-filled.png')} style={{ width: 19, height: 19, tintColor: colors.gold }} accessible={false} />
    {!compact && <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700' }}>{mode === 'demo' ? 'Plus · démo' : 'Plus'}</Text>}
  </View>;
  if (!interactive || pathname === '/premium') return <View accessibilityLabel="Fonctionnalité Premium">{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Présente les avantages et les offres PigeonSub Plus"
      onPress={event => { event.stopPropagation(); router.push({ pathname: '/(tabs)/premium', params: { reason } }); }}
      style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      {content}
    </Pressable>
  );
}
