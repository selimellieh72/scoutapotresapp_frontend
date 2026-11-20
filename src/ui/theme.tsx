import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

// Brand originals sampled from scoutsdesapotres.org on 2026-11-03.
// Tints and darker green text preserve the palette while keeping text readable.
// `white` always means literal white (text/icons on brand fills or photos);
// use `surface` for card and sheet backgrounds so they follow the theme.
export const lightColors = { ink: '#323232', muted: '#6D6D6D', primary: '#CA3737', primaryTint: '#FFF1F1',
  brandGreen: '#0D9523', green: '#08751C', greenDeep: '#08751C', greenTint: '#EDF7EE', yellow: '#FFEE14', yellowTint: '#FFFCE0',
  jeuxTint: '#FFF7D6', canvas: '#FAF9F7', navigation: '#EFEEEB', paper: '#F4F4F4', surface: '#FFFFFF', subtle: '#F6F5F1',
  white: '#FFFFFF', line: '#E8E8E8', danger: '#A12D2D', dangerStrong: '#A12D2D', softDanger: '#FFF0ED',
  placeholder: '#909589', frosted: '#FFFFFFE8', glow: '#FFFFFF80', divider: '#32323216', scrim: '#10180E66' };
export type Palette = typeof lightColors;

// Dark adaptation: warm near-black surfaces, brand red lifted for contrast on dark,
// green split into a light text tone and a deep fill tone that keeps white legible.
export const darkColors: Palette = { ink: '#ECEAE6', muted: '#A3A09A', primary: '#D64545', primaryTint: '#2E1A1A',
  brandGreen: '#0D9523', green: '#5CC870', greenDeep: '#08751C', greenTint: '#16261A', yellow: '#FFEE14', yellowTint: '#2B2814',
  jeuxTint: '#2E2A16', canvas: '#121311', navigation: '#1B1C1A', paper: '#22231F', surface: '#1C1D1B', subtle: '#252622',
  white: '#FFFFFF', line: '#2E2F2B', danger: '#F07A7A', dangerStrong: '#A12D2D', softDanger: '#3A1F1C',
  placeholder: '#7E8278', frosted: '#1C1D1BE8', glow: '#FFFFFF10', divider: '#ECEAE618', scrim: '#000000A0' };

const makeStyles = (colors: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, gap: 20, paddingBottom: 36 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.8 },
  heading: { color: colors.ink, fontSize: 19, lineHeight: 27, fontWeight: '600', letterSpacing: -0.3 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 25 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  separator: { height: 8 },
  field: { borderWidth: 0, borderRadius: 18, paddingHorizontal: 16,
    paddingVertical: 14, minHeight: 52, color: colors.ink, backgroundColor: colors.surface, fontSize: 16, boxShadow: '0 5px 18px #3232320A' },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 24, gap: 12, boxShadow: '0 7px 24px #3232320D' },
});

export type ColorScheme = 'light' | 'dark';
export type ThemeMode = 'system' | ColorScheme;
const themes = {
  light: { colors: lightColors, styles: makeStyles(lightColors) },
  dark: { colors: darkColors, styles: makeStyles(darkColors) },
};
export const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }];
export const resolveScheme = (mode: ThemeMode, system: string | null | undefined): ColorScheme =>
  mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
const isThemeMode = (value: unknown): value is ThemeMode => value === 'system' || value === 'light' || value === 'dark';

type ThemeValue = (typeof themes)[ColorScheme] & { scheme: ColorScheme; mode: ThemeMode; setMode: (mode: ThemeMode) => void };
const Theme = createContext<ThemeValue>({ ...themes.light, scheme: 'light', mode: 'system', setMode: () => {} });
export const useTheme = () => useContext(Theme);

const STORAGE_KEY = 'scout.theme';
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, updateMode] = useState<ThemeMode>('system');
  // Only consulted in 'system' mode, when the Appearance override is cleared.
  const system = useColorScheme();
  const scheme = resolveScheme(mode, system);
  useEffect(() => { void AsyncStorage.getItem(STORAGE_KEY).then(value => { if (isThemeMode(value)) updateMode(value); }).catch(() => {}); }, []);
  useEffect(() => {
    // Native chrome (keyboards, alerts, pickers, blur) follows the chosen mode too.
    if (Platform.OS !== 'web') Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(themes[scheme].colors.canvas).catch(() => {}); }, [scheme]);
  const value = useMemo<ThemeValue>(() => ({
    ...themes[scheme], scheme, mode,
    setMode: next => { updateMode(next); void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {}); },
  }), [scheme, mode]);
  return <Theme.Provider value={value}>{children}</Theme.Provider>;
}
