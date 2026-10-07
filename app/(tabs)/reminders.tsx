import React, { useCallback, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getReminderStatus, sendTestReminder, syncReminders } from '../../src/lib/notifications';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
export default function RemindersScreen() {
  const ui = useUI(), router = useRouter();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getReminderStatus>> | null>(null);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    let alive = true;
    const refresh = () => { void getReminderStatus().then(value => { if (alive) setStatus(value); }).catch(e => { if (alive) setError(e.message); }); };
    refresh(); const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { alive = false; listener.remove(); };
  }, []));
  const action = async (test: boolean) => {
    setBusy(true); setError(''); setMessage('');
    try {
      if (test) { await syncReminders(); await sendTestReminder(); await syncReminders(); setMessage('Test programmé dans 10 secondes. Mettez l’app en arrière-plan pour vérifier la bannière.'); }
      else { await syncReminders(); setMessage('Vérification terminée.'); }
      setStatus(await getReminderStatus());
    } catch (e) { setError(e instanceof Error ? e.message : 'Vérification impossible.'); }
    finally { setBusy(false); }
  };
  const unavailable = !status || status.state === 'demo' || status.state === 'unsupported';
  return <Page title="Notifications" subtitle="Vérifiez vos rappels sur ce téléphone">
    <Button title="Retour" variant="ghost" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} />
    <View style={ui.card} testID="reminder-status">
      <Text style={ui.heading}>{!status ? 'Vérification…' : status.state === 'demo' ? 'Simulation en démo' : status.state === 'unsupported' ? 'Application installée requise' : status.state === 'denied' ? 'Autorisation nécessaire' : `${status.count} rappel${status.count > 1 ? 's' : ''} programmé${status.count > 1 ? 's' : ''}`}</Text>
      <Text style={ui.body}>{status?.state === 'demo' ? 'La démo ne programme aucune notification réelle. Retrouvez votre espace personnel pour faire le test.' : status?.state === 'unsupported' ? 'Cette vérification fonctionne dans la version installée, par exemple TestFlight. Les rappels sont désactivés sur le Web et dans Expo Go dans cette version de PigeonSub.' : status?.state === 'denied' ? 'Autorisez les notifications avec le bouton de test, ou dans les réglages si vous les avez refusées.' : 'Les rappels activés dans vos fiches sont programmés à 9 h, à la date de sûreté.'}</Text>
      {status?.nextAt && <Text style={ui.body}>Prochain rappel : {new Date(status.nextAt).toLocaleString('fr-FR')}</Text>}
      <Button title="Vérifier mes rappels" variant="secondary" disabled={busy || unavailable} onPress={() => void action(false)} />
      <Button title="Tester une notification" disabled={busy || unavailable} onPress={() => void action(true)} />
      {!unavailable && <Button title="Ouvrir les réglages du téléphone" variant="ghost" onPress={() => void Linking.openSettings()} />}
    </View>
    {message ? <Text accessibilityRole="alert" style={[ui.body, ui.success]}>{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
    <Text style={ui.small}>Activez « Rappel à 9 h » dans la fiche d’un abonnement. Les dates passées ne déclenchent pas de rattrapage. Les modes silencieux, Concentration et les réglages du téléphone peuvent modifier la réception.</Text>
    <Text style={ui.small}>Gratuit sur vos 5 abonnements actifs ; sur tous avec Plus. Jusqu’à 60 notifications proches sont préparées, puis actualisées à l’ouverture de l’app.</Text>
  </Page>;
}
