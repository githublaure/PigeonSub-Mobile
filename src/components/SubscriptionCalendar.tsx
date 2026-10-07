import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Subscription } from '../lib/api';
import { addDays, dayKey, shortDate, type FollowUps } from '../lib/subscription-math';
import { calendarEvents } from '../lib/calendar-events';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';
import { CalendarEventDot, CalendarLegend } from './CalendarLegend';
export function SubscriptionCalendar({ data, follow, selected, onSelect }: { data: Subscription[]; follow: FollowUps; selected: string | null; onSelect: (day: string | null, ids: number[]) => void }) {
  const ui = useUI();
  const { colors: c } = useTheme();
  const [start, setStart] = useState(new Date());
  const events = calendarEvents(data, follow, start, addDays(start, 6));
  const change = (delta: number) => { setStart(addDays(start, delta)); onSelect(null, []); };
  return <View style={[ui.card, { padding: 12, gap: 6 }]} testID="subscription-calendar">
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Semaine précédente" onPress={() => change(-7)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={20} color={c.primary} /></Pressable>
      <Text style={[ui.heading, { fontSize: 15 }]}>{shortDate(start)} — {shortDate(addDays(start, 6))}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Semaine suivante" onPress={() => change(7)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-forward" size={20} color={c.primary} /></Pressable>
    </View>
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i), key = dayKey(date), matches = events.filter(e => e.day === key), picked = selected === key;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${date.toLocaleDateString('fr-FR')}, ${matches.length} événements`} accessibilityState={{ selected: picked }} onPress={() => onSelect(picked ? null : key, matches.map(e => e.id))} style={{ flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, backgroundColor: picked ? c.primary : 'transparent' }}>
          <Text style={{ color: picked ? c.white : c.textSecondary, fontSize: 10 }}>{date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</Text>
          <Text style={{ color: picked ? c.white : c.text, fontWeight: '700' }}>{date.getDate()}</Text>
          <View style={{ height: 5, flexDirection: 'row', gap: 3 }}>
            {matches.some(e => e.kind !== 'Date de sûreté') && <CalendarEventDot selected={picked} />}
            {matches.some(e => e.kind === 'Date de sûreté') && <CalendarEventDot safety />}
          </View>
        </Pressable>;
      })}
    </View>
    <CalendarLegend />
    {selected && <Pressable accessibilityRole="button" accessibilityLabel="Afficher tous les jours" onPress={() => onSelect(null, [])} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.primary }}>Date : {selected.split('-').reverse().join('/')} · Effacer</Text></Pressable>}
  </View>;
}
