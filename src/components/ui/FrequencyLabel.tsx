import { useThemedStyles } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

const LABELS: Record<string, string> = {
  monthly: '/mo',
  yearly: '/yr',
  weekly: '/wk',
  lifetime: ' lifetime',
};

interface FrequencyLabelProps {
  frequency: string;
  style?: object;
}

export function FrequencyLabel({ frequency, style }: FrequencyLabelProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Text style={[styles.text, style]}>
      {LABELS[frequency] ?? `/${frequency}`}
    </Text>
  );
}

const createStyles = (Colors: Palette) => StyleSheet.create({
  text: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
});
