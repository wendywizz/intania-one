import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/constants/theme';
import { TEXT } from '@/constants/text';

type LoadingAnimateProps = {
  title?: string;
  desc?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Minimalist loader: a single thin ring with one accent arc that rotates
// continuously. Theme-aware — the track uses the border token, the arc the
// brand accent — so it reads the same on light and dark surfaces.
export function LoadingAnimate({
  title = TEXT.SHARED_LOADING_DATA_TITLE,
  desc = TEXT.SHARED_PLEASE_WAIT_A_MOMENT,
  fill = true,
  style,
}: LoadingAnimateProps) {
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
      {title ? (
        <ThemedText style={[styles.title, { color: c.textMuted }]}>{title}</ThemedText>
      ) : null}
      {desc ? (
        <ThemedText style={[styles.message, { color: c.textFaint }]}>{desc}</ThemedText>
      ) : null}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
});
