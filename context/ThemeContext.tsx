import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SemanticColors } from '@/constants/theme';

const DARK_MODE_KEY = '@app_dark_mode';
const AUTO_THEME_KEY = '@app_auto_theme';

// Auto theme uses the time of day: dark during the evening/night hours
// (18:00–05:59) and light during the day (06:00–17:59).
const NIGHT_START_HOUR = 18;
const DAY_START_HOUR = 6;

function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < DAY_START_HOUR;
}

interface ThemeContextType {
  isDarkMode: boolean;
  isAutoTheme: boolean;
  colors: typeof SemanticColors.light;
  toggleDarkMode: () => void;
  toggleAutoTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [manualDarkMode, setManualDarkMode] = useState(false);
  const [isAutoTheme, setIsAutoTheme] = useState(false);
  const [autoDark, setAutoDark] = useState(() => isNightTime());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(DARK_MODE_KEY),
      AsyncStorage.getItem(AUTO_THEME_KEY),
    ])
      .then(([storedDark, storedAuto]) => {
        if (storedDark !== null) setManualDarkMode(storedDark === 'true');
        if (storedAuto !== null) setIsAutoTheme(storedAuto === 'true');
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // While auto theme is on, re-evaluate day/night periodically so the app
  // flips itself when the light/dark boundary is crossed.
  useEffect(() => {
    if (!isAutoTheme) return;
    setAutoDark(isNightTime());
    const intervalId = setInterval(() => setAutoDark(isNightTime()), 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isAutoTheme]);

  const isDarkMode = isAutoTheme ? autoDark : manualDarkMode;

  const toggleDarkMode = useCallback(() => {
    setManualDarkMode((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  }, []);

  const toggleAutoTheme = useCallback(() => {
    setIsAutoTheme((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(AUTO_THEME_KEY, String(next));
      if (next) setAutoDark(isNightTime());
      return next;
    });
  }, []);

  const colors = isDarkMode ? SemanticColors.dark : SemanticColors.light;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, isAutoTheme, colors, toggleDarkMode, toggleAutoTheme }}
    >
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
