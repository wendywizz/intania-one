import type { ViewStyle } from 'react-native';

/**
 * ABSOLUTE_FILL — the plain-object form of "pin to every edge of the parent".
 *
 * React Native 0.86 dropped `StyleSheet.absoluteFillObject` (runtime and types
 * both). `StyleSheet.absoluteFill` still exists but is a *registered* style, an
 * opaque id rather than an object, so it cannot be spread into a
 * `StyleSheet.create` entry the way every call site here does:
 *
 *   overlay: { ...ABSOLUTE_FILL, zIndex: 10 },
 *
 * Spreading the registered value instead yields `undefined` and the overlay
 * silently loses its positioning, so this literal takes its place.
 */
export const ABSOLUTE_FILL: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};
