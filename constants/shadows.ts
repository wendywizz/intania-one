/**
 * boxShadow — builds the CSS shadow string RN expects, from a palette colour
 * plus an opacity.
 *
 * Replaces the `shadowColor` / `shadowOffset` / `shadowOpacity` / `shadowRadius`
 * quartet, which react-native-web warns about ('"shadow*" style props are
 * deprecated. Use "boxShadow".') and which RN itself deprecated once the New
 * Architecture landed. One `boxShadow` string renders on iOS, Android and web
 * from the same declaration.
 *
 * Android note: `elevation` is NOT paired with these. Under the New
 * Architecture (RN 0.76+, `newArchEnabled` in app.json) Android draws
 * `boxShadow` itself, so keeping `elevation` too would stack a second shadow on
 * top. Where a view relied on `elevation` for stacking rather than for its
 * shadow, use `zIndex`.
 *
 * Usage — one property in place of four:
 *   boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
 */

type ShadowSpec = {
  /** Horizontal offset in px (default 0). */
  x?: number;
  /** Vertical offset in px (default 0). */
  y?: number;
  /** Blur radius in px (default 0). */
  blur?: number;
  /** Spread distance in px (default 0, omitted from the output when 0). */
  spread?: number;
  /** 0–1, applied to `color`. */
  opacity: number;
};

/**
 * Applies an alpha to a hex colour. Every shadow colour in the app's palettes
 * is a hex literal; anything else is passed through untouched, which drops the
 * opacity rather than emitting a shadow string the parser would reject.
 */
function withAlpha(color: string, opacity: number): string {
  const alpha = Math.max(0, Math.min(1, opacity));
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;

  const hex =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function boxShadow(color: string, { x = 0, y = 0, blur = 0, spread = 0, opacity }: ShadowSpec): string {
  const offsets = spread === 0 ? `${x}px ${y}px ${blur}px` : `${x}px ${y}px ${blur}px ${spread}px`;
  return `${offsets} ${withAlpha(color, opacity)}`;
}
