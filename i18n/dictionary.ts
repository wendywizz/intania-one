import type { TH } from './th';

/**
 * The shape every language has to fill in. Derived from the Thai file, so a key
 * added there and forgotten in `en.ts` is a type error rather than a screen that
 * quietly shows the other language.
 */
export type Dictionary = {
  [K in keyof typeof TH]: (typeof TH)[K] extends readonly unknown[] ? readonly string[] : string;
};
