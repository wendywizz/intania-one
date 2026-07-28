/**
 * One knob for the size of every piece of text in the app.
 *
 * The app carries ~640 hard-coded `fontSize` values across 100+ files and has no
 * central type scale, so "make the text bigger" otherwise means touching all of
 * them — and re-touching all of them the next time the number needs a nudge.
 * Instead this wraps `StyleSheet.create` and scales sizes as sheets are
 * registered, which covers every styled `Text` in the app. The handful of inline
 * text styles that never go through `StyleSheet.create` call `scaleFont`
 * directly (Button's size table, the tab-bar labels, the nav-bar title).
 *
 * To change the app's text size, change FONT_SCALE. 1 restores the original.
 */
import { StyleSheet } from 'react-native';

/** Multiplier applied to every font size and line height. 1 = original sizes. */
// Widened to `number` on purpose: as a literal type the `=== 1` opt-out below
// reads as unreachable to the compiler, and this value is meant to be edited.
export const FONT_SCALE: number = 1.1;

/**
 * Scale one text measurement. Rounded to whole points: the app's sizes are all
 * whole numbers to begin with, and fractional ones render softer on Android.
 */
export function scaleFont(size: number): number {
  return Math.round(size * FONT_SCALE);
}

/**
 * `lineHeight` scales alongside `fontSize` — leaving it fixed would crop the
 * upper diacritics off Thai text as soon as the glyphs grew into it.
 */
const TEXT_METRICS = ['fontSize', 'lineHeight'] as const;

type StyleObject = Record<string, unknown>;
type StyleSheetInput = Record<string, StyleObject>;

/**
 * Installs the wrapper. It has to run before any module that calls
 * `StyleSheet.create` at import time, which is why `index.js` imports this file
 * ahead of `expo-router/entry` rather than a screen importing it.
 */
function install(): void {
  const create = StyleSheet.create.bind(StyleSheet) as (styles: StyleSheetInput) => StyleSheetInput;

  (StyleSheet as unknown as { create: unknown }).create = (styles: StyleSheetInput) => {
    const scaled: StyleSheetInput = {};

    for (const name of Object.keys(styles)) {
      const style = styles[name];
      if (!style || typeof style !== 'object') {
        scaled[name] = style;
        continue;
      }

      // Copy rather than mutate: in dev `create` freezes the objects it is
      // handed, and the sheet passed in may be a shared literal.
      let next: StyleObject | null = null;
      for (const metric of TEXT_METRICS) {
        const value = style[metric];
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        if (!next) next = { ...style };
        next[metric] = scaleFont(value);
      }

      scaled[name] = next ?? style;
    }

    return create(scaled);
  };
}

if (FONT_SCALE !== 1) install();
