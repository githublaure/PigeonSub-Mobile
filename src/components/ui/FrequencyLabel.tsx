import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';

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
  return (
    <Text style={[styles.text, style]}>
      {LABELS[frequency] ?? `/${frequency}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
});
