import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type Option<T extends string> = { id: T; label: string; icon?: keyof typeof Ionicons.glyphMap; count?: number; color?: string; foreground?: string };
export function FilterRail<T extends string>({ options, value, onChange, label, testID }: { options: readonly Option<T>[]; value: T; onChange: (value: T) => void; label: string; testID?: string }) {
  const { colors: c } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const x = useRef(0);
  const [width, setWidth] = useState(0), [contentWidth, setContentWidth] = useState(0);
  return <View testID={testID} style={{ gap: 4 }}>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onLayout={e => setWidth(e.nativeEvent.layout.width)} onContentSizeChange={w => setContentWidth(w)} onScroll={e => { x.current = e.nativeEvent.contentOffset.x; }} scrollEventThrottle={16} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
      {options.map(option => {
        const active = option.id === value, accent = option.color ?? c.primary;
        return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={`${label} ${option.label}`} accessibilityState={{ checked: active }} aria-checked={active} onPress={() => onChange(option.id)} style={{ minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, backgroundColor: active ? accent : c.surface, borderWidth: 1, borderColor: active ? accent : c.border }}>
          {option.icon && <Ionicons name={option.icon} size={17} color={active ? option.foreground ?? c.white : accent} />}
          <Text style={{ color: active ? option.foreground ?? c.white : c.text, fontSize: 12, fontWeight: '600' }}>{option.label}{option.count !== undefined ? ` · ${option.count}` : ''}</Text>
        </Pressable>;
      })}
    </ScrollView>
    {contentWidth > width + 2 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : défiler à gauche`} onPress={() => scroll.current?.scrollTo({ x: Math.max(0, x.current - width * .8), animated: true })} style={{ minWidth: 44, minHeight: 32, justifyContent: 'center' }}><Ionicons name="chevron-back" size={17} color={c.textSecondary} /></Pressable>
      <Text style={{ color: c.textMuted, fontSize: 10 }}>Faire défiler les rubriques</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : défiler à droite`} onPress={() => scroll.current?.scrollTo({ x: Math.min(contentWidth - width, x.current + width * .8), animated: true })} style={{ minWidth: 44, minHeight: 32, justifyContent: 'center', alignItems: 'flex-end' }}><Ionicons name="chevron-forward" size={17} color={c.textSecondary} /></Pressable>
    </View>}
  </View>;
}
