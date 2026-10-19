import moment from 'moment';
import 'moment/locale/th';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getLanguage, setCurrentLanguage, type Language } from '@/i18n/language';
import { loadStoredLanguage, storeLanguage } from '@/i18n/language-storage';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Moment's locale is global, so it has to follow the app language too. */
function applyLanguage(language: Language) {
  setCurrentLanguage(language);
  moment.locale(language);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getLanguage);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void loadStoredLanguage().then((stored) => {
      applyLanguage(stored);
      setLanguageState(stored);
      setIsLoaded(true);
    });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    // Module state first: the re-render this triggers reads `TEXT` straight away.
    applyLanguage(next);
    setLanguageState(next);
    void storeLanguage(next);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  // Held back until the stored choice is known, so the first frame is already in
  // the right language instead of flashing Thai first.
  if (!isLoaded) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
