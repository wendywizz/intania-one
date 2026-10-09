/**
 * The app's loader: a grey ring with the icon's amber dot orbiting along it.
 *
 * It borrows the app icon's two parts — the amber tile becomes the moving dot,
 * and the ring is a quiet neutral track for it to run on — so a screen that is
 * waiting still reads as Intania One rather than as a stock spinner.
 *
 * How it works: the ring is a bordered circle that never moves; the dot sits on
 * the ring's centre-line inside a full-size layer, and that layer is rotated.
 * Rotation is a style transform, so RN `Animated` drives it on native (native
 * driver) and on web alike — unlike an SVG attribute (dash offset), which
 * react-native-svg's web build cannot take from either animation library.
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useColors } from '@/constants/theme';

type OrbitLoaderProps = {
  /** Outer diameter in points, dot included. */
  size?: number;
  /** One orbit of the dot, in ms. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
  /** Announced to screen readers in place of the animation. */
  accessibilityLabel?: string;
  /**
   * A faint dark disc behind the ring.
   *
   * Amber on a white card is low-contrast; the disc gives the dot something to
   * stand out against wherever the loader lands, without darkening the screen
   * the way a scrim would.
   */
  backdrop?: boolean;
};

export function OrbitLoader({
  size = 32,
  duration = 1100,
  style,
  accessibilityLabel,
  backdrop = true,
}: OrbitLoaderProps) {
  const c = useColors();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        // The native driver doesn't exist on web; there it falls back to JS.
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, duration]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const stroke = Math.max(2, size * 0.09);
  const dot = size * 0.26;
  // The ring is inset so the dot, centred on its stroke, stays inside `size`.
  const ringInset = (dot - stroke) / 2;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        backdrop && [styles.backdrop, { padding: size * 0.32, borderRadius: size }],
        style,
      ]}>
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.ring,
            {
              top: ringInset,
              left: ringInset,
              right: ringInset,
              bottom: ringInset,
              borderRadius: size,
              borderWidth: stroke,
              borderColor: c.borderStrong,
            },
          ]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <View
            style={[
              styles.dot,
              {
                left: (size - dot) / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: c.brandAmber,
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Deliberately not a theme token: the same faint black in both themes keeps
  // the amber readable on a white card without becoming a box on a dark one.
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  ring: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    top: 0,
  },
});
