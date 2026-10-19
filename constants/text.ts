import { type Dictionary } from '@/i18n/dictionary';
import { EN } from '@/i18n/en';
import { getLanguage, type Language } from '@/i18n/language';
import { TH } from '@/i18n/th';

const DICTIONARIES: Record<Language, Dictionary> = { th: TH, en: EN };

/**
 * Every user-facing string the screens share, in the language the person picked in
 * Settings. Each key is a getter, so `TEXT.CANCEL` answers for the language in force
 * at the moment it is read - which is why a read at module scope (frozen at import,
 * before the stored language has even loaded) belongs inside a function instead.
 */
export const TEXT = {} as Dictionary;

for (const key of Object.keys(TH) as (keyof Dictionary)[]) {
  Object.defineProperty(TEXT, key, {
    enumerable: true,
    get: () => DICTIONARIES[getLanguage()][key],
  });
}
