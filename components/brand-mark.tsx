/**
 * The app icon, dressed up as a loading mark: a rotating sweep of the brand's
 * own gradient glows behind it, and — on the cold-start splash only — two
 * rings pulse outward like a radar ping.
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
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { APP_ICON_MARK } from '@/constants/images';

// react-native-web has no native animation driver.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** One rotation of the glow behind the icon. */
const SPIN_MS = 3400;
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
  const spin = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const rings = useRef([new Animated.Value(0), new Animated.Value(0)]).current;

  // The rotating gradient glow — runs for as long as the mark is on screen,
  // cold-start splash or update download alike.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  // The icon's own scale-and-settle entrance.
  useEffect(() => {
    Animated.spring(reveal, {
      toValue: 1,
      friction: 6,
      tension: 90,
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

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowSize = size * 0.9;
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

      <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
        <Svg width={glowSize} height={glowSize} viewBox="0 0 100 100">
          <Defs>
            {/* The app's own gradient run (matches InfinityLoader), so the glow
                reads as the icon's own colour rather than a generic spinner. */}
            <LinearGradient id="brandSweep" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2E86DE" />
              <Stop offset="0.3" stopColor="#20BF6B" />
              <Stop offset="0.55" stopColor="#F7B731" />
              <Stop offset="0.78" stopColor="#FA8231" />
              <Stop offset="1" stopColor="#FC5C7D" />
            </LinearGradient>
          </Defs>
          <Circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#brandSweep)"
            strokeWidth={size * 0.085}
            strokeLinecap="round"
            // ~40% of the ring lit, the rest a gap — a sweep, not a solid halo.
            strokeDasharray="105 158"
            opacity={0.55}
          />
        </Svg>
      </Animated.View>

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
