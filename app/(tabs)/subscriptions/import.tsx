import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useBilling } from '../../../src/contexts/BillingContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDataSession } from '../../../src/lib/local-data';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { analyzeCsv, CSV_EXAMPLE, matchesExisting, MAX_CSV_LENGTH, parseCsv, suggestCsvMapping, type CsvMapping, type CsvTable, type ImportCandidate } from '../../../src/lib/csv-import';
import { runCsvImport } from '../../../src/lib/run-csv-import';
import { Page, useUI } from '../../../src/components/ui/Page';
import { Button } from '../../../src/components/ui/Button';
import { PlusBadge } from '../../../src/components/ui/PlusBadge';
import { DatePickerField } from '../../../src/components/forms/DatePickerField';

export default function ImportScreen() {
  const ui = useUI(), router = useRouter(), { colors: c } = useTheme();
  const { scope, mode } = useAuth(), { canUsePlus } = useBilling();
  const { data } = useSubscriptionData();
  const [table, setTable] = useState<CsvTable | null>(null), [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [fileName, setFileName] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]), [selected, setSelected] = useState<string[]>([]), [done, setDone] = useState<string[]>([]);
  const [analyzed, setAnalyzed] = useState(false), [summary, setSummary] = useState(''), [confirm, setConfirm] = useState(false);
  const [column, setColumn] = useState<'date' | 'label' | 'amount' | null>(null);
  const [example, setExample] = useState(false);
  const resetAnalysis = () => { setCandidates([]); setSelected([]); setDone([]); setAnalyzed(false); setSummary(''); setError(''); setMessage(''); };
  const load = (text: string, name: string, isExample = false) => {
    const parsed = parseCsv(text); resetAnalysis(); setTable(parsed); setMapping(suggestCsvMapping(parsed.headers)); setFileName(name); setExample(isExample);
  };
  const pick = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true, base64: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!/\.csv$/i.test(asset.name)) throw new Error('Choisissez un fichier .csv, et non un PDF ou un fichier Excel.');
      if ((asset.size ?? 0) > MAX_CSV_LENGTH) throw new Error('Choisissez un CSV de moins de 500 Ko.');
      let text: string;
      if (Platform.OS === 'web' && asset.file) text = await asset.file.text();
      else {
        // DocumentPicker copied this file into this app's cache; keep the user's original.
        const cached = new (require('expo-file-system').File)(asset.uri);
        try { text = await cached.text(); } finally { try { cached.delete(); } catch { /* OS may already have removed the temporary copy. */ } }
      }
      if (getDataSession().scope !== scope) throw new Error('La session a changé.');
      load(text, asset.name);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lecture impossible.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const analyze = () => {
    if (!table || !mapping) return;
    try {
      const result = analyzeCsv(table, mapping);
      setCandidates(result.candidates.slice(0, 50)); setSelected([]); setDone([]); setAnalyzed(true); setError(''); setMessage('');
      setSummary([
        `${result.candidates.length} suggestion(s)`,
        result.invalid && `${result.invalid} ligne(s) non exploitable(s)`,
        result.credits && `${result.credits} crédit(s)/zéro ignoré(s)`,
        result.duplicates && `${result.duplicates} doublon(s) ignoré(s)`,
        result.notRecurring && `${result.notRecurring} libellé(s) sans récurrence`,
        result.candidates.length > 50 && '50 premières suggestions affichées',
      ].filter(Boolean).join(' · '));
    } catch (e) { setError(e instanceof Error ? e.message : 'Analyse impossible.'); }
  };
  const update = (id: string, patch: Partial<ImportCandidate>) => { setCandidates(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row)); setError(''); };
  const chosen = candidates.filter(row => selected.includes(row.id) && !done.includes(row.id) && !matchesExisting(row, data));
  const proceed = () => {
    setError('');
    if (chosen.length > 1 && !canUsePlus) { router.push('/(tabs)/premium?reason=import'); return; }
    setConfirm(true);
  };
  const commit = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    let added = 0, skipped = 0;
    try {
      await runCsvImport(scope, chosen, (id, savedId) => { setDone(ids => [...ids, id]); if (savedId === null) skipped++; else added++; });
      setConfirm(false); setMessage(`${added} abonnement(s) ajouté(s).${skipped ? ` ${skipped} déjà présent(s).` : ''}`);
    } catch (e) {
      setConfirm(false);
      setMessage(added ? `${added} abonnement(s) ajouté(s). Les lignes terminées ne seront pas réimportées.` : '');
      const message = e instanceof Error ? e.message : 'Import interrompu. Réessayez les lignes restantes.';
      setError(message.replace(/^PLUS_(IMPORT|LIMIT): /, ''));
    } finally { lock.current = false; setBusy(false); }
  };
  return <Page title="Importer un CSV" subtitle="Prototype · relevés en euros">
    <Button title="Retour" variant="ghost" disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/subscriptions')} />
    <View style={ui.card}>
      <Text style={ui.body}>Choisissez un relevé avec dates, libellés et montants. L’analyse reste sur cet appareil ; seuls les abonnements confirmés sont enregistrés dans votre espace.</Text>
      <Text style={ui.small}>CSV UTF-8 · dates JJ/MM/AAAA ou AAAA-MM-JJ · 500 Ko / 2 000 lignes maximum. Plusieurs mois facilitent la détection.</Text>
      <Button title="Choisir un fichier CSV" loading={busy} onPress={() => void pick()} />
      <Button title="Essayer avec un exemple fictif" variant="ghost" disabled={busy} onPress={() => load(CSV_EXAMPLE, 'Exemple fictif', true)} />
    </View>
    {table && mapping && <View style={ui.card} testID="csv-mapping">
      <Text style={ui.heading}>{fileName}</Text><Text style={ui.small}>{table.rows.length} transactions · {table.headers.length} colonnes</Text>
      {(['date', 'label', 'amount'] as const).map(key => <Button key={key} title={`${{ date: 'Date', label: 'Libellé', amount: 'Montant' }[key]} : ${table.headers[mapping[key]] || 'Choisir une colonne'}`} variant="secondary" disabled={busy} onPress={() => setColumn(key)} />)}
      <Text style={ui.label}>COMMENT SONT NOTÉS LES DÉBITS ?</Text>
      <View style={ui.row}>{(['negative', 'positive'] as const).map(sign => <Pressable key={sign} accessibilityRole="radio" accessibilityLabel={sign === 'negative' ? 'Débits négatifs' : 'Débits positifs'} accessibilityState={{ checked: mapping.debits === sign, disabled: busy }} aria-checked={mapping.debits === sign} disabled={busy} onPress={() => { resetAnalysis(); setMapping({ ...mapping, debits: sign }); }} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: mapping.debits === sign ? c.surfaceRaised : c.background }}><Text style={{ color: c.primary }}>{sign === 'negative' ? '− 9,99 €' : '+ 9,99 €'}</Text></Pressable>)}</View>
      <Button title="Analyser sur cet appareil" disabled={busy} onPress={analyze} />
    </View>}
    {analyzed && <View style={{ gap: 12 }} testID="csv-preview">
      <Text style={ui.heading}>Vérifiez les suggestions</Text><Text style={ui.small}>{summary}</Text>
      <Text style={ui.body}>Un paiement répété n’est pas forcément un abonnement. Vérifiez les noms, tarifs et dates estimées. Aucun rappel ne sera activé.</Text>
      {example && <Text style={ui.warning}>Exemple fictif : {mode === 'demo' ? 'vous êtes dans la démo.' : 'les ajouts iraient dans votre espace personnel.'}</Text>}
      {!candidates.length && <Text style={ui.body}>Aucune récurrence reconnue. Vérifiez les colonnes, le signe des débits et essayez plusieurs mois de relevés.</Text>}
      {candidates.map(row => {
        const existing = matchesExisting(row, data), completed = done.includes(row.id), disabled = busy || completed || existing;
        return <View key={row.id} style={ui.card} testID={`csv-candidate-${row.id}`}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={`Sélectionner ${row.name}`} accessibilityState={{ checked: selected.includes(row.id), disabled }} aria-checked={selected.includes(row.id)} disabled={disabled} onPress={() => setSelected(ids => ids.includes(row.id) ? ids.filter(id => id !== row.id) : [...ids, row.id])} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[ui.heading, { color: c.primary }]}>{completed ? '✓ Traité' : existing ? 'Déjà présent' : selected.includes(row.id) ? '✓ Sélectionné' : 'Sélectionner'}</Text></Pressable>
          <Text style={ui.small}>{row.occurrences} paiements repérés{row.variable ? ' · montants variables, dernier tarif proposé' : ''}</Text>
          <Text style={ui.label}>NOM À CONSERVER</Text><TextInput accessibilityLabel={`Nom de ${row.id}`} value={row.name} editable={!busy && !completed} maxLength={120} onChangeText={name => update(row.id, { name })} style={ui.input} />
          <Text style={ui.label}>TARIF EN EUROS</Text><TextInput accessibilityLabel={`Tarif de ${row.id}`} value={row.price} editable={!busy && !completed} keyboardType="decimal-pad" onChangeText={price => update(row.id, { price })} style={ui.input} />
          <View style={ui.row}>{(['weekly', 'monthly', 'yearly'] as const).map(frequency => <Pressable key={frequency} accessibilityRole="radio" accessibilityLabel={`${row.name} : ${{ weekly: 'hebdomadaire', monthly: 'mensuel', yearly: 'annuel' }[frequency]}`} accessibilityState={{ checked: row.frequency === frequency }} aria-checked={row.frequency === frequency} disabled={busy || completed} onPress={() => update(row.id, { frequency })} style={{ minHeight: 44, padding: 10, borderRadius: 10, backgroundColor: row.frequency === frequency ? c.surfaceRaised : c.background }}><Text style={{ color: c.primary }}>{({ weekly: 'Semaine', monthly: 'Mois', yearly: 'An' })[frequency]}</Text></Pressable>)}</View>
          <View pointerEvents={busy || completed ? 'none' : 'auto'}><DatePickerField label="Prochaine échéance estimée · à vérifier" value={row.nextRenewal} onChange={nextRenewal => update(row.id, { nextRenewal })} /></View>
          {existing && !completed && <Text style={ui.small}>Même nom, fréquence et montant : cet abonnement ne sera pas ajouté une seconde fois.</Text>}
        </View>;
      })}
      <View style={ui.card}>
        <View style={ui.row}><PlusBadge reason="import" /><Text style={[ui.body, { flex: 1 }]}>Aperçu gratuit. Un ajout à la fois dans la limite des 5 abonnements gratuits ; import groupé avec Plus.</Text></View>
        <Button title={`Vérifier ${chosen.length} ajout${chosen.length > 1 ? 's' : ''}`} disabled={busy || !chosen.length} onPress={proceed} />
      </View>
    </View>}
    {message ? <Text accessibilityRole="alert" style={[ui.body, ui.success]}>{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
    {done.length > 0 && <Button title="Voir mes abonnements" disabled={busy} variant="secondary" onPress={() => router.replace('/(tabs)/subscriptions')} />}
    <Modal visible={column !== null} transparent animationType="fade" onRequestClose={() => setColumn(null)}><View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#0008' }}><View style={[ui.card, { maxHeight: '80%' }]}><Text style={ui.heading}>Choisir la colonne</Text><ScrollView>{table?.headers.map((header, index) => <Button key={index} title={`${index + 1}. ${header || 'Sans nom'}`} variant="ghost" onPress={() => { if (mapping && column) { resetAnalysis(); setMapping({ ...mapping, [column]: index }); } setColumn(null); }} />)}</ScrollView><Button title="Fermer" variant="secondary" onPress={() => setColumn(null)} /></View></View></Modal>
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirm(false); }}><View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#0008' }}><View style={[ui.card, { maxHeight: '85%' }]}><Text style={ui.heading}>Confirmer {chosen.length} ajout{chosen.length > 1 ? 's' : ''}</Text><ScrollView>{chosen.map(row => <Text key={row.id} style={ui.body}>{row.name} · {row.price} € / {({ monthly: 'mois', yearly: 'an', weekly: 'semaine' })[row.frequency]} · {row.nextRenewal}</Text>)}</ScrollView><Text style={ui.small}>{mode === 'demo' ? 'Ces ajouts resteront dans la démo.' : 'Vous confirmez les informations ci-dessus.'} Aucun rappel automatique.</Text><Button title="Confirmer l’import" loading={busy} onPress={() => void commit()} /><Button title="Revenir à la vérification" variant="ghost" disabled={busy} onPress={() => setConfirm(false)} /></View></View></Modal>
  </Page>;
}
