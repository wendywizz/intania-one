import { Platform, Pressable } from 'react-native';
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

/**
 * What every Tabs navigator here passes as `tabBarButton`.
 *
 * Native gets HapticTab. **Web gets nothing, on purpose.**
 *
 * React Navigation hands the tab button an `href` alongside `onPress`, and
 * react-native-web renders any Pressable carrying an `href` as a real `<a>`.
 * React Navigation's own default button, PlatformPressable, knows that and
 * calls `event.preventDefault()` before routing, so the anchor never navigates.
 * HapticTab is a bare Pressable and does not — so the browser followed the
 * link and reloaded the whole document on every tab press. That is what looked
 * like the app blanking out and re-fetching each time a tab was tapped.
 *
 * `undefined` rather than a patched HapticTab because `BottomTabItem` declares
 * `button = renderButtonDefault` as a default parameter: leaving it out
 * restores PlatformPressable, which also handles modifier-clicks (cmd/ctrl to
 * open a tab in a new window) that a hand-rolled preventDefault would break.
 * Nothing is lost — the haptics above only ever fire on iOS.
 */
export const tabBarButton = Platform.OS === 'web' ? undefined : HapticTab;

