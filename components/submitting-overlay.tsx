import { StyleSheet, View } from 'react-native';
import { InfinityLoader } from '@/components/infinity-loader';

import { useColors } from '@/constants/theme';

type SubmittingOverlayProps = {
  /** When true, dims the screen content and blocks all interaction. */
  visible: boolean;
};

// A full-screen scrim shown while a mutation is in flight: it reduces the
// content's apparent opacity (a translucent wash over everything) and captures
// every touch so the user can't interact with the screen until the request
// settles. Render it as the LAST child of the screen container so it sits above
// the content and any action bar. Colors come from constants/theme.ts.
export function SubmittingOverlay({ visible }: SubmittingOverlayProps) {
  const c = useColors();
  if (!visible) return null;

  return (
    <View
      // Capture all touches so nothing behind the scrim is interactive.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: `${c.background}B3` }]}
    >
      <InfinityLoader size={60} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
