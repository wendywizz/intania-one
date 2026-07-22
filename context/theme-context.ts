/**
 * The ThemeContext object on its own, split out from ThemeContext.tsx so that
 * `constants/theme.ts` (useColors / useThemedStyles) and hooks can read the
 * context without importing the provider — which itself imports from
 * `constants/theme.ts`. Keeping the context here breaks that require cycle.
 */
import { createContext } from 'react';

export interface ThemeContextType {
  isDarkMode: boolean;
  isAutoTheme: boolean;
  toggleDarkMode: () => void;
  toggleAutoTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
