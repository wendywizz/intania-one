/**
 * Single source of truth for app theming: base Colors/Fonts, the flat
 * navigation `colors` palette, and the semantic AppColors palette (light +
 * dark) consumed via `useColors()` / `useThemedStyles()`.
 *
 * Every screen must theme against these variables — no hardcoded hex in
 * components. The brand accent is brick-red (#B33939).
 */

import { useContext, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';

import { ThemeContext } from '@/context/theme-context';

const tintColorLight = '#B33939';
const tintColorDark = '#E07A7A';

export const Colors = {
  light: {
    text: '#141414',
    background: '#F4F6F8',
    tint: tintColorLight,
    icon: '#2E3338',
    tabIconDefault: '#8D8E92',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0E1113',
    tint: tintColorDark,
    icon: '#ECEDEE',
    tabIconDefault: '#8A9098',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ============ APP SEMANTIC PALETTE (light + dark) ============
/**
 * The single palette every screen should theme against. Keys are semantic
 * *roles* (surface, text, border…) rather than raw colors, so a screen written
 * once flips correctly between light and dark. Consume via `useColors()` for
 * inline colors or `useThemedStyles((c) => StyleSheet.create({…}))` for
 * StyleSheet-based screens.
 *
 * The brand accent is brick-red (#B33939); in dark it is softened (#E07A7A) to
 * keep contrast against dark surfaces. The top nav bar is red in light and
 * becomes a dark elevated surface in dark mode so the whole app reads as a
 * proper dark theme (not just a dark body).
 */
export type AppColors = {
  // Surfaces
  background: string;      // screen background
  surface: string;         // cards / sheets / "white"
  surfaceAlt: string;      // grey value boxes / inset rows
  surfaceMuted: string;    // menu tiles / subtle fills
  // Text
  text: string;            // primary text
  textMuted: string;       // secondary text
  textFaint: string;       // tertiary / placeholder
  textOnPrimary: string;   // text/icon on a primary-colored fill
  inverse: string;         // inverse surface (dark slate) — inverted UI / icon emphasis
  // Lines
  border: string;          // card borders / dividers
  borderStrong: string;    // heavier separators
  /**
   * Underline of an input control. Deliberately darker than `border`: a divider
   * only has to hint at a boundary, but this line is the entire affordance that
   * says "you can type here", and at `border` it was near-invisible on a real
   * device screen.
   */
  inputBorder: string;
  // Brand
  primary: string;         // brand accent / primary actions
  primarySoft: string;     // soft brand tint (icon circles, chips)
  primaryDeep: string;     // deep brand red (home news cards, calendar nav buttons)
  // Top navigation bar
  navBar: string;
  navBarText: string;
  // Status
  success: string; successSoft: string;
  warning: string; warningSoft: string;
  danger: string;  dangerSoft: string;
  info: string;    infoSoft: string;
  // Flat UI (Defo) palette — fixed named swatches, identical in light & dark
  turquoise: string;   emerald: string;
  peterRiver: string;  amethyst: string;
  wetAsphalt: string;  greenSea: string;
  nephritis: string;   belizeHole: string;
  wisteria: string;    midnightBlue: string;
  sunFlower: string;   carrot: string;
  alizarin: string;    clouds: string;
  concrete: string;    orange: string;
  pumpkin: string;     pomegranate: string;
  silver: string;      asbestos: string;
  // Extra named accents
  pico8Pink: string;   prunusAvium: string;
  // Misc
  overlay: string;         // modal backdrop
  shadow: string;
  skeleton: string;        // loading placeholder fill
};

// Flat UI "Defo" palette (https://flatuicolors.com/palette/defo) — fixed named
// swatches shared by both themes. Semantic roles below reference these so the
// mapping is explicit (success→emerald, warning→sunFlower, danger→alizarin,
// info→peterRiver).
const Defo = {
  turquoise: '#1ABC9C',   emerald: '#2ECC71',
  peterRiver: '#3498DB',  amethyst: '#9B59B6',
  wetAsphalt: '#34495E',  greenSea: '#16A085',
  nephritis: '#27AE60',   belizeHole: '#2980B9',
  wisteria: '#8E44AD',    midnightBlue: '#2C3E50',
  sunFlower: '#F1C40F',   carrot: '#E67E22',
  alizarin: '#E74C3C',    clouds: '#ECF0F1',
  concrete: '#95A5A6',    orange: '#F39C12',
  pumpkin: '#D35400',     pomegranate: '#C0392B',
  silver: '#BDC3C7',      asbestos: '#7F8C8D',
} as const;

export const LightColors: AppColors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F4',
  surfaceMuted: '#EEF1F4',
  text: '#141414',
  textMuted: '#8D8E92',
  textFaint: '#B4B7BC',
  textOnPrimary: '#FFFFFF',
  inverse: '#2E3134',
  border: '#E3E6EA',
  borderStrong: '#D3D8DE',
  inputBorder: '#8E98A3',
  primary: '#B33939',
  primarySoft: '#F7EBEB',
  primaryDeep: '#8A2626',
  navBar: '#FFFFFF',
  navBarText: '#141414',
  success: Defo.emerald,    successSoft: '#E9F9F0',
  warning: Defo.sunFlower,  warningSoft: '#FEF9E0',
  danger: Defo.alizarin,    dangerSoft: '#FDECEA',
  info: Defo.peterRiver,    infoSoft: '#EAF4FB',
  // Flat UI (Defo) palette — fixed named swatches
  ...Defo,
  // Extra named accents
  pico8Pink: '#FD79A8',   prunusAvium: '#E84393',
  overlay: 'rgba(17,24,28,0.36)',
  shadow: '#9AA3AE',
  skeleton: '#E7EBEF',
};

export const DarkColors: AppColors = {
  background: '#0E1417',
  surface: '#161C21',
  surfaceAlt: '#1E262C',
  surfaceMuted: '#1E262C',
  text: '#ECEDEE',
  textMuted: '#A0A6AD',
  textFaint: '#6B7280',
  textOnPrimary: '#FFFFFF',
  inverse: '#E8EAED',
  border: '#2A333B',
  borderStrong: '#333E47',
  inputBorder: '#5C6772',
  primary: '#E07A7A',
  primarySoft: 'rgba(224,122,122,0.18)',
  primaryDeep: '#7A2E2E',
  navBar: '#161C21',
  navBarText: '#F3F4F6',
  success: Defo.emerald,    successSoft: 'rgba(46,204,113,0.16)',
  warning: Defo.sunFlower,  warningSoft: 'rgba(241,196,15,0.16)',
  danger: Defo.alizarin,    dangerSoft: 'rgba(231,76,60,0.16)',
  info: Defo.peterRiver,    infoSoft: 'rgba(52,152,219,0.16)',
  // Flat UI (Defo) palette — same fixed swatches as light
  ...Defo,
  // Extra named accents
  pico8Pink: '#FD79A8',   prunusAvium: '#E84393',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  skeleton: '#232B32',
};

/**
 * Flat palette used by the navigation theme (formerly constants/colors.ts).
 */
export const colors = {
  primary: '#B33939',
  background: '#F4F6F8',
  surface: '#FFFFFF',
  text: '#141414',
  mutedText: '#8D8E92',
  border: '#E3E6EA',
  success: Defo.emerald,
  warning: Defo.sunFlower,
  danger: Defo.alizarin,
  info: Defo.peterRiver,
  iconCircleBorder: '#FFFFFF', // White ring for the nav top-bar module icon circle
};

/** Active semantic palette for the current theme. */
export function useColors(): AppColors {
  const ctx = useContext(ThemeContext);
  return ctx?.isDarkMode ? DarkColors : LightColors;
}

/**
 * Build a themed StyleSheet. Pass a factory that receives the active palette;
 * the sheet is memoized and only rebuilt when the theme flips.
 *
 *   const styles = useThemedStyles((c) => StyleSheet.create({
 *     card: { backgroundColor: c.surface, borderColor: c.border },
 *   }));
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: AppColors) => T,
): T {
  const c = useColors();
  return useMemo(() => StyleSheet.create(factory(c)), [c]);
}

/**
 * Responsive horizontal screen gutter (px) between the screen edge and section
 * content. Grows with viewport width but is clamped so it stays comfortable on
 * small phones (min 20) and doesn't sprawl on large screens (max 32). Apply it
 * inline on a screen's content container, e.g.
 *   const gutter = useScreenGutter();
 *   <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]} />
 */
export function useScreenGutter(): number {
  const { width } = useWindowDimensions();
  return Math.round(Math.min(32, Math.max(20, width * 0.062)));
}

/**
 * Responsive vertical spacing (px) between the screen title and the content
 * section below it. Scales with viewport height but is clamped so it stays
 * balanced on short screens (min 16) and large screens (max 32). Used by
 * `ScreenHeader` for the title's bottom spacing.
 */
export function useScreenTitleGap(): number {
  const { height } = useWindowDimensions();
  return Math.round(Math.min(32, Math.max(16, height * 0.028)));
}
