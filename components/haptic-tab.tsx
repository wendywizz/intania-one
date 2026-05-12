import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import type { ViewStyle } from 'react-native';

type HapticTabProps = BottomTabBarButtonProps & {
  pointerEvents?: ViewStyle['pointerEvents'];
};

export function HapticTab({ pointerEvents, style, ...props }: HapticTabProps) {
  'use no memo';

  return (
    <PlatformPressable
      {...props}
      style={[style, pointerEvents ? { pointerEvents } : undefined]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
