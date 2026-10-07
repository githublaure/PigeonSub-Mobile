import { GuideAnchor } from '../../src/components/guide/GuideScrollView';
import { calendarEvents } from '../../src/lib/calendar-events';
import { CalendarEventDot, CalendarLegend } from '../../src/components/CalendarLegend';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { dayKey, euro } from '../../src/lib/subscription-math';
export default function CalendarScreen() {
  const { colors: Colors } = useTheme();
  const ui = useUI();

  const router = useRouter();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(dayKey(new Date()));
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const events = calendarEvents(data, follow, first, last);
  const selectedEvents = events.filter((e) => e.day === selected);
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const change = (offset: number) => {
    const date = new Date(
      month.getFullYear(),
      month.getMonth() + offset,
      1,
      12,
    );
    setMonth(date);
    setSelected(dayKey(date));
  };
  return (
    <Page
      title="Votre calendrier"
      subtitle="Anticipez le prélèvement. Gardez une marge pour agir."
    >
      <GuideAnchor id="calendar-month"><View style={ui.card}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Button
            title="‹"
            accessibilityLabel="Mois précédent"
            variant="secondary"
            onPress={() => change(-1)}
          />
          <Text style={ui.heading}>
            {month.toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Button
            title="›"
            accessibilityLabel="Mois suivant"
            variant="secondary"
            onPress={() => change(1)}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, i) => (
            <Text
              key={`day-${i}`}
              style={[
                ui.small,
                { width: '14.28%', textAlign: 'center', paddingVertical: 10 },
              ]}
            >
              {label}
            </Text>
          ))}
          {Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => (
            <View key={`blank-${i}`} style={{ width: '14.28%' }} />
          ))}
          {Array.from({ length: last.getDate() }, (_, i) => {
            const date = new Date(
              first.getFullYear(),
              first.getMonth(),
              i + 1,
              12,
            );
            const key = dayKey(date);
            const matches = events.filter((e) => e.day === key);
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${date.toLocaleDateString('fr-FR')}, ${matches.length} échéance(s)`}
                accessibilityState={{ selected: selected === key }}
                onPress={() => setSelected(key)}
                style={{
                  width: '14.28%',
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor:
                    selected === key ? Colors.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: selected === key ? Colors.white : Colors.text,
                  }}
                >
                  {i + 1}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 3,
                    height: 7,
                    marginTop: 4,
                  }}
                >
                  {matches.some((e) => e.kind !== 'Date de sûreté') && (
                    <CalendarEventDot selected={selected === key} />
                  )}
                  {matches.some((e) => e.kind === 'Date de sûreté') && (
                    <CalendarEventDot safety />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <CalendarLegend />
      </View>
      </GuideAnchor>
      <Text style={ui.heading}>{selected.split('-').reverse().join('/')}</Text>
      {!selectedEvents.length && (
        <Text style={ui.body}>Aucune échéance prévue ce jour.</Text>
      )}
      {selectedEvents.map((e, i) => (
        <Pressable
          key={`${e.id}-${e.kind}-${i}`}
          style={ui.card}
          onPress={() => router.push(`/(tabs)/subscriptions/${e.id}`)}
          accessibilityRole="button"
        >
          <Text style={ui.heading}>{e.name}</Text>
          <Text style={[ui.body, e.kind === 'Date de sûreté' && ui.warning]}>
            {e.kind}
            {e.kind !== 'Date de sûreté'
              ? ` · ${e.kind === 'Prélèvement' ? '' : 'tarif prévu après essai : '}${euro(Number(e.price))}`
              : ' · vérifier avant le jour J'}
          </Text>
        </Pressable>
      ))}
      <Text style={ui.small}>
        Projection à partir des dates et préavis renseignés. Les dates passées
        ne constituent pas un historique de paiements. Activez vos rappels sur
        la fiche de chaque abonnement.
      </Text>
    </Page>
  );
}
