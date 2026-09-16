import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui';
import { useColors } from '@/constants/theme';

/**
 * The wait for a GPS fix, drawn as the thing being waited for: a map pin
 * hovering over a spot on the ground, dropping to it and lifting away again
 * while a ring spreads out underneath.
 *
 * The app's usual loader is its infinity mark, which says "something is
 * happening" and nothing else. On the ลงเวลา screens the first wait is
 * specifically for the phone to find itself — often the slowest part, indoors —
 * so the picture may as well say which.
 *
 * Animated with transforms and opacity only. Animating an SVG attribute breaks
 * on web (see components/infinity-loader.tsx, which steps its dash offset by
 * hand for that reason); a View that moves and fades behaves everywhere.
 */

/** The native driver cannot take these off the JS thread on web. */
const NATIVE = Platform.OS !== 'web';

export function LocatingPin() {
  const c = useColors();

  // 0 = hovering high, 1 = touched down.
  const drop = useRef(new Animated.Value(0)).current;
  // 0 = ring tight and visible, 1 = spread and gone.
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(drop, {
            toValue: 1,
            duration: 520,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(drop, {
            toValue: 0,
            duration: 620,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: NATIVE,
          }),
        ]),
        // The ring leaves as the pin lands, so the two read as one event: the
        // pin hits the ground and the ground answers.
        Animated.sequence([
          Animated.delay(360),
          Animated.timing(ring, {
            toValue: 1,
            duration: 780,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
        ]),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [drop, ring]);

  return (
    <View style={styles.stage}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: c.primary,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) }],
          },
        ]}
      />

      {/* The ground the pin drops onto: it shrinks as the pin nears, the way a
          shadow tightens under something coming down. */}
      <Animated.View
        style={[
          styles.shadow,
          {
            backgroundColor: c.borderStrong,
            opacity: drop.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] }),
            transform: [{ scaleX: drop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.62] }) }],
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [
            { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
          ],
        }}
      >
        <IconSymbol size={38} name="mappin" color={c.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The pin sits above its own ground, so the stage is laid out from the
  // bottom: shadow and ring on the floor, pin resting on them.
  stage: {
    alignItems: 'center',
    alignSelf: 'stretch',
    height: 92,
    justifyContent: 'flex-end',
    paddingBottom: 14,
  },
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    bottom: 8,
    height: 44,
    position: 'absolute',
    width: 44,
  },
  shadow: {
    borderRadius: 999,
    bottom: 12,
    height: 5,
    position: 'absolute',
    width: 26,
  },
});
