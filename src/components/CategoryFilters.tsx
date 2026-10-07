import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCategoryIcons } from '../hooks/useCategoryIcons';
import { categoryIcons, iconChoices, normalizeCategory, type Category, type CategoryIconName } from '../lib/categories';
import { categoryLabels } from '../lib/labels';
import { getDataSession, saveCategoryIcon } from '../lib/local-data';
import { FilterRail } from './ui/FilterRail';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';

export function CategoryBadge({ category }: { category?: string }) {
  const icons = useCategoryIcons(), { colors: c } = useTheme();
  const key = normalizeCategory(category);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }} testID={`category-badge-${key}`}>
    <Ionicons testID={`category-icon-${icons[key]}`} name={icons[key]} size={14} color={c.textSecondary} />
    <Text style={{ color: c.textSecondary, fontSize: 12 }}>{categoryLabels[key]}</Text>
  </View>;
}

export function CategoryFilters({ value, onChange, categories, allowAll = true, customizable = true }: { value: string; onChange: (value: string) => void; categories?: string[]; allowAll?: boolean; customizable?: boolean }) {
  const icons = useCategoryIcons(), { colors: c } = useTheme(), ui = useUI(), { scope } = useAuth();
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<Category>('entertainment');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { setOpen(false); setError(''); }, [scope]);
  const keys = Object.keys(categoryIcons) as Category[];
  const visible = categories ? keys.filter(key => categories.map(normalizeCategory).includes(key) || key === value) : keys;
  const save = async (icon: CategoryIconName | null) => {
    setBusy(true); setError('');
    try {
      if (getDataSession().scope !== scope) return;
      await saveCategoryIcon(editing, icon);
    } catch (e) { if (getDataSession().scope === scope) setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 3 }}>
    {customizable && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={ui.label}>CATÉGORIES</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Personnaliser les icônes des catégories" onPress={() => setOpen(true)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Ionicons name="options-outline" size={20} color={c.primary} /></Pressable>
    </View>}
    <FilterRail label="Catégorie" value={value} onChange={onChange} options={[...(allowAll ? [{ id: 'all', label: 'Toutes', icon: 'apps-outline' as const }] : []), ...visible.map(key => ({ id: key, label: categoryLabels[key], icon: icons[key] }))]} testID="category-filters" />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 22 }}>
        <View accessibilityViewIsModal style={[ui.card, { maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center' }]}>
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <Text style={ui.heading}>Icônes des catégories</Text>
            <Text style={ui.small}>Communes à vos abonnements, essais et coupons sur cet appareil.</Text>
            <FilterRail label="Personnaliser" value={editing} onChange={setEditing} options={keys.map(key => ({ id: key, label: categoryLabels[key], icon: icons[key] }))} />
            <Text style={ui.body}>{categoryLabels[editing]}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {iconChoices.map((icon, i) => <Pressable key={icon} disabled={busy} accessibilityRole="radio" accessibilityLabel={`Icône ${i + 1} pour ${categoryLabels[editing]}`} accessibilityState={{ checked: icons[editing] === icon }} aria-checked={icons[editing] === icon} onPress={() => void save(icon)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: icons[editing] === icon ? c.primary : c.surfaceRaised }}><Ionicons name={icon} size={24} color={icons[editing] === icon ? c.white : c.primary} /></Pressable>)}
            </View>
            {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
            <Button title="Rétablir l’icône d’origine" variant="ghost" disabled={busy} onPress={() => void save(null)} />
          </ScrollView>
          <Button title="Terminé" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
