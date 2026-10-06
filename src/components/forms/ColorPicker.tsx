import React, { useEffect, useId, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import { clamp, hexToHsv, hsvToHex, type HSV } from '../../lib/color-picker';

const PRESETS = [
  ['Violet', '#7C3AED'],
  ['Rose', '#DB2777'],
  ['Orange', '#EA580C'],
  ['Vert', '#059669'],
  ['Bleu', '#2563EB'],
  ['Gris', '#6B7280'],
] as const;

export function ColorPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const lastValue = useRef(value);
  const [width, setWidth] = useState(1);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (value !== lastValue.current) {
      setHsv(hexToHsv(value));
      lastValue.current = value;
    }
  }, [value]);
  const selected = hsvToHex(hsv);
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const choose = (next: HSV) => {
    setHsv(next);
    const hex = hsvToHex(next);
    lastValue.current = hex;
    onChange(hex);
  };
  const chooseTone = (e: GestureResponderEvent) =>
    choose({
      ...hsv,
      s: clamp(e.nativeEvent.locationX / width),
      v: 1 - clamp(e.nativeEvent.locationY / 144),
    });
  const chooseHue = (e: GestureResponderEvent) =>
    choose({ ...hsv, h: clamp(e.nativeEvent.locationX / width) * 360 });

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>COULEUR DE CATÉGORIE</Text>
      <View style={styles.presets}>
        {PRESETS.map(([name, hex]) => (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={`Couleur ${name.toLowerCase()}`}
            accessibilityState={{ checked: selected === hex }}
            aria-checked={selected === hex}
            onPress={() => choose(hexToHsv(hex))}
            style={styles.swatchTarget}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: hex },
                selected === hex && {
                  borderWidth: 3,
                  borderColor: colors.text,
                },
              ]}
            >
              {selected === hex && (
                <Ionicons name="checkmark" size={17} color="#FFFFFF" />
              )}
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Personnaliser la couleur dans le dégradé"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => setExpanded((open) => !open)}
        style={styles.expand}
      >
        <View style={[styles.preview, { backgroundColor: selected }]} />
        <Text style={styles.expandText}>Choisir dans le dégradé</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded && (
        <View style={{ gap: 10 }}>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="Nuance de la couleur"
            accessibilityHint="Glissez horizontalement pour la saturation et verticalement pour la luminosité."
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(hsv.v * 100),
              text: `Luminosité ${Math.round(hsv.v * 100)} pour cent`,
            }}
            accessibilityActions={[
              { name: 'increment', label: 'Éclaircir' },
              { name: 'decrement', label: 'Assombrir' },
            ]}
            onAccessibilityAction={({ nativeEvent }) =>
              choose({
                ...hsv,
                v: clamp(
                  hsv.v +
                    (nativeEvent.actionName === 'increment' ? 0.05 : -0.05),
                ),
              })
            }
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={chooseTone}
            onResponderMove={chooseTone}
            onResponderTerminationRequest={() => false}
            style={[styles.tone, { backgroundColor: hueColor }]}
          >
            <Svg width="100%" height="144" pointerEvents="none">
              <Defs>
                <LinearGradient
                  id={`${id}white`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0" stopColor="white" />
                  <Stop offset="1" stopColor="white" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient
                  id={`${id}black`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <Stop offset="0" stopColor="black" stopOpacity="0" />
                  <Stop offset="1" stopColor="black" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id}white)`} />
              <Rect width="100%" height="100%" fill={`url(#${id}black)`} />
            </Svg>
            <View
              pointerEvents="none"
              style={[
                styles.knob,
                {
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: selected,
                },
              ]}
            />
          </View>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="Teinte de la couleur"
            accessibilityValue={{
              min: 0,
              max: 360,
              now: Math.round(hsv.h),
            }}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
            ]}
            onAccessibilityAction={({ nativeEvent }) =>
              choose({
                ...hsv,
                h:
                  (hsv.h +
                    (nativeEvent.actionName === 'increment' ? 15 : 345)) %
                  360,
              })
            }
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={chooseHue}
            onResponderMove={chooseHue}
            onResponderTerminationRequest={() => false}
            style={styles.hue}
          >
            <Svg width="100%" height="24" pointerEvents="none">
              <Defs>
                <LinearGradient
                  id={`${id}hue`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  {[
                    '#FF0000',
                    '#FFFF00',
                    '#00FF00',
                    '#00FFFF',
                    '#0000FF',
                    '#FF00FF',
                    '#FF0000',
                  ].map((color, index) => (
                    <Stop key={index} offset={index / 6} stopColor={color} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="24" rx="10" fill={`url(#${id}hue)`} />
            </Svg>
            <View
              pointerEvents="none"
              style={[
                styles.knob,
                {
                  left: `${hsv.h / 3.6}%`,
                  top: 22,
                  backgroundColor: hueColor,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}
const createStyles = (c: Palette) =>
  StyleSheet.create({
    label: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    swatchTarget: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expand: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    preview: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: c.border,
    },
    expandText: { flex: 1, color: c.text, fontSize: 14 },
    hint: { color: c.textSecondary, fontSize: 12, lineHeight: 18 },
    tone: { height: 144, borderRadius: 12, overflow: 'hidden' },
    hue: { height: 44, justifyContent: 'center' },
    knob: {
      position: 'absolute',
      width: 20,
      height: 20,
      marginLeft: -10,
      marginTop: -10,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 10,
      boxShadow: '0 0 0 1px #333333',
    },
  });
