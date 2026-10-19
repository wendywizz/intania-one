import type { Dictionary } from './dictionary';
import { EN_PART_1 } from './en/part1';
import { EN_PART_2 } from './en/part2';
import { EN_PART_3 } from './en/part3';
import { EN_PART_4 } from './en/part4';
import { EN_PART_5 } from './en/part5';
import { EN_PART_6 } from './en/part6';
import { EN_PART_7 } from './en/part7';

/** English. Split across `./en/` only to keep each file reviewable. */
export const EN: Dictionary = {
  ...EN_PART_1,
  ...EN_PART_2,
  ...EN_PART_3,
  ...EN_PART_4,
  ...EN_PART_5,
  ...EN_PART_6,
  ...EN_PART_7,
  MONTH_NAMES_SHORT: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  DAY_NAMES_NO_PREFIX: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  WEEKDAY_NAMES_MIN: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  SETTINGS_LANGUAGE_TITLE: 'Language',
  SETTINGS_LANGUAGE_CAPTION: 'Choose the language the app is shown in',
};
