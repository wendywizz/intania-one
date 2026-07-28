/**
 * usePopAnimation — the app's entrance animation for short action menus.
 *
 * The scrim fades in and the panel scales up in place, instead of the whole
 * panel travelling in from off-screen. A full slide reads as heavier than the
 * choice being made when the menu is only two or three rows tall.
 *
 * Drive the host <Modal> with the returned `isMounted`, not the caller's
 * `visible` — the modal has to outlive the closing animation or it gets ripped
 * off screen the instant `visible` flips to false.
 *
 * Used by components/ui/sheet.tsx (animation="pop") and the photo menu in
 * app/my-profile.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

// react-native-web doesn't support the native animation driver.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const IN_MS = 190;
const OUT_MS = 140;
const FROM_SCALE = 0.94;

export type PopAnimation = {
  /** Feed this to <Modal visible>, so the exit animation can play out. */
  isMounted: boolean;
  /** Animated style for the full-screen scrim layer. */
  backdropStyle: { opacity: Animated.Value };
  /** Animated style for the panel itself. */
  panelStyle: { transform: { scale: Animated.AnimatedInterpolation<number> }[] };
};

export function usePopAnimation(visible: boolean): PopAnimation {
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale = useRef(
    progress.interpolate({ inputRange: [0, 1], outputRange: [FROM_SCALE, 1] }),
  ).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: OUT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      // A cancelled run means `visible` flipped back on mid-close; leaving the
      // modal mounted is what lets it animate straight back open.
      if (finished) setIsMounted(false);
    });
  }, [visible, progress]);

  return {
    isMounted,
    backdropStyle: { opacity: progress },
    panelStyle: { transform: [{ scale }] },
  };
}
