/**
 * Single source of truth for app theming: base Colors/Fonts, the Modern
 * Design System tokens (palette, typography, spacing, shadows…), and the
 * flat navigation `colors` palette.
 *
 * NOTE: `Colors`/`colors` use the brand red (#b33939); `ColorPalette`/
 * `SemanticColors` still use an indigo/purple palette. These were never
 * reconciled — see chat history. Combining the files did not change any value.
 */

import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const tintColorLight = '#b33939';
const tintColorDark = tintColorLight;

export const Colors = {
  light: {
    text: '#191c1f',
    background: '#f8f9fd',
    tint: tintColorLight,
    icon: '#584140',
    tabIconDefault: '#584140',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#131416',
    tint: tintColorDark,
    icon: '#ECEDEE',
    tabIconDefault: '#9BA1A6',
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
  primary: '#b33939',
  background: '#f5f6fa',
  surface: '#ffffff',
  text: '#1f2933',
  mutedText: '#6b7280',
  border: '#dde2e8',
  success: '#2f9e44',
  warning: '#f08c00',
  danger: '#c92a2a',
};

/**
 * Modern Design System for Staff Management App (formerly constants/designSystem.ts).
 * Bold, energetic colors with dark mode support.
 */

// ============ COLOR PALETTE ============
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

// ============ HOOK FOR USING DESIGN SYSTEM ============
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
