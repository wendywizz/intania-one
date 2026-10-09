import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { OrbitLoader } from '@/components/orbit-loader';

type LoadingAnimateProps = {
  /** Kept for compatibility; the loader no longer renders any text. */
  title?: string;
  desc?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's waiting state: a grey ring with the app icon's amber dot orbiting
 * along it (OrbitLoader), so a screen that is loading still looks like part of
 * the app rather than like a generic pause.
 *
 * The props are unchanged — dozens of screens render this — so the swap needed
 * no edits at the call sites.
 */
export function LoadingAnimate({ fill = true, style }: LoadingAnimateProps) {
  return (
    <View style={[styles.container, fill ? styles.fill : undefined, style]}>
      <OrbitLoader size={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // `stretch` so the mark centres on the screen's width even when the parent
    // is a column that packs its children to the start — without it the loader
    // is only as wide as itself and "centred" means centred on nothing.
    alignSelf: 'stretch',
    paddingVertical: 24,
  },
  fill: {
    flex: 1,
  },
});
