import { useTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface UsageBadgeProps {
  usageFrequency: string;
}

export function UsageBadge({ usageFrequency }: UsageBadgeProps) {
  const { colors: Colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const USAGE_CONFIG: Record<string, { label: string; color: string }> = {
    very_used: { label: 'Très utilisé', color: Colors.success },
    used: { label: 'Utilisé', color: Colors.info },
    rarely_used: { label: 'Peu utilisé', color: Colors.warning },
  };
  const config = USAGE_CONFIG[usageFrequency] ?? {
    label: usageFrequency,
    color: Colors.textMuted,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '26' }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const createStyles = (Colors: Palette) =>
  StyleSheet.create({
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
