/**
 * Single source of truth for app theming: base Colors/Fonts, the Modern
 * Design System tokens (palette, typography, spacing, shadows…), and the
 * flat navigation `colors` palette.
 *
 * NOTE: `Colors`/`colors` use the brand red (#b33939); `ColorPalette`/
 * `SemanticColors` still use an indigo/purple palette. These were never
 * reconciled — see chat history. Combining the files did not change any value.
 */

import { useContext, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
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
  success: '#2f9e44',
  warning: '#f08c00',
  danger: '#C0392B',
  iconCircleBorder: '#FFFFFF', // White ring for the nav top-bar module icon circle
};

/**
 * @deprecated INDIGO/PURPLE DESIGN SYSTEM — do not use in new code.
 *
 * This palette (ColorPalette / SemanticColors / Typography / Spacing … consumed
 * via `useDesignSystem()`) is the app's *old*, off-brand look and renders
 * nowhere — its only consumers were the now-unused `modern-*` components. The
 * app's real, brand-red design system is `AppColors` + `useColors()` /
 * `useThemedStyles()` below, with the shared primitives in `@/components/ui`.
 * Kept only because removal cascades into ThemeContext; migrate off it, then delete.
 */

// ============ COLOR PALETTE ============/
export const ColorPalette = {
  // Primary - Vibrant Gradient Blue to Purple (Main Action)
  primary: {
    light: "#6366F1", // Indigo
    dark: "#818CF8", // Lighter indigo for dark mode
  },

  // Secondary - Electric Orange (Accent/Highlights)
  secondary: {
    light: "#F97316", // Vibrant orange
    dark: "#FB923C", // Lighter orange
  },

  // Tertiary - Neon Green (Success/Progress)
  tertiary: {
    light: "#10B981", // Emerald
    dark: "#34D399", // Lighter emerald
  },

  // Danger - Hot Pink/Red
  danger: {
    light: "#EF4444", // Red
    dark: "#FCA5A5", // Light red
  },

  // Warning - Amber
  warning: {
    light: "#F59E0B", // Amber
    dark: "#FCD34D", // Light amber
  },

  // Neutral Background
  background: {
    light: "#FFFFFF",
    dark: "#0F172A", // Deep navy-blue
  },

  // Surface - Cards and elevated elements
  surface: {
    light: "#F8FAFC",
    dark: "#1E293B", // Slightly lighter navy
  },

  // Surface Secondary - Alternative surface
  surfaceSecondary: {
    light: "#F1F5F9",
    dark: "#334155", // Medium gray-blue
  },

  // Text
  text: {
    light: "#0F172A", // Deep navy
    dark: "#F8FAFC", // Almost white
  },

  // Text Secondary
  textSecondary: {
    light: "#64748B", // Slate gray
    dark: "#CBD5E1", // Light gray-blue
  },

  // Text Tertiary
  textTertiary: {
    light: "#94A3B8", // Medium gray-blue
    dark: "#94A3B8", // Same for consistency
  },

  // Border
  border: {
    light: "#E2E8F0",
    dark: "#475569",
  },

  // Gradients
  gradients: {
    primary: ["#6366F1", "#8B5CF6"], // Indigo to Purple
    secondary: ["#F97316", "#FB923C"], // Orange gradient
    success: ["#10B981", "#14B8A6"], // Green to Teal
    warm: ["#F97316", "#FCA5A5"], // Orange to light red
  },
};

