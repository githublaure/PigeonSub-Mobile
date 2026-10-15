import React, { useState, useEffect } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';
import { Button } from './ui/Button';
import { useCategoryCatalog } from '../hooks/useCategoryCatalog';
import { useAuth } from '../contexts/AuthContext';
import { visibleCategories, categoryIcon } from '../lib/category-catalog';
import { iconChoices, type CategoryIconName } from '../lib/categories';
import { categoryMutation } from '../lib/category-api';
import { getDataSession } from '../lib/local-data';

export function ManageCategories({ visible, onClose, onDeleted, referenced = [] }: {
  visible: boolean; onClose: () => void; onDeleted?: (id: string) => void; referenced?: string[];
}) {
  const { colors: c } = useTheme();
  const ui = useUI();
  const { scope } = useAuth();
  const catalog = useCategoryCatalog();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIconName>('grid-outline');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  useEffect(() => { setEditing(null); setName(''); setError(''); setPendingDelete(null); }, [scope, visible]);
  const rows = visibleCategories(catalog, referenced);
  const select = (id: string | null) => {
    setEditing(id);
    const item = rows.find(row => row.id === id);
    setName(item?.name ?? '');
    setIcon(categoryIcon(id ?? 'other', catalog));
    setError('');
  };
  const save = async () => {
    if (busy || getDataSession().scope !== scope) return;
    setBusy(true); setError('');
    try {
      await categoryMutation(editing === null ? 'create' : 'update',
        { ...(editing === null ? {} : { id: editing }), name, icon });
      if (getDataSession().scope === scope) { setEditing(null); setName(''); }
    } catch (e) { if (getDataSession().scope === scope) setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    const id = pendingDelete;
    if (!id || id === 'other' || getDataSession().scope !== scope) return;
    setBusy(true); setError('');
    try {
      await categoryMutation('delete', { id });
      if (getDataSession().scope !== scope) return;
      onDeleted?.(id); setPendingDelete(null);
      if (editing === id) select(null);
    } catch (e) { if (getDataSession().scope === scope) setError(e instanceof Error ? e.message : 'Suppression impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 16 }}>
        <View style={[ui.card, { maxHeight: '90%', maxWidth: 560, width: '100%', alignSelf: 'center' }]}>
          <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
            <Text style={ui.heading}>Mes catégories</Text>
            <Text style={ui.small}>Autre reste disponible. Créez vos propres noms et choisissez leurs icônes. Les abonnements ne sont jamais supprimés avec une catégorie.</Text>
            {rows.map(row => (
              <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
                <Ionicons name={categoryIcon(row.id, catalog)} size={21} color={c.primary} />
                <Text style={[ui.body, { flex: 1 }]}>{row.name}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Renommer ${row.name}`}
                  onPress={() => select(row.id)} disabled={busy} style={{ padding: 9 }}>
                  <Ionicons name="create-outline" size={20} color={c.primary} />
                </Pressable>
                {row.id !== 'other' && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer ${row.name}`}
                    onPress={() => setPendingDelete(row.id)} disabled={busy} style={{ padding: 9 }}>
                    <Ionicons name="trash-outline" size={20} color={c.danger} />
                  </Pressable>
                )}
              </View>
            ))}
            {pendingDelete && <View testID="category-delete-confirmation" style={{ gap: 8, padding: 12, borderWidth: 1, borderColor: c.danger, borderRadius: 12 }}>
              <Text style={ui.heading}>Supprimer cette catégorie ?</Text>
              <Text style={ui.body}>Les abonnements associés, y compris les archives, seront conservés et déplacés vers Autre.</Text>
              <Button title="Confirmer la suppression" variant="danger" loading={busy} onPress={() => void remove()} />
              <Button title="Annuler" variant="ghost" disabled={busy} onPress={() => setPendingDelete(null)} />
            </View>}
            <Button title="Créer une catégorie" variant="secondary" disabled={busy} onPress={() => select(null)} />
            <Text style={ui.label}>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</Text>
            <TextInput accessibilityLabel="Nom personnalisé de catégorie" style={ui.input}
              value={name} onChangeText={setName} placeholder="Ex. Développement personnel"
              placeholderTextColor={c.textMuted} maxLength={45} editable={!busy} />
            <Text style={ui.small}>Choisir une icône</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {iconChoices.map(item => (
                <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`Icône ${item}`}
                  accessibilityState={{ checked: icon === item }} onPress={() => setIcon(item)}
                  style={{ width: 47, height: 47, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: icon === item ? c.primary : c.surfaceRaised }}>
                  <Ionicons name={item} size={22} color={icon === item ? c.white : c.primary} />
                </Pressable>
              ))}
            </View>
            {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
            <Button title={editing ? 'Enregistrer la modification' : 'Ajouter la catégorie'}
              onPress={() => void save()} loading={busy} disabled={!name.trim()} />
          </ScrollView>
          <Button title="Terminé" variant="ghost" onPress={onClose} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}
