import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';
import { Button } from './ui/Button';
import { useCategoryCatalog } from '../hooks/useCategoryCatalog';
import { useAuth } from '../contexts/AuthContext';
import { visibleCategories, categoryIcon } from '../lib/category-catalog';
import { iconChoices, type CategoryIconName } from '../lib/categories';
import { categoryMutation } from '../lib/category-api';
import { subscriptions } from '../lib/api';
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
  const rows = visibleCategories(catalog, referenced);
  const select = (id: string | null) => {
    setEditing(id);
    const item = rows.find(row => row.id === id);
    setName(item?.name ?? '');
    setIcon(categoryIcon(id ?? 'other', catalog));
    setError('');
  };
  const save = async () => {
    setBusy(true); setError('');
    try {
      await categoryMutation(editing === null ? 'create' : 'update',
        { ...(editing === null ? {} : { id: editing }), name, icon });
      setEditing(null); setName('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  const remove = (id: string) => {
    if (id === 'other') return;
    Alert.alert('Supprimer cette catégorie ?', 'Les abonnements associés seront conservés et déplacés vers Autre.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer la catégorie', style: 'destructive', onPress: () => {
        setBusy(true); setError('');
        void categoryMutation('delete', { id }, async categoryId => {
          const old = await subscriptions.list(true);
          if (getDataSession().scope !== scope) throw new Error('La session a changé.');
          for (const sub of old.filter(item => item.category === categoryId))
            await subscriptions.update(sub.id, { category: 'other' });
        }).then(() => { onDeleted?.(id); if (editing === id) select(null); })
          .catch(e => setError(e instanceof Error ? e.message : 'Suppression impossible.'))
          .finally(() => setBusy(false));
      } },
    ]);
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
                    onPress={() => remove(row.id)} disabled={busy} style={{ padding: 9 }}>
                    <Ionicons name="trash-outline" size={20} color={c.danger} />
                  </Pressable>
                )}
              </View>
            ))}
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
