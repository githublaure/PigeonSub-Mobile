import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import {
  addDays,
  dayKey,
  deadlines,
  euro,
  isEnded,
} from '../../src/lib/subscription-math';
export default function CalendarScreen() {
  const { colors: Colors } = useTheme();
  const ui = useUI();

  const router = useRouter();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(dayKey(new Date()));
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const events: {
    day: string;
    kind: string;
    name: string;
    id: number;
    price: string;
  }[] = [];
  for (const sub of data) {
    if (isEnded(sub, follow[sub.id])) continue;
    let cursor = new Date(
      Math.max(first.getTime(), new Date().setHours(0, 0, 0, 0)),
    );
    const horizon = addDays(
      last,
      (follow[sub.id]?.noticeDays ?? 0) + (follow[sub.id]?.leadDays ?? 1),
    );
    for (let cycle = 0; cycle < 160; cycle++) {
      const d = deadlines(sub, follow[sub.id], cursor);
      if (!d.renewal || d.renewal > horizon) break;
      for (const [date, kind] of [
        [d.renewal, 'Prélèvement'],
        [d.safety, 'Date de sûreté'],
      ] as const) {
        if (date && date >= first && date <= last)
          events.push({
            day: dayKey(date),
            kind,
            name: sub.name,
            id: sub.id,
            price: sub.price,
          });
      }
      cursor = addDays(d.renewal, 1);
    }
  }
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
      <View style={ui.card}>
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
                <Text style={{ color: selected === key ? Colors.white : Colors.text }}>{i + 1}</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 3,
                    height: 7,
                    marginTop: 4,
                  }}
                >
                  {matches.some((e) => e.kind === 'Prélèvement') && (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: Colors.textSecondary,
                      }}
                    />
                  )}
                  {matches.some((e) => e.kind === 'Date de sûreté') && (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: Colors.warning,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={ui.small}>
          ● Violet : prélèvement · ● Orange : date de sûreté
        </Text>
      </View>
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
            {e.kind === 'Prélèvement'
              ? ` · ${euro(Number(e.price))}`
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
