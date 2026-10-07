import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function CalendarEventDot({ safety = false, selected = false, size = 5 }: { safety?: boolean; selected?: boolean; size?: number }) {
  const { colors: c } = useTheme();
  return <View testID={safety ? 'calendar-safety-dot' : 'calendar-renewal-dot'} accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: safety ? c.calendarSafety : selected ? c.white : c.primary }} />;
}

export function CalendarLegend() {
  const { colors: c } = useTheme();
  return <View testID="calendar-legend" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 4 }}>
    {[{ safety: false, label: 'Date limite · prélèvement / fin d’essai' }, { safety: true, label: 'Date de sûreté' }].map(item => <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
      <CalendarEventDot safety={item.safety} size={8} />
      <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18, flexShrink: 1 }}>{item.label}</Text>
    </View>)}
  </View>;
}
