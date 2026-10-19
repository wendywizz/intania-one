/**
 * The language switch is plain module state read at call time, so what has to hold is:
 * every reader follows it, and the two dictionaries stay in step.
 */
import { TEXT } from '@/constants/text';
import { EN } from '@/i18n/en';
import { DEFAULT_LANGUAGE, getLanguage, setCurrentLanguage } from '@/i18n/language';
import { displayYear, intlLocale, timeSuffix, weekdayLabel } from '@/i18n/locale';
import { TH } from '@/i18n/th';
import { formatShortDate, toDisplayYear } from '@/utils/date-format';
import { fill } from '@/utils/text-template';
import { THAI_MESSAGE, thaiOnly, toThaiMessage } from '@/utils/thai-message';

afterEach(() => setCurrentLanguage(DEFAULT_LANGUAGE));

describe('TEXT', () => {
  it('starts in Thai', () => {
    expect(getLanguage()).toBe('th');
    expect(TEXT.CANCEL).toBe(TH.CANCEL);
  });

  it('follows the current language without being re-imported', () => {
    setCurrentLanguage('en');
    expect(TEXT.CANCEL).toBe(EN.CANCEL);
    expect(TEXT.CANCEL).not.toBe(TH.CANCEL);

    setCurrentLanguage('th');
    expect(TEXT.CANCEL).toBe(TH.CANCEL);
  });

  it('keeps list values as lists', () => {
    setCurrentLanguage('en');
    expect(TEXT.HOME_MONTH_NAMES).toHaveLength(12);
    expect(TEXT.HOME_MONTH_NAMES[0]).toBe('January');
  });
});

describe('dictionaries', () => {
  it('have exactly the same keys', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(TH).sort());
  });

  it('use the same {placeholders} in both languages', () => {
    const placeholders = (value: string | readonly string[]) =>
      (Array.isArray(value) ? value.join(' ') : String(value)).match(/\{\w+\}/g)?.sort() ?? [];
    const mismatched = (Object.keys(TH) as (keyof typeof TH)[]).filter(
      (key) => placeholders(TH[key]).join() !== placeholders(EN[key]).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it('never leave Thai script in the English text', () => {
    // The only deliberate exceptions are strings that name Thai things.
    const thai = /[฀-๿]/;
    const offenders = (Object.keys(EN) as (keyof typeof EN)[]).filter((key) =>
      thai.test(Array.isArray(EN[key]) ? (EN[key] as readonly string[]).join('') : String(EN[key])),
    );
    expect(offenders).toEqual([]);
  });
});

describe('locale helpers', () => {
  it('print the Buddhist year in Thai and the Gregorian year in English', () => {
    expect(displayYear(2026)).toBe(2569);
    expect(toDisplayYear(2026)).toBe('2569');
    expect(toDisplayYear('2569')).toBe('2569');
    expect(timeSuffix()).toBe(' น.');
    expect(intlLocale()).toBe('th-TH');
    expect(weekdayLabel('จันทร์')).toBe('วันจันทร์');

    setCurrentLanguage('en');
    expect(displayYear(2026)).toBe(2026);
    expect(toDisplayYear(2026)).toBe('2026');
    expect(toDisplayYear('2569')).toBe('2026');
    expect(timeSuffix()).toBe('');
    expect(intlLocale()).toBe('en-GB');
    expect(weekdayLabel('Monday')).toBe('Monday');
  });

  it('format short dates in the current language', () => {
    expect(formatShortDate('2026-06-24')).toMatch(/69$/);
    setCurrentLanguage('en');
    expect(formatShortDate('2026-06-24')).toMatch(/26$/);
  });

  it('fill placeholders and leave unknown ones alone', () => {
    expect(fill('{a} of {b}', { a: 1, b: 'x' })).toBe('1 of x');
    expect(fill('{a} {missing}', { a: 1 })).toBe('1 {missing}');
  });
});

describe('server messages', () => {
  it('map to the app language', () => {
    expect(toThaiMessage('Insert absence success')).toBe(TH.MSG_SAVED);
    setCurrentLanguage('en');
    expect(toThaiMessage('Insert absence success')).toBe(EN.MSG_SAVED);
    expect(THAI_MESSAGE.DELETED).toBe(EN.MSG_DELETED);
  });

  it('translate the app\'s own Thai outcomes and keep the server\'s other Thai as is', () => {
    setCurrentLanguage('en');
    expect(toThaiMessage(TH.MSG_SAVED)).toBe(EN.MSG_SAVED);
    expect(thaiOnly(TH.MSG_FAILED)).toBe(EN.MSG_FAILED);
    expect(thaiOnly('อยู่นอกเครือข่ายคณะ')).toBe('อยู่นอกเครือข่ายคณะ');
    expect(thaiOnly('Insert success')).toBe('');
  });
});
