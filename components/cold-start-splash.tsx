/**
 * Screen 1 of the splash design: the branded intro shown on every cold start,
 * covering the gap while the session restores (the same window BiometricGate's
 * plain cover was already holding — see its docblock). Mounted as the topmost
 * layer in RootLayout, above every gate, so nothing that gate stack renders
 * underneath (loading spinners, the biometric lock's own cover) is ever
 * visible through it.
 *
 * `initializing` is usually a local-storage read and settles in well under a
 * second — too fast for the reveal below to play out. Rather than cut the
 * animation off mid-beat, the splash holds for MIN_DISPLAY_MS (the design's
 * own "1.8s intro" plus a bit more breathing room) and only then dismisses,
 * once the session is *also* ready.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { ABSOLUTE_FILL } from '@/constants/layout';
import { TEXT } from '@/constants/text';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
// The design's "1.8s intro" (1800ms) plus 500ms more so the reveal has room
// to settle before the fade-out starts.
const MIN_DISPLAY_MS = 2300;
const FADE_OUT_MS = 320;

export function ColdStartSplash() {
  const styles = useThemedStyles(makeStyles);
  const { initializing } = useAuth();

  const [holdElapsed, setHoldElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const coverOpacity = useRef(new Animated.Value(1)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(14)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => setHoldElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Reveal choreography — logo first (BrandMark handles its own entrance),
  // then the wordmark, then the tagline and loader rising in under it. Timed
  // to land inside MIN_DISPLAY_MS.
  useEffect(() => {
    Animated.sequence([
      Animated.delay(750),
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(1150),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(1400),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [wordmarkOpacity, taglineOpacity, taglineY, loaderOpacity]);

  useEffect(() => {
    if (!initializing && holdElapsed) {
      Animated.timing(coverOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) setHidden(true);
      });
    }
  }, [initializing, holdElapsed, coverOpacity]);

  if (hidden) return null;

  return (
    // No pointerEvents override: this cover is meant to block touches to
    // whatever any gate underneath is doing while it's up, the same as
    // BiometricGate's own cover — 'none' would let taps fall straight
    // through to it instead.
    <Animated.View style={[styles.cover, { opacity: coverOpacity }]}>
      <StatusBar style="light" />

      <BrandMark size={216} pulseRings />

      <View style={styles.copy}>
        <Animated.Text style={[styles.wordmark, { opacity: wordmarkOpacity }]}>
          INTANIA ONE
        </Animated.Text>
        <View style={styles.divider} />
        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
          ]}
        >
          {TEXT.SPLASH_TAGLINE}
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footerArea, { opacity: loaderOpacity }]}>
        <PulsingDots />
        <ThemedText style={styles.footer}>{TEXT.SPLASH_FOOTER}</ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

/** An indeterminate loader, deliberately — session restore has no real
 *  progress fraction to report, and a bar that fills to a number nobody
 *  measured would be lying about it. */
function PulsingDots() {
  const values = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(value, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 420,
            easing: Easing.in(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.delay((values.length - 1 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [values]);

  return (
    <View style={dotStyles.row}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            dotStyles.dot,
            {
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
});

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    cover: {
      ...ABSOLUTE_FILL,
      // Fixed brand red regardless of theme — this is the same colour the
      // native launch screen behind it just handed off from.
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 34,
      // Above every other gate's own cover/overlay.
      zIndex: 1000,
      elevation: 1000,
    },
    copy: { alignItems: 'center', gap: 12 },
    wordmark: {
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuBold,
      fontSize: 26,
      letterSpacing: 4,
    },
    divider: {
      width: 40,
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    tagline: {
      color: 'rgba(255,255,255,0.94)',
      fontFamily: AppFonts.psuRegular,
      fontSize: 15,
    },
    footerArea: {
      position: 'absolute',
      bottom: 56,
      alignItems: 'center',
      gap: 20,
    },
    footer: {
      color: 'rgba(255,255,255,0.78)',
      fontFamily: AppFonts.psuBold,
      fontSize: 11,
      letterSpacing: 2,
    },
  });
