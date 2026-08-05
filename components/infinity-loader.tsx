/**
 * The app icon's infinity mark, drawn as a loader.
 *
 * The icon puts a five-colour gradient through the lemniscate — white into
 * blue, green, orange, pink — and this traces that same path with a lit segment
 * running round it, so the wait looks like the app rather than like a spinner
 * that could belong to anything.
 *
 * How it works: the whole figure is stroked once as a faint track, and a second
 * copy of the same path is stroked with a dash pattern of "one visible segment,
 * then a gap the length of the rest". Animating that dash's offset walks the
 * segment along the curve. The gradient stays fixed to the shape, not to the
 * segment, so the segment changes colour as it travels — which is what makes it
 * read as the icon's own mark and not as a coloured worm.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useColors } from '@/constants/theme';

/**
 * A lemniscate in a 100×48 box, as two mirrored loops meeting at the centre.
 *
 * Written as cubic curves rather than as an SVG arc so the two lobes are
 * symmetrical about the crossing point — an arc-based figure eight pinches on
 * one side, which shows up the moment something travels along it.
 */
const PATH =
  'M50 24 C50 24 38 4 24 4 C10 4 4 13 4 24 C4 35 10 44 24 44 C38 44 50 24 50 24 ' +
  'C50 24 62 4 76 4 C90 4 96 13 96 24 C96 35 90 44 76 44 C62 44 50 24 50 24 Z';

/**
 * Length of that path in user units, 264.55, rounded up.
 *
 * Measured by sampling each of the eight cubics at 2000 steps and summing the
 * chords — the dash pattern below is expressed in path length, so a guess here
 * would leave a visible gap or overlap where the loop closes.
 */
const PATH_LENGTH = 265;

/** How much of the figure is lit at a time. */
const SEGMENT = PATH_LENGTH * 0.28;

type InfinityLoaderProps = {
  /** Width in points; the height follows the 100:48 aspect. */
  size?: number;
  /** Stroke weight, in the same units as `size`. */
  strokeWidth?: number;
  /** One loop of the segment, in ms. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
  /** Announced to screen readers in place of the animation. */
  accessibilityLabel?: string;
  /**
   * A faint dark plate behind the mark.
   *
   * The gradient runs through white and pale yellows, which disappear against a
   * white card — the plate keeps the lit segment readable wherever the loader
   * lands without darkening the screen the way a scrim would.
   */
  backdrop?: boolean;
};

export function InfinityLoader({
  size = 68,
  strokeWidth = 5,
  duration = 1600,
  style,
  accessibilityLabel,
  backdrop = true,
}: InfinityLoaderProps) {
  const c = useColors();

  /**
   * The dash offset is stepped in React rather than through an animation
   * library, and the `Path` below is a plain one.
   *
   * Both drivers reach an SVG attribute through react-native-svg's web
   * `setNativeProps`, which reads its updates out of `props.style` — the shape
   * Reanimated sends, not the one RN's own `Animated` sends. Animating through
   * either one therefore works on native and breaks on web, in the two
   * different ways this loader has already broken. One number per frame owes
   * nothing to either, so it renders the same on both.
   *
   * The cost is a re-render per frame, which is affordable here and nowhere
   * else: this is one small `Svg` with two paths, on screen only while
   * something is loading. Don't copy the pattern to anything larger.
   */
  const [dashOffset, setDashOffset] = useState(PATH_LENGTH);

  useEffect(() => {
    let frame: number;
    let startedAt: number | null = null;

    const step = (now: number) => {
      startedAt ??= now;
      // Wrapped on the period rather than restarted, so a dropped frame shifts
      // the segment's phase instead of jumping it back to the start.
      const progress = ((now - startedAt) % duration) / duration;
      // Counts down through one full length so the segment travels forwards;
      // the dash pattern repeats, so the loop is seamless with no visible reset.
      setDashOffset(PATH_LENGTH * (1 - progress));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  const height = (size * 48) / 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        backdrop && [
          styles.backdrop,
          // Padded off the mark's own box, with the corner radius scaled to the
          // plate so it stays a squircle at every size rather than a stadium at
          // the small ones.
          {
            paddingHorizontal: size * 0.16,
            paddingVertical: height * 0.28,
            borderRadius: size * 0.22,
          },
        ],
        style,
      ]}>
      <Svg width={size} height={height} viewBox="0 0 100 48">
        <Defs>
          {/* The icon's own run of colour, left to right. */}
          <LinearGradient id="infinityStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#2E86DE" />
            <Stop offset="0.3" stopColor="#20BF6B" />
            <Stop offset="0.55" stopColor="#F7B731" />
            <Stop offset="0.78" stopColor="#FA8231" />
            <Stop offset="1" stopColor="#FC5C7D" />
          </LinearGradient>
        </Defs>

        {/* The track: the whole figure, faint, so the lit segment always has a
            shape to travel on and the loader keeps its size while it runs. */}
        <Path
          d={PATH}
          fill="none"
          stroke={c.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <Path
          d={PATH}
          fill="none"
          stroke="url(#infinityStroke)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${SEGMENT} ${PATH_LENGTH - SEGMENT}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Deliberately not a theme token: it is the same faint black in both themes,
  // which is what keeps the pale end of the gradient readable on a white card
  // without turning into a visible box on a dark one.
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
