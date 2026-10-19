import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDeviceLanguage } from './device-language';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './language';

// Kept apart from `language.ts` so the pure language state (and everything that
// formats text with it) can be imported without pulling in a native module.
const LANGUAGE_KEY = '@app_language';

/**
 * The language to open in: the one chosen in Settings, else the phone's own. A phone's
 * language is deliberately not written back - until someone chooses, the app keeps
 * following the phone, so changing the phone's language changes the app too.
 */
export async function loadStoredLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : getDeviceLanguage();
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