// ============ SEMANTIC COLORS ============
export const SemanticColors = {
  light: {
    primary: ColorPalette.primary.light,
    secondary: ColorPalette.secondary.light,
    tertiary: ColorPalette.tertiary.light,
    background: ColorPalette.background.light,
    surface: ColorPalette.surface.light,
    surfaceSecondary: ColorPalette.surfaceSecondary.light,
    text: ColorPalette.text.light,
    textSecondary: ColorPalette.textSecondary.light,
    textTertiary: ColorPalette.textTertiary.light,
    border: ColorPalette.border.light,
    success: ColorPalette.tertiary.light,
    danger: ColorPalette.danger.light,
    warning: ColorPalette.warning.light,
    overlay: "rgba(15, 23, 42, 0.5)",
    shadowColor: "#000000",
  },
  dark: {
    primary: ColorPalette.primary.dark,
    secondary: ColorPalette.secondary.dark,
    tertiary: ColorPalette.tertiary.dark,
    background: ColorPalette.background.dark,
    surface: ColorPalette.surface.dark,
    surfaceSecondary: ColorPalette.surfaceSecondary.dark,
    text: ColorPalette.text.dark,
    textSecondary: ColorPalette.textSecondary.dark,
    textTertiary: ColorPalette.textTertiary.dark,
    border: ColorPalette.border.dark,
    success: ColorPalette.tertiary.dark,
    danger: ColorPalette.danger.dark,
    warning: ColorPalette.warning.dark,
    overlay: "rgba(0, 0, 0, 0.6)",
    shadowColor: "#000000",
  },
};

// ============ TYPOGRAPHY ============
export const Typography = {
  // Display
  displayLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  displayMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  displaySmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },

  // Heading
  headingLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  headingMedium: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  headingSmall: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600" as const,
  },

  // Body
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },

  // Label
  labelLarge: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600" as const,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600" as const,
  },
};

// ============ SPACING ============
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// ============ BORDER RADIUS ============
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// ============ SHADOWS ============
export const Shadows = {
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ============ ANIMATIONS ============
export const AnimationDuration = {
  xs: 150,
  sm: 200,
  md: 300,
  lg: 400,
  xl: 500,
};

// ============ LAYOUT ============
export const Layout = {
  screenPadding: Spacing.lg,
  cardSpacing: Spacing.md,
  cardBorderRadius: BorderRadius.lg,
  buttonPadding: { horizontal: Spacing.lg, vertical: Spacing.md },
  tabBarHeight: 60,
};

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
  // Brand
  primary: string;         // brand accent / primary actions
  primarySoft: string;     // soft brand tint (icon circles, chips)
  // Top navigation bar
  navBar: string;
  navBarText: string;
  // Status
  success: string; successSoft: string;
  warning: string; warningSoft: string;
  danger: string;  dangerSoft: string;
  info: string;    infoSoft: string;
  // Misc
  overlay: string;         // modal backdrop
  shadow: string;
  skeleton: string;        // loading placeholder fill
};

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
  primary: '#B33939',
  primarySoft: '#F7EBEB',
  navBar: '#FFFFFF',
  navBarText: '#141414',
  success: '#2F9E44', successSoft: '#EAF7EE',
  warning: '#F08C00', warningSoft: '#FFF4E6',
  danger: '#C0392B',  dangerSoft: '#FCEDEB',
  info: '#1890D7',    infoSoft: '#EAF4FB',
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
  primary: '#E07A7A',
  primarySoft: 'rgba(224,122,122,0.18)',
  navBar: '#161C21',
  navBarText: '#F3F4F6',
  success: '#4ADE80', successSoft: 'rgba(74,222,128,0.16)',
  warning: '#FBBF24', warningSoft: 'rgba(251,191,36,0.16)',
  danger: '#F87171',  dangerSoft: 'rgba(248,113,113,0.16)',
  info: '#60A5FA',    infoSoft: 'rgba(96,165,250,0.16)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  skeleton: '#232B32',
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

// ============ HOOK FOR USING DESIGN SYSTEM ============
/**
 * @deprecated Returns the off-brand indigo palette. Use `useColors()` /
 * `useThemedStyles()` (brand-red AppColors) instead. No live screens consume
 * this — only the dead `modern-*` components did.
 */
export function useDesignSystem() {
  const colorScheme = useColorScheme();
  const isDark = (colorScheme || "light") === "dark";

  return {
    colors: isDark ? SemanticColors.dark : SemanticColors.light,
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
    animationDuration: AnimationDuration,
    layout: Layout,
    isDark,
  };
}
