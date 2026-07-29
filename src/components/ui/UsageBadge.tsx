import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

const USAGE_CONFIG: Record<string, { label: string; color: string }> = {
  very_used: { label: 'Very used', color: Colors.success },
  used: { label: 'Used', color: Colors.info },
  rarely_used: { label: 'Rarely used', color: Colors.warning },
};

interface UsageBadgeProps {
  usageFrequency: string;
}

export function UsageBadge({ usageFrequency }: UsageBadgeProps) {
  const config = USAGE_CONFIG[usageFrequency] ?? { label: usageFrequency, color: Colors.textMuted };

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '26' }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
