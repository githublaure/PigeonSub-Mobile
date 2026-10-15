import React, { useEffect, useRef, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { subscriptions, type Subscription } from '../lib/api';
import { familySeats, validateFamilySharing } from '../lib/family-sharing';
import { euro, frequencyLabels, priceAmount } from '../lib/subscription-math';
import { getDataSession } from '../lib/local-data';
import { useAuth } from '../contexts/AuthContext';
import { useBilling } from '../contexts/BillingContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';
import { Button } from './ui/Button';

/** Mount with scope + subscription ID: drafts never cross account boundaries. */
export function FamilySharingPanel({ sub }: { sub: Subscription }) {
  const ui = useUI(), { colors: c } = useTheme(), router = useRouter();
  const { scope } = useAuth(), { canUsePlus } = useBilling();
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [confirmClear, setConfirmClear] = useState(false);
  const [shareable, setShareable] = useState(true);
  const [total, setTotal] = useState(''), [occupied, setOccupied] = useState('');
  const [received, setReceived] = useState(''), [estimate, setEstimate] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!canUsePlus) setEditing(false); }, [canUsePlus]);
  const current = () => mounted.current && scope === getDataSession().scope;
  const family = sub.familySharing, free = familySeats(sub);
  const period = sub.frequency === 'lifetime' ? 'une seule fois pour cet achat' : `par ${frequencyLabels[sub.frequency] ?? sub.frequency}`;
  const compatible = family?.frequency === sub.frequency;
  const gross = priceAmount(sub.price);
  const contribution = family?.shareable && compatible ? Math.min(gross, priceAmount(family.receivedContribution)) : 0;
  const begin = () => {
    setShareable(family?.shareable ?? true);
    setTotal(family?.totalSeats?.toString() ?? ''); setOccupied(family?.occupiedSeats?.toString() ?? '');
    setReceived(compatible ? family?.receivedContribution ?? '' : '');
    setEstimate(compatible ? family?.estimatedContribution ?? '' : '');
    setError(''); setConfirmClear(false); setEditing(true);
  };
  const save = async (clear = false) => {
    if (busy || !current()) return;
    setBusy(true); setError('');
    try {
      if (clear) await subscriptions.clearFamily(sub.id);
      else {
        if (!canUsePlus) throw new Error('Le partage familial nécessite PigeonSub Plus.');
        const draft = validateFamilySharing({ shareable,
          totalSeats: total.trim() === '' ? null : Number(total), occupiedSeats: occupied.trim() === '' ? null : Number(occupied),
          receivedContribution: received.trim(), estimatedContribution: estimate.trim(),
        }, sub.price, sub.frequency);
        await subscriptions.updateFamily(sub.id, draft);
      }
      if (current()) { setEditing(false); setConfirmClear(false); }
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : 'Impossible de modifier le partage.'); }
    finally { if (current()) setBusy(false); }
  };
  const field = (label: string, value: string, onChangeText: (text: string) => void, id: string, money = false) =>
    <View style={{ gap: 5 }}>
      <Text style={ui.body}>{label}</Text>
      <TextInput testID={id} accessibilityLabel={label} value={value} onChangeText={onChangeText}
        keyboardType={money ? 'decimal-pad' : 'number-pad'} editable={!busy} placeholder="Non renseigné"
        placeholderTextColor={c.textMuted} maxLength={money ? 12 : 3}
        style={{ color: c.text, backgroundColor: c.surfaceRaised, borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 48, fontSize: 16 }} />
    </View>;
  return <View testID="family-panel" style={ui.card}>
    <Text style={ui.heading}>Partage familial</Text>
    <Text style={ui.small}>Suivi déclaratif : vérifiez les règles du fournisseur et renseignez les places autorisées, vous compris. PigeonSub ne gère ni invitation ni paiement.</Text>
    {family && <View testID="family-history" style={{ gap: 6 }}>
      <Text style={ui.body}>{family.shareable ? 'Partage autorisé selon votre déclaration' : 'Partage désactivé'}</Text>
      <Text style={ui.body}>{family.occupiedSeats ?? '—'} place(s) occupée(s) sur {family.totalSeats ?? '—'} · {free === null ? 'disponibilité à renseigner' : `${free} libre(s)`}</Text>
      <Text style={ui.body}>Prix fournisseur : {euro(gross)} {period}</Text>
      <Text style={ui.body}>Contribution reçue déclarée : {family.receivedContribution === null ? 'non renseignée' : euro(priceAmount(family.receivedContribution))}{!compatible ? ' · ancienne fréquence' : ` ${period}`}</Text>
      <Text style={ui.body}>Reste à charge déclaré : {euro(gross - contribution)} {period}</Text>
      <Text style={ui.small}>Hypothèse par place libre : {family.estimatedContribution === null ? 'non renseignée' : euro(priceAmount(family.estimatedContribution))}. Aucune recette garantie.</Text>
      {!compatible && <Text style={[ui.body, { color: c.warning }]}>La fréquence a changé. Vérifiez les contributions avant de les réutiliser dans une simulation.</Text>}
      {priceAmount(family.receivedContribution) > gross && <Text style={[ui.body, { color: c.warning }]}>Le prix a baissé : la déduction affichée est plafonnée au prix actuel. Vérifiez votre déclaration.</Text>}
    </View>}
    <Text style={ui.small}>Les places occupées ne prouvent pas un paiement. Seul un montant reçu que vous confirmez ci-dessous réduit le reste à charge affiché. Les prélèvements et économies de résiliation restent inchangés.</Text>
    {editing && canUsePlus ? <View testID="family-editor" style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[ui.body, { flex: 1 }]}>Cet abonnement est partageable</Text>
        <Switch accessibilityLabel="Cet abonnement est partageable" value={shareable} onValueChange={setShareable} disabled={busy} trackColor={{ false: c.border, true: c.primary }} />
      </View>
      {field('Places autorisées, vous compris', total, setTotal, 'family-total')}
      {field('Places occupées, vous compris', occupied, setOccupied, 'family-occupied')}
      {field(`Contribution totale déjà reçue et confirmée (€), ${period}`, received, setReceived, 'family-received', true)}
      {field(`Hypothèse par place libre (€), ${period}`, estimate, setEstimate, 'family-estimate', true)}
      <Text style={ui.small}>{sub.frequency === 'lifetime'
        ? 'Montants uniques : la simulation les répartit sur les mêmes 12 mois que le prix d’achat. Aucun revenu mensuel récurrent.'
        : 'Déclaration pour une période de facturation. Actualisez-la si les participations changent ; ce n’est pas un historique de paiements.'}</Text>
      <Button title="Confirmer les montants et enregistrer" onPress={() => void save()} loading={busy} />
      <Button title="Annuler" variant="ghost" onPress={() => setEditing(false)} disabled={busy} />
    </View> : <>
      {!canUsePlus && <Text style={ui.small}>Vos informations restent consultables. PigeonSub Plus permet de les modifier et de simuler le partage.</Text>}
      <Button title={canUsePlus ? family ? 'Modifier le partage' : 'Configurer le partage' : 'Découvrir PigeonSub Plus'} variant="secondary"
        onPress={canUsePlus ? begin : () => router.push('/(tabs)/premium?reason=family')} disabled={busy} />
      {!!family && (confirmClear ? <View style={{ gap: 8 }}>
        <Text style={ui.body}>Retirer les informations de partage ? L’abonnement, son prix et ses justificatifs sont conservés.</Text>
        <Button title="Retirer le partage" variant="danger" onPress={() => void save(true)} loading={busy} />
        <Button title="Annuler" variant="ghost" onPress={() => setConfirmClear(false)} disabled={busy} />
      </View> : <Button title="Retirer les informations de partage" variant="ghost" onPress={() => setConfirmClear(true)} disabled={busy} />)}
    </>}
    {!!error && <Text accessibilityRole="alert" style={[ui.body, { color: c.danger }]}>{error}</Text>}
  </View>;
}
