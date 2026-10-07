import { GuideAnchor } from '../../src/components/guide/GuideScrollView';
import { calendarEvents, filterCalendarEvents, type CalendarFilter } from '../../src/lib/calendar-events';
import { CalendarEventDot, CalendarLegend } from '../../src/components/CalendarLegend';
import { SubscriptionIcon } from '../../src/components/ui/SubscriptionIcon';
import { FilterRail } from '../../src/components/ui/FilterRail';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { dayKey, euro, parseDay, shortDate } from '../../src/lib/subscription-math';

export default function CalendarScreen() {
  const { colors: c } = useTheme(), ui = useUI(), router = useRouter();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(dayKey(new Date()));
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [limit, setLimit] = useState(30);
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const from = parseDay(selected)!;
  const until = new Date(from.getFullYear() + 1, from.getMonth(), from.getDate(), 12);
  const events = useMemo(() => filterCalendarEvents(calendarEvents(data, follow, first, last), filter), [data, follow, month, filter]);
  const timeline = useMemo(() => filterCalendarEvents(calendarEvents(data, follow, from, until), filter), [data, follow, selected, filter]);
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const select = (day: string) => { setSelected(day); setLimit(30); };
  const change = (offset: number) => {
    const date = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(date); select(dayKey(date));
  };
  return <Page title="Alertes">
    <FilterRail label="Alertes" value={filter} onChange={value => { setFilter(value); setLimit(30); }} options={[
      { id: 'all', label: 'Toutes', icon: 'calendar-outline' },
      { id: 'safety', label: 'Sûreté', icon: 'shield-checkmark-outline', color: c.calendarSafety, foreground: '#201D29' },
      { id: 'deadline', label: 'Date limite', icon: 'time-outline', color: c.primary },
    ]} testID="alert-filters" />
    <GuideAnchor id="calendar-month"><View style={[ui.card, { padding: 12 }]}>
      <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
        <Button title="‹" accessibilityLabel="Mois précédent" variant="ghost" onPress={() => change(-1)} />
        <Text style={[ui.heading, { fontSize: 17, flexShrink: 1 }]}>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
        <Button title="›" accessibilityLabel="Mois suivant" variant="ghost" onPress={() => change(1)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, i) => <Text key={`day-${i}`} style={[ui.small, { width: '14.28%', textAlign: 'center', paddingVertical: 8 }]}>{label}</Text>)}
        {Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => <View key={`blank-${i}`} style={{ width: '14.28%' }} />)}
        {Array.from({ length: last.getDate() }, (_, i) => {
          const date = new Date(first.getFullYear(), first.getMonth(), i + 1, 12), key = dayKey(date);
          const matches = events.filter(e => e.day === key), icon = matches[0];
          return <Pressable key={key} testID={`calendar-day-${key}`} accessibilityRole="button" accessibilityLabel={`${date.toLocaleDateString('fr-FR')}, ${matches.length} échéance(s)`} accessibilityState={{ selected: selected === key }} onPress={() => select(key)} style={{ width: '14.28%', minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, backgroundColor: selected === key ? c.surfaceRaised : 'transparent', borderWidth: 1, borderColor: selected === key ? c.primary : 'transparent' }}>
            <Text style={{ color: selected === key ? c.primary : c.text, fontWeight: selected === key ? '800' : '400' }}>{i + 1}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 19 }}>
              {icon && <View style={{ borderRadius: 6, borderWidth: 1, borderColor: icon.kind === 'Date de sûreté' ? c.calendarSafety : c.primary }}><SubscriptionIcon id={icon.id} name={icon.name} size={16} /></View>}
              {matches.length > 1 && <Text style={{ color: c.textSecondary, fontSize: 9 }}>+{matches.length - 1}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
              {matches.some(e => e.kind !== 'Date de sûreté') && <CalendarEventDot />}
              {matches.some(e => e.kind === 'Date de sûreté') && <CalendarEventDot safety />}
            </View>
          </Pressable>;
        })}
      </View>
      <CalendarLegend />
      <Button title="Aujourd’hui" size="sm" variant="ghost" onPress={() => { setMonth(new Date()); select(dayKey(new Date())); }} />
    </View></GuideAnchor>
    <View style={{ gap: 4 }}>
      <Text testID="alerts-from" style={ui.heading}>À partir du {shortDate(from)}</Text>
      <Text style={ui.small}>Échéances prévues sur les 12 mois suivants.</Text>
    </View>
    <View testID="alert-timeline" style={{ gap: 10 }}>
      {!timeline.length && <Text style={ui.body}>Aucune échéance dans cette période pour ce filtre.</Text>}
      {timeline.slice(0, limit).map((event, i) => {
        const safety = event.kind === 'Date de sûreté';
        return <View key={`${event.id}-${event.kind}-${event.day}`} style={{ gap: 8 }}>
          {(i === 0 || timeline[i - 1].day !== event.day) && <Text style={[ui.label, { marginTop: 8 }]}>{parseDay(event.day)!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
          <Pressable testID={`alert-event-${event.day}-${event.id}-${safety ? 'safety' : 'deadline'}`} accessibilityRole="button" accessibilityLabel={`${event.name}, ${event.kind}, ${shortDate(parseDay(event.day))}`} onPress={() => router.push(`/(tabs)/subscriptions/${event.id}`)} style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 4, borderLeftColor: safety ? c.calendarSafety : c.primary, padding: 13 }]}>
            <SubscriptionIcon id={event.id} name={event.name} size={35} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[ui.heading, { fontSize: 15 }]}>{event.name}</Text>
              <Text style={[ui.small, { color: safety ? c.warning : c.primary }]}>{event.kind}</Text>
            </View>
            {!safety && <Text style={[ui.heading, { fontSize: 15, maxWidth: '32%' }]}>{euro(Number(event.price.replace(',', '.')))}</Text>}
          </Pressable>
        </View>;
      })}
      {timeline.length > limit && <Button title={`Voir les échéances suivantes (${timeline.length - limit})`} variant="secondary" onPress={() => setLimit(limit + 30)} />}
    </View>
    <Text style={ui.small}>Dates projetées selon vos informations, sans historique des paiements. Pour être notifié, activez le rappel sur la fiche de l’abonnement.</Text>
  </Page>;
}
