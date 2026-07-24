import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useColors } from '@/constants/theme';

type LoadingAnimateProps = {
  /** Kept for compatibility; the loader no longer renders any text. */
  title?: string;
  desc?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Minimalist loader: a single thin ring with one accent arc that rotates
// continuously. Theme-aware — the track uses the border token, the arc the
// brand accent — so it reads the same on light and dark surfaces. No text.
export function LoadingAnimate({ fill = true, style }: LoadingAnimateProps) {
  const c = useColors();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, fill ? styles.fill : undefined, style]}>
      <Animated.View
        accessibilityRole="progressbar"
        style={[
          styles.ring,
          {
            borderColor: c.border,
            borderTopColor: c.primary,
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  fill: {
    flex: 1,
  },
  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
  },
});
