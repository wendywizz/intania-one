/**
 * The ThemeContext object on its own, split out from ThemeContext.tsx so that
 * `constants/theme.ts` (useColors / useThemedStyles) and hooks can read the
 * context without importing the provider — which itself imports from
 * `constants/theme.ts`. Keeping the context here breaks that require cycle.
 *
 * The palette type is imported type-only, so it is erased at build time and
 * adds no runtime dependency back on `constants/theme.ts`.
 */
import { createContext } from 'react';
import type { SemanticColors } from '@/constants/theme';

export interface ThemeContextType {
  isDarkMode: boolean;
  isAutoTheme: boolean;
  colors: typeof SemanticColors.light;
  toggleDarkMode: () => void;
  toggleAutoTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
