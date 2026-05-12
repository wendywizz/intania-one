import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type LoadingAnimateProps = {
  title?: string;
  desc?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LoadingAnimate({
  title = 'Loading',
  desc = 'Please wait a moment',
  fill = true,
  style,
}: LoadingAnimateProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.08],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <View style={[styles.container, fill ? styles.fill : undefined, style]}>
      <Animated.View style={[styles.loadingMark, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.loadingDot, styles.primaryDot]} />
        <View style={[styles.loadingDot, styles.secondaryDot]} />
        <View style={[styles.loadingDot, styles.accentDot]} />
      </Animated.View>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {desc ? <ThemedText style={styles.message}>{desc}</ThemedText> : null}
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
  loadingMark: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  primaryDot: {
    top: 4,
    backgroundColor: '#0A6E8A',
  },
  secondaryDot: {
    bottom: 8,
    left: 8,
    backgroundColor: '#4D9A7B',
  },
  accentDot: {
    right: 8,
    bottom: 8,
    backgroundColor: '#D89A2B',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
});
