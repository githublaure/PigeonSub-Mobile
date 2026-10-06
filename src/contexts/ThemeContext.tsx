import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { DarkColors, LightColors, type Palette } from '../theme/colors';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'pigeonsub.appearance';
interface ThemeValue {
  colors: Palette;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => Promise<void>;
}
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeScheme = useColorScheme();
  const [webScheme, setWebScheme] = useState<'light' | 'dark' | null>(null);
  // Listen directly on web: the Replit browser preview must also react when
  // the device appearance changes while the application remains open.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setWebScheme(query.matches ? 'dark' : 'light');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const systemScheme = webScheme ?? nativeScheme;
  const [preference, setLocalPreference] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (
          alive &&
          (saved === 'dark' || saved === 'light' || saved === 'system')
        ) {
          setLocalPreference(saved);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const scheme =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;
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
