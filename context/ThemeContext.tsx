import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SemanticColors } from '@/constants/designSystem';

const STORAGE_KEY = '@app_dark_mode';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: typeof SemanticColors.light;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) setIsDarkMode(stored === 'true');
    }).finally(() => setIsLoaded(true));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const colors = isDarkMode ? SemanticColors.dark : SemanticColors.light;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
