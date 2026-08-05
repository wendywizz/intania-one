import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { GestureResponderEvent, PressableProps, ViewStyle } from 'react-native';

type HapticTabProps = PressableProps & {
  pointerEvents?: ViewStyle['pointerEvents'];
};

export function HapticTab({ pointerEvents, style, ...props }: HapticTabProps) {
  'use no memo';

  return (
    <Pressable
      {...props}
      // Pressable's `style` may itself be a (state) => style callback, so the
      // incoming value has to be resolved per press state before it can be
      // merged — spreading it straight into an array is not a valid style.
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        pointerEvents ? { pointerEvents } : undefined,
      ]}
      onPressIn={(ev: GestureResponderEvent) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

