import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { InfinityLoader } from '@/components/infinity-loader';

type LoadingAnimateProps = {
  /** Kept for compatibility; the loader no longer renders any text. */
  title?: string;
  desc?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's waiting state: the icon's infinity mark, with a lit segment
 * running round it.
 *
 * Was a rotating ring, which is what every app uses and so said nothing about
 * this one. The mark is the same one on the home screen and the app icon, so a
 * screen that is loading still looks like part of the app rather than like a
 * generic pause.
 *
 * The props are unchanged — dozens of screens render this — so the swap needed
 * no edits at the call sites.
 */
export function LoadingAnimate({ fill = true, style }: LoadingAnimateProps) {
  return (
    <View style={[styles.container, fill ? styles.fill : undefined, style]}>
      <InfinityLoader size={72} />
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
