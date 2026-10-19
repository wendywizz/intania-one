/**
 * Which language the app speaks. Thai is the house language - the staff this app
 * serves read it first - so it is what a fresh install and a failed storage read
 * open in, whatever the phone's own language is, until one is chosen in Settings.
 */
export type Language = 'th' | 'en';

export const LANGUAGES: readonly Language[] = ['th', 'en'];
export const DEFAULT_LANGUAGE: Language = 'th';

/**
 * How each language is offered in the picker. A language is always named in its own
 * script - someone who cannot read the current language still has to find theirs -
 * with the other language's name underneath as a hint.
 */
export const LANGUAGE_OPTIONS: readonly { value: Language; code: string; name: string; hint: string }[] = [
  { value: 'th', code: 'TH', name: 'ไทย', hint: 'Thai' },
  { value: 'en', code: 'EN', name: 'English', hint: 'อังกฤษ' },
];

export function isLanguage(value: unknown): value is Language {
  return value === 'th' || value === 'en';
}

// Plain module state rather than React state on purpose: `TEXT`, date formatting
// and the service-layer messages are all read from ordinary functions that have
// no hook to ask. LanguageProvider is what keeps this and the React tree in step.
let current: Language = DEFAULT_LANGUAGE;

export function getLanguage(): Language {
  return current;
}

export function setCurrentLanguage(language: Language): void {
  current = language;
}
