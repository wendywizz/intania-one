import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_LANGUAGE, isLanguage, type Language } from './language';

// Kept apart from `language.ts` so the pure language state (and everything that
// formats text with it) can be imported without pulling in a native module.
const LANGUAGE_KEY = '@app_language';

/**
 * The language to open in: the one chosen in Settings, else Thai. The phone's own
 * language is deliberately not consulted - a fresh install always opens in Thai.
 */
export async function loadStoredLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export async function storeLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The switch still holds for this session; it just will not survive a restart.
  }
}
