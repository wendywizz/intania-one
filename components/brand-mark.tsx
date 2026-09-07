/**
 * The app icon, dressed up as a loading mark: on the cold-start splash, two
 * rings pulse outward behind it like a radar ping; everywhere it's used, the
 * icon itself scales and settles in on mount.
 *
 * Shared by ColdStartSplash and UpdateGate so the two red-branded "please
 * wait" screens read as one family instead of two separately-invented looks.
 *
 * Renders APP_ICON_MARK — the icon's own linework with its red backing
 * colour-keyed out — rather than APP_ICON, so the mark sits bare on the
 * splash's red the way the source design has it, with nothing behind it to
 * ring or tile.
 */
import { Image } from 'expo-image';
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

import { APP_ICON_MARK } from '@/constants/images';

// react-native-web has no native animation driver.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** One radar ping, rings-out-and-fades. */
const PULSE_MS = 2600;

type BrandMarkProps = {
  /** Width and height of the whole mark, in points. */
  size?: number;
  /** The two expanding rings — used on the cold-start splash; left off on the
   *  EAS Update screen, where the mark is smaller and a second effect would
   *  crowd it. */
  pulseRings?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({ size = 216, pulseRings = false, style }: BrandMarkProps) {
  const reveal = useRef(new Animated.Value(0)).current;
  const rings = useRef([new Animated.Value(0), new Animated.Value(0)]).current;

  // The icon's own entrance: fades and scales up past 1 before settling back
  // — a visible pop rather than a snap, now that it's the only thing that
  // announces the mark has arrived (the rotating sweep that used to share
  // that job is gone). Low friction relative to tension is what gives a
  // spring its overshoot.
  useEffect(() => {
    Animated.spring(reveal, {
      toValue: 1,
      friction: 4,
      tension: 45,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [reveal]);

  // The two radar rings, staggered half a cycle apart so one is always
  // mid-ping — only wired up where asked for.
  useEffect(() => {
    if (!pulseRings) return;
    const loops = rings.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * (PULSE_MS / 2)),
          Animated.timing(value, {
            toValue: 1,
            duration: PULSE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.delay(PULSE_MS / 2 - i * (PULSE_MS / 2)),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [pulseRings, rings]);

  const ringSize = size * 0.94;
  // No tile/ring around it any more, so the mark itself can run bigger —
  // it was capped smaller before to leave room for the border.
  const markSize = size * 0.72;

  return (
    <View style={[styles.center, { width: size, height: size }, style]}>
      {pulseRings &&
        rings.map((value, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                opacity: value.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.55, 0] }),
                transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.3] }) }],
              },
            ]}
          />
        ))}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.markWrap,
          {
            width: markSize,
            height: markSize,
            opacity: reveal,
            transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        <Image source={APP_ICON_MARK} style={styles.icon} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  // No background/border here on purpose — the mark is transparent PNG
  // linework, meant to sit bare on the red behind it.
  markWrap: { position: 'absolute' },
  icon: { width: '100%', height: '100%' },
});
