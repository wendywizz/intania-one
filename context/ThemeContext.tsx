import { SemanticColors } from "@/constants/designSystem";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  colors: typeof SemanticColors.light;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(
    (systemColorScheme || "light") === "dark",
  );

  useEffect(() => {
    if (systemColorScheme) {
      setIsDarkMode((systemColorScheme || "light") === "dark");
    }
  }, [systemColorScheme]);

  const colors = isDarkMode ? SemanticColors.dark : SemanticColors.light;

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
