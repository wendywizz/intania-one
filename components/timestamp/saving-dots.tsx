import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

type SavingDotsProps = {
  color: string;
  size?: number;
};

const DOTS = [0, 1, 2];
const STEP_MS = 220;

/**
 * Three dots that light up one after another — "the app is working, hold on".
 * Opacity only, so it runs on the native driver and behaves the same on web.
 */
export function SavingDots({ color, size = 10 }: SavingDotsProps) {
  const values = useRef(DOTS.map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const pulse = (value: Animated.Value) =>
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: STEP_MS, easing: Easing.out(Easing.quad), useNativeDriver }),
        Animated.timing(value, { toValue: 0.25, duration: STEP_MS, easing: Easing.in(Easing.quad), useNativeDriver }),
      ]);
    const loop = Animated.loop(Animated.stagger(STEP_MS, [...values.map(pulse), Animated.delay(STEP_MS)]));

    loop.start();
    return () => loop.stop();
  }, [values]);

  return (
    <View accessibilityRole="progressbar" style={styles.row}>
      {values.map((opacity, index) => (
        <Animated.View
          key={DOTS[index]}
          style={{ backgroundColor: color, borderRadius: size / 2, height: size, opacity, width: size }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
});
