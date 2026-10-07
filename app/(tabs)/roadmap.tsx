import React, { useCallback, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import features from '../../shared/roadmap.json';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { roadmapVotes } from '../../src/lib/api';
import { getDataSession } from '../../src/lib/local-data';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';

export default function RoadmapScreen() {
  const { scope, mode } = useAuth(), { colors: c } = useTheme();
  const router = useRouter(), ui = useUI();
  const [votes, setVotes] = useState<string[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState('');
  const lock = useRef(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let alive = true; setBusy(true); setError('');
    void roadmapVotes.get().then(value => { if (alive && getDataSession().scope === scope) setVotes(value); })
      .catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [scope, revision]));
  const vote = async (id: string) => {
    if (lock.current || busy) return;
    lock.current = true; setBusy(true); setError('');
    const interested = !votes.includes(id);
    try {
      await roadmapVotes.set(id, interested);
      if (getDataSession().scope === scope) setVotes(current => interested ? [...current, id] : current.filter(v => v !== id));
    } catch (e) { setError(e instanceof Error ? e.message : 'Vote non enregistré.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Page title="La suite de PigeonSub" subtitle="Qu’aimeriez-vous utiliser ?">
    <Button title="Retour" variant="ghost" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} />
    <Text style={ui.body}>Les idées à l’étude ne sont pas disponibles à l’achat. Leur lancement et leurs conditions restent à définir.</Text>
    <Text style={ui.small}>{mode === 'demo' ? 'Votes de démonstration : ils ne sont pas transmis.' : mode === 'account' ? 'Un vote par idée et par compte, modifiable à tout moment.' : 'Vos choix restent sur cet appareil. Pour nous transmettre un vote, connectez-vous puis votez depuis votre compte.'}</Text>
    {error ? <View><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Button title="Réessayer" variant="ghost" onPress={() => setRevision(v => v + 1)} /></View> : null}
    {features.map(feature => {
      const selected = votes.includes(feature.id), prototype = feature.id === 'csv-import';
      return <View key={feature.id} testID={`roadmap-${feature.id}`} style={ui.card}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.pill}>{feature.status}</Text>{feature.premium && <View style={[ui.row, { gap: 4 }]} accessibilityLabel={prototype ? 'Import groupé Premium' : 'Premium envisagé, non disponible'}><Image source={require('../../assets/icons/navigation/plume-tab-filled.png')} style={{ width: 18, height: 18, tintColor: c.gold }} /><Text style={[ui.small, { color: c.gold }]}>{prototype ? 'Import groupé Plus' : 'Plus envisagé'}</Text></View>}</View>
        <Text style={ui.heading}>{feature.title}</Text><Text style={ui.body}>{feature.description}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Cette option m’intéresse : ${feature.title}`} accessibilityState={{ checked: selected, disabled: busy }} aria-checked={selected} disabled={busy} onPress={() => void vote(feature.id)} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: selected ? c.surfaceRaised : c.background }}><Text style={{ color: c.primary, fontWeight: '700' }}>{selected ? '✓ Votre intérêt est enregistré' : 'Cette option m’intéresse'}</Text></Pressable>
        {prototype && <Button title="Essayer l’import CSV" variant="secondary" onPress={() => router.push('/(tabs)/subscriptions/import')} />}
      </View>;
    })}
  </Page>;
}
