import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import {
  resolveThemePreference,
  type ThemePreference,
} from '../lib/appearance';
export type { ThemePreference } from '../lib/appearance';
import { DarkColors, LightColors, type Palette } from '../theme/colors';

const STORAGE_KEY = 'pigeonsub.appearance';
interface ThemeValue {
  colors: Palette;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => Promise<void>;
}
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setLocalPreference] = useState<ThemePreference>('light');
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (saved) => {
        const next = resolveThemePreference(saved, Appearance.getColorScheme());
        if (alive) setLocalPreference(next);
        // Freeze the old automatic setting once, preserving its current look.
        // Future OS appearance changes no longer override the explicit choice.
        if (saved === 'system') await AsyncStorage.setItem(STORAGE_KEY, next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const scheme = preference;
  const colors = scheme === 'dark' ? DarkColors : LightColors;
  const value = useMemo<ThemeValue>(
    () => ({
      colors,
      scheme,
      preference,
      setPreference: async (next) => {
        // Serialize rapid taps so the last selection also survives a restart.
        const write = writes.current
          .catch(() => undefined)
          .then(() => AsyncStorage.setItem(STORAGE_KEY, next));
        writes.current = write;
        await write;
        setLocalPreference(next);
      },
    }),
    [colors, scheme, preference],
  );
  if (!ready) return null;
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider missing');
  return value;
}

export function useThemedStyles<T>(createStyles: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
