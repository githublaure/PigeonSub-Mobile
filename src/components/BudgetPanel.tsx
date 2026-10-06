import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { settings } from '../lib/api';
import { getDataSession } from '../lib/local-data';
import { parseMonthlyBudget } from '../lib/stats-views';
import { euro } from '../lib/subscription-math';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';

export function BudgetPanel({ current, simulated }: { current: number; simulated?: number }) {
  const ui = useUI();
  const { colors: c } = useTheme();
  const { scope } = useAuth();
  const [budget, setBudget] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let alive = true;
    setLoaded(false);
    void settings.get().then((value) => {
      if (!alive || getDataSession().scope !== scope) return;
      const amount = value.budgetCap === null ? null : Number(value.budgetCap);
      const valid = amount !== null && Number.isFinite(amount) && amount >= 0 ? amount : null;
      setBudget(valid);
      setDraft(valid === null ? '' : String(valid).replace('.', ','));
      setError('');
      setLoaded(true);
    }).catch(() => { if (alive) { setError('Budget indisponible. Réessayez en revenant sur Stats.'); setLoaded(false); } });
    return () => { alive = false; };
  }, [scope]));
  const save = async () => {
    setError('');
    try {
      const amount = parseMonthlyBudget(draft);
      if (getDataSession().scope !== scope) throw new Error('La session a changé.');
      setBusy(true);
      await settings.setBudget(amount);
      if (getDataSession().scope !== scope) return;
      setBudget(amount);
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  const comparison = (label: string, amount: number, color: string) => (
    <View style={{ gap: 5 }} key={label}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.body}>{label}</Text><Text style={[ui.heading, { fontSize: 16 }]}>{euro(amount)} / mois</Text>
      </View>
      <View style={{ height: 7, borderRadius: 6, backgroundColor: c.surfaceRaised, overflow: 'hidden' }}>
        <View style={{ height: 7, width: `${Math.min(100, amount / Math.max(1, budget ?? 0, current, simulated ?? 0) * 100)}%`, backgroundColor: color }} />
      </View>
      {budget !== null && <Text style={[ui.small, { color: amount > budget ? c.danger : c.success }]}>
        {amount > budget ? `${euro(amount - budget)} au-dessus du budget` : `${euro(budget - amount)} disponibles`}
      </Text>}
    </View>
  );
  return (
    <View style={ui.card} testID="budget-panel">
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.heading}>Mon budget mensuel</Text>
        {loaded && <Pressable accessibilityRole="button" accessibilityLabel="Modifier le budget" onPress={() => setEditing(!editing)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.primary, fontWeight: '700' }}>{budget === null ? 'Définir' : euro(budget)}</Text></Pressable>}
      </View>
      {loaded && (editing || budget === null) && <View style={{ gap: 10 }}>
        <TextInput accessibilityLabel="Budget mensuel en euros" placeholder="Ex. 80" placeholderTextColor={c.textMuted} value={draft} onChangeText={setDraft} keyboardType="decimal-pad" style={ui.input} maxLength={12} editable={!busy} />
        <Button title="Enregistrer le budget" loading={busy} onPress={() => void save()} />
      </View>}
      {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
      {comparison('Actuel', current, c.primary)}
      {simulated !== undefined && comparison('Avec cette vue', simulated, c.gold)}
    </View>
  );
}
