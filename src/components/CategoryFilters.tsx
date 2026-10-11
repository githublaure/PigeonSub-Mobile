import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCategoryIcons } from '../hooks/useCategoryIcons';
import { useCategoryCatalog } from '../hooks/useCategoryCatalog';
import { categoryIcon, categoryName, visibleCategories } from '../lib/category-catalog';
import { FilterRail } from './ui/FilterRail';
import { ManageCategories } from './ManageCategories';

export function CategoryBadge({ category }: { category?: string }) {
  const { colors: c } = useTheme();
  const legacy = useCategoryIcons();
  const catalog = useCategoryCatalog();
  const id = category ?? 'other';
  const icon = (legacy as Record<string, keyof typeof Ionicons.glyphMap>)[id] ?? categoryIcon(id, catalog);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}
      testID={`category-badge-${id}`}>
      <Ionicons testID={`category-icon-${icon}`} name={icon} size={14} color={c.textSecondary} />
      <Text style={{ color: c.textSecondary, fontSize: 12 }}>{categoryName(id, catalog)}</Text>
    </View>
  );
}

export function CategoryFilters({ value, onChange, categories, allowAll = true, customizable = true }: {
  value: string; onChange: (value: string) => void; categories?: string[];
  allowAll?: boolean; customizable?: boolean;
}) {
  const { colors: c } = useTheme();
  const catalog = useCategoryCatalog();
  const legacy = useCategoryIcons();
  const [open, setOpen] = useState(false);
  const items = visibleCategories(catalog, [...(categories ?? []), value]);
  return (
    <View style={{ gap: 3 }}>
      {customizable && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700' }}>CATÉGORIES</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Créer, renommer ou supprimer une catégorie"
            onPress={() => setOpen(true)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
            <Ionicons name="options-outline" size={21} color={c.primary} />
          </Pressable>
        </View>
      )}
      <FilterRail label="Catégorie" value={value} onChange={onChange}
        options={[
          ...(allowAll ? [{ id: 'all', label: 'Toutes', icon: 'apps-outline' as const }] : []),
          ...items.map(item => ({
            id: item.id, label: item.name,
            icon: (legacy as Record<string, keyof typeof Ionicons.glyphMap>)[item.id] ?? categoryIcon(item.id, catalog),
          })),
        ]} testID="category-filters" />
      {customizable && (
        <ManageCategories visible={open} onClose={() => setOpen(false)} referenced={categories ?? (value !== 'all' ? [value] : [])}
          onDeleted={id => { if (value === id) onChange(allowAll ? 'all' : 'other'); }} />
      )}
    </View>
  );
}
