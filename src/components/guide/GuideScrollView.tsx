import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGuide } from '../../contexts/GuideContext';
import { useTheme } from '../../contexts/ThemeContext';

const ScrollContext = createContext<((node: View) => void) | null>(null);
export function GuideScrollView({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const reveal = useCallback((node: View) => {
    if (content.current) node.measureLayout(content.current, (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }), () => undefined);
  }, []);
  return <ScrollContext.Provider value={reveal}><ScrollView {...props} ref={scroll} contentContainerStyle={{ flexGrow: 1 }}>
    <View ref={content} collapsable={false} style={contentContainerStyle}>{children}</View>
  </ScrollView></ScrollContext.Provider>;
}
export function GuideAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  const guide = useGuide();
  const { focus: requestedFocus } = useLocalSearchParams<{ focus?: string }>();
  const { colors: c } = useTheme();
  const reveal = useContext(ScrollContext);
  const node = useRef<View>(null);
  const selected = guide?.active ? guide.onRoute && guide.step.anchor === id : requestedFocus === id;
  const focus = useCallback(() => { if (selected && node.current) reveal?.(node.current); }, [selected, reveal]);
  useEffect(() => { if (!selected) return; const timer = setTimeout(focus, 200); return () => clearTimeout(timer); }, [selected, focus, guide?.step.id]);
  return <View ref={node} collapsable={false} onLayout={focus} testID={`guide-anchor-${id}`} style={selected ? { borderRadius: 24, outlineWidth: 2, outlineColor: c.primary, outlineStyle: 'solid', outlineOffset: 4 } : undefined}>{children}</View>;
}
