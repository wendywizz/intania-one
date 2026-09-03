import { Text, type TextProps } from 'react-native';

import { MAX_FONT_SCALE } from '@/constants/typography';

/**
 * React Native's `Text` with this app's font-scaling cap already on it.
 *
 * For the screens that style their own text and so cannot use ThemedText. Import
 * it under the name it replaces and the call sites need no edit at all:
 *
 *   import { AppText as Text } from '@/components/app-text';
 *
 * The cap goes before the spread on purpose — a caller that passes its own
 * `maxFontSizeMultiplier` still wins.
 *
 * (The usual `Text.defaultProps.maxFontSizeMultiplier = …` trick is not an
 * option: React 19 dropped defaultProps for function components, so it would do
 * nothing here and do it silently.)
 */
export function AppText(props: TextProps) {
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}
