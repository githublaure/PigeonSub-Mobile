import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { dayKey, shortDate } from '../../lib/subscription-math';

export function SafetyDateBadge({ date }: { date: Date | null }) {
  const { colors: c } = useTheme();
  const overdue = !!date && dayKey(date) < dayKey(new Date());
  return <View testID="safety-date-badge" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: date ? c.warningSurface : c.surfaceRaised }}>
    <Ionicons name={overdue ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={15} color={date ? c.warning : c.textSecondary} />
    <Text style={{ color: date ? c.warning : c.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 }}>{date ? `${overdue ? 'Sûreté dépassée' : 'Sûreté'} · ${shortDate(date)}` : 'Sans date de sûreté'}</Text>
  </View>;
}
