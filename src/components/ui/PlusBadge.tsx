import React from 'react';
import { Image, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export function PlusBadge({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const { mode } = useAuth();
  return (
    <View
      accessible
      accessibilityLabel={mode === 'demo' ? 'Fonctionnalité Plus, disponible en démo' : 'Fonctionnalité Plus'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: colors.goldSurface }}
    >
      <Image source={require('../../../assets/icons/navigation/plume-tab-filled.png')} style={{ width: 19, height: 19, tintColor: colors.gold }} accessible={false} />
      {!compact && <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700' }}>{mode === 'demo' ? 'Plus · démo' : 'Plus'}</Text>}
    </View>
  );
}
