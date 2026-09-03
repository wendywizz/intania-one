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
 * For the layout half of the problem. React Native scales `fontSize` with the
 * device setting but leaves a `lineHeight` written in a stylesheet exactly where
 * it is, so enlarged glyphs collide inside a line box that never grew. Multiply
 * the stylesheet's lineHeight by this to keep the two in step:
 *
 *   <Text style={[styles.title, { lineHeight: 21 * fontScale }]}>
 *
 * Also useful for deciding when a horizontal row should become a column.
 */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(fontScale || 1, MAX_FONT_SCALE);
}
