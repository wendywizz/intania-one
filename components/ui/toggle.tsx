import { Switch, type SwitchProps } from 'react-native';

import { useColors } from '@/constants/theme';

/**
 * The knob is white in both themes on both platforms — it is the platform
 * control's own colour, not a themed surface, so it does not follow the palette.
 */
const THUMB_COLOR = '#FFFFFF';

export type ToggleProps = Omit<
  SwitchProps,
  'trackColor' | 'thumbColor' | 'ios_backgroundColor'
>;

/**
 * The app-wide on/off switch.
 *
 * Wraps RN's Switch purely to get its colours right, because iOS and Android
 * disagree about where the "off" track colour comes from: Android paints
 * `trackColor.false`, while iOS leaves that track transparent at rest and shows
 * `ios_backgroundColor` through it. A Switch that sets only `trackColor` looks
 * correct on Android and washes out to near-invisible on an iOS device — so
 * both are set here, from one token, once.
 */
export function Toggle(props: ToggleProps) {
  const c = useColors();
  return (
    <Switch
      {...props}
      trackColor={{ false: c.borderStrong, true: c.primary }}
      thumbColor={THUMB_COLOR}
      ios_backgroundColor={c.borderStrong}
    />
  );
}
