import { useContext } from 'react';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const ctx = useContext(ThemeContext);
  const scheme = ctx?.isDarkMode ? 'dark' : 'light';
  return props[scheme] ?? Colors[scheme][colorName];
}
