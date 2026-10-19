import { I18nManager } from 'react-native';

import { DEFAULT_LANGUAGE, type Language } from './language';

/**
 * The locale tag the phone is set to ("th-TH", "en_US"), or '' when it will not say.
 *
 * `Intl` first - it is what Hermes resolves from the system locale on both platforms
 * and in the browser - then the native constant React Native keeps for the same thing.
 */
function readLocaleTag(): string {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    if (tag) return tag;
  } catch {
    // fall through
  }
  try {
    return I18nManager.getConstants().localeIdentifier ?? '';
  } catch {
    return '';
  }
}

/**
 * Which of the app's languages the phone is set to: Thai for a Thai phone, English for
 * every other language (the app has no third, and English is the one most people
 * outside Thai can read). A phone that will not say gets the house language.
 *
 * Only the answer for someone who has not chosen yet - the Settings choice always wins.
 */
export function getDeviceLanguage(): Language {
  const tag = readLocaleTag().trim().toLowerCase();
  if (!tag) return DEFAULT_LANGUAGE;
  return tag.startsWith('th') ? 'th' : 'en';
}
