import { useWindowDimensions } from 'react-native';

/**
 * How far iOS/Android may enlarge our text before we stop following.
 *
 * iOS lets a person push Dynamic Type to roughly 3.1x under Accessibility >
 * Larger Text. Nothing in this app survives that: a card sized for one line gets
 * three, and rows that put an icon, a label and a badge on one line run off the
 * edge. 1.3 is the point where the layouts still hold — it is a cap, not a
 * setting, so somebody who enlarges text still gets larger text, just not
 * unbounded.
 *
 * Applied by default in ThemedText and AppText; pass `maxFontSizeMultiplier`
 * explicitly at a call site that has room for more.
 */
export const MAX_FONT_SCALE = 1.3;

/**
 * The device font scale, clamped the same way the text itself is.
 *
 * For the LAYOUT half of the problem — box sizes, not text metrics. React
 * Native already scales a stylesheet's `lineHeight` in step with its
 * `fontSize` (RCTTextAttributes.mm multiplies both by the same font
 * multiplier), so there is no need to multiply lineHeight by this, and doing so
 * scales it twice. A line box that crops its glyphs is too tight at every size;
 * fix the ratio itself — 1.35x the font size clears the PSU faces.
 *
 * What does NOT scale on its own is anything sized in raw pixels: a fixed
 * `height` on a row or plate that holds text, a hard-coded width beside a
 * label. Use this to grow those, or to decide when a horizontal row should
 * become a column:
 *
 *   <View style={[styles.row, { minHeight: 44 * fontScale }]}>
 */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(fontScale || 1, MAX_FONT_SCALE);
}
