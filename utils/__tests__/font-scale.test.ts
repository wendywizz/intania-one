/**
 * The app-wide text metrics: one scale knob, and a floor under every line box.
 *
 * The floor exists because React Native scales `lineHeight` in step with
 * `fontSize`, so a line box too tight for the PSU faces crops them at every
 * text size — invisibly at the default, and by a dozen pixels on a phone set to
 * large type.
 */
import { StyleSheet } from 'react-native';

import { FONT_SCALE, scaleFont } from '@/utils/font-scale';

/** The sheet as the app will actually use it. */
function sheet(style: Record<string, unknown>) {
  return StyleSheet.flatten(StyleSheet.create({ s: style }).s) as {
    fontSize?: number;
    lineHeight?: number;
  };
}

describe('scaleFont', () => {
  it('applies the app-wide scale', () => {
    expect(scaleFont(10)).toBe(Math.round(10 * FONT_SCALE));
  });
});

describe('the line-height floor', () => {
  it('widens a line box tighter than 1.35x the font size', () => {
    const { fontSize, lineHeight } = sheet({ fontSize: 56, lineHeight: 64 });

    expect(lineHeight! / fontSize!).toBeGreaterThanOrEqual(1.35);
  });

  it('leaves a roomier line box alone', () => {
    const { lineHeight } = sheet({ fontSize: 14, lineHeight: 21 });

    expect(lineHeight).toBe(scaleFont(21));
  });

  it('does not invent a line height where the sheet sets none', () => {
    expect(sheet({ fontSize: 56 }).lineHeight).toBeUndefined();
  });

  it('ignores styles with no text metrics', () => {
    expect(sheet({ height: 54 })).toEqual({ height: 54 });
  });
});
