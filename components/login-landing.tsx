/**
 * The whole home screen for someone who is not signed in.
 *
 * Nothing on the signed-in home applies to a visitor — no greeting, no pending
 * work, no module menu, and the staff news feed is for staff — so rather than
 * strip that screen down to a login button, a visitor gets this page of its own:
 * the brand on a red drafting-grid field, and the PSU Passport button on a card
 * at the bottom where a thumb reaches it.
 *
 * Designed on the "Intania One — Login" Claude Design canvas (artboard G).
 */
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { AppText as Text } from '@/components/app-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { APP_ICON_MARK, PSU_PASSPORT_BUTTON, PSU_PASSPORT_BUTTON_ASPECT } from '@/constants/images';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { useColors, useThemedStyles, type AppColors } from '@/constants/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '—';

// react-native-web has no native animation driver.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** The drafting grid: fine lines, with every fourth one heavier. */
const GRID_MINOR = 32;
const GRID_MAJOR = GRID_MINOR * 4;

// Text on this page does not follow the device's text-size setting at all: it
// is a poster — a 52pt wordmark, a few short lines and an image button — laid
// out to fit one screen, and on phones set to large text it blew up. The rest of
// the app keeps the usual MAX_FONT_SCALE cap.
const TEXT_MAX_SCALE = 1;

/** The column never grows past this, so a tablet or desktop browser gets a
 *  phone-proportioned layout centred on the red field, not a stretched one. */
const MAX_CONTENT_WIDTH = 480;

/** Width of the artboard the layout was drawn at; the mark scales off it. */
const DESIGN_WIDTH = 390;

/** Space between the top safe-area edge and the eyebrow line. */
const TOP_GAP = 28;

/** Height of the eyebrow row (its line height). */
const EYEBROW_HEIGHT = 18;

/** How far down the mark artwork its linework ends — the PNG carries padding. */
const MARK_INK_BOTTOM = 0.8;

type LoginLandingProps = {
  onLogin: () => void;
};

export function LoginLanding({ onLogin }: LoginLandingProps) {
  const s = useThemedStyles(makeStyles);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // The mark, as drawn on the 390pt artboard: a faint watermark on a disc a
  // shade darker than the field, circled by one hairline ring, centred where
  // design C put its mark (x = 300) so it hangs off the right edge. Everything
  // scales with the column so a small phone and a tablet keep the same
  // composition.
  const columnWidth = Math.min(screenWidth, MAX_CONTENT_WIDTH);
  const k = columnWidth / DESIGN_WIDTH;
  const eyebrowTop = insets.top + TOP_GAP;
  // Artboard coordinates are offsets from artTop (y = 40 on the artboard).
  const artTop = eyebrowTop - Math.round(32 * k);
  const discSize = Math.round(340 * k);
  const discTop = artTop + Math.round(60 * k);
  const ringSize = Math.round(374 * k);
  // Centred on the disc and well inside it — at the disc's own size the
  // linework ran right up to its rim.
  const markSize = Math.round(360 * k);
  const markTop = artTop + Math.round(50 * k);
  // The headline starts below the mark's linework, never over it.
  const heroTopPad = Math.max(0, markTop + markSize * MARK_INK_BOTTOM - eyebrowTop - EYEBROW_HEIGHT);

  // Entrance: the mark settles in, then the headline and the card rise into
  // place one after the other. Skipped outright under Reduce Motion.
  const artIn = useRef(new Animated.Value(0)).current;
  const heroIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const values = [artIn, heroIn, cardIn];
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          values.forEach((v) => v.setValue(1));
          return;
        }
        const rise = (value: Animated.Value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          });
        Animated.parallel([
          Animated.timing(artIn, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.stagger(120, [rise(heroIn), rise(cardIn)]),
        ]).start();
      });
    return () => {
      cancelled = true;
      values.forEach((v) => v.stopAnimation());
    };
  }, [artIn, heroIn, cardIn]);

  const riseStyle = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id="login-grid-minor" width={GRID_MINOR} height={GRID_MINOR} patternUnits="userSpaceOnUse">
            <Path
              d={`M ${GRID_MINOR} 0 L 0 0 0 ${GRID_MINOR}`}
              fill="none"
              stroke="rgba(255,255,255,0.045)"
              strokeWidth={1}
            />
          </Pattern>
          <Pattern id="login-grid-major" width={GRID_MAJOR} height={GRID_MAJOR} patternUnits="userSpaceOnUse">
            <Path
              d={`M ${GRID_MAJOR} 0 L 0 0 0 ${GRID_MAJOR}`}
              fill="none"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth={1}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#login-grid-minor)" />
        <Rect width="100%" height="100%" fill="url(#login-grid-major)" />
      </Svg>

      {/* Background art, outside the ScrollView: it stays put while the page
          scrolls on a short screen, and anything that overhangs the column
          on a tablet can't give web a sideways scrollbar. */}
      <View pointerEvents="none" style={s.artLayer}>
        <Animated.View
          style={[
            s.artColumn,
            {
              width: columnWidth,
              opacity: artIn,
              transform: [{ scale: artIn.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            },
          ]}>
          <View
            style={[
              s.ring,
              {
                left: Math.round(112 * k),
                top: discTop - Math.round(17 * k),
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
              },
            ]}
          />
          <View
            style={[
              s.disc,
              {
                left: Math.round(130 * k),
                top: discTop,
                width: discSize,
                height: discSize,
                borderRadius: discSize / 2,
              },
            ]}
          />
          <Image
            source={APP_ICON_MARK}
            style={[s.mark, { left: Math.round(120 * k), top: markTop, width: markSize, height: markSize }]}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: eyebrowTop, paddingBottom: insets.bottom + 20 },
        ]}>
        <View style={s.column}>
          <View style={s.eyebrowRow}>
            <View style={s.eyebrowDot} />
            <Text numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE} style={s.eyebrow}>{TEXT.HOME_LANDING_EYEBROW}</Text>
          </View>

          {/* On a tall screen the spare height goes above the headline, keeping
              it just over the card; on a short one the page scrolls. */}
          <Animated.View style={[s.hero, { paddingTop: heroTopPad }, riseStyle(heroIn)]}>
            {/* Both on one line on purpose. Sarabun's font file carries a much
                taller line box (1.85x its size) than the 1.3x it is drawn
                with, and on iOS a line break inside a Text opened up to that
                taller box — two lines of the wordmark sat ~94pt apart. A single
                line has no gap between lines to open up; shrink-to-fit keeps it
                on one line on a narrow screen. */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={TEXT_MAX_SCALE}
              style={s.title}>
              {TEXT.HOME_APP_NAME}{' '}
              {/* Capped again: AppText sets its own default cap on every Text,
                  nested ones included, which would let this word outgrow the
                  one it sits beside. */}
              <Text maxFontSizeMultiplier={TEXT_MAX_SCALE} style={s.titleAccent}>
                {TEXT.HOME_LANDING_TITLE_SUFFIX}
              </Text>
            </Text>
            <View style={s.rule} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={TEXT_MAX_SCALE}
              style={s.tagline}>
              {TEXT.HOME_LANDING_TAGLINE}
            </Text>
          </Animated.View>

          <Animated.View style={[s.footer, riseStyle(cardIn)]}>
            <View style={s.card}>
              {/* The artwork carries the wording, so the button has no label of
                  its own — hence the explicit accessibility label. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.AUTH_LOGIN}
                onPress={onLogin}
                style={({ pressed }) => [s.loginBtn, pressed && s.pressed]}>
                <Image source={PSU_PASSPORT_BUTTON} style={s.loginBtnImage} contentFit="contain" />
              </Pressable>
              <View style={s.noteRow}>
                <IconSymbol name="checkmark.shield" size={14} color={c.textMuted} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  maxFontSizeMultiplier={TEXT_MAX_SCALE}
                  style={s.note}>{TEXT.HOME_LOGIN_NOTE}</Text>
              </View>
            </View>
            <Text maxFontSizeMultiplier={TEXT_MAX_SCALE} style={s.version}>
              {`${TEXT.HOME_APP_NAME} ${TEXT.HOME_LANDING_TITLE_SUFFIX} · v${APP_VERSION}`}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  // The brand red in both themes — this page is the app's front door, not a
  // themed surface. Only the login card below follows light/dark.
  container: { flex: 1, overflow: 'hidden', backgroundColor: c.primary },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: 28,
  },

  artLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  // Explicitly unclipped: on a tablet the column is narrower than the screen
  // and the art must not be cut at the column's edge.
  artColumn: {
    flex: 1,
    overflow: 'visible',
  },
  // A hairline echo of the disc — the same ring the splash's BrandMark pulses.
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  // A shade darker than the field, set behind the mark so it reads as a badge
  // on the grid rather than a faint shape lost in it.
  disc: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  mark: {
    position: 'absolute',
    opacity: 0.22,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.textOnPrimary,
  },
  eyebrow: {
    flexShrink: 1,
    fontFamily: 'Sarabun_Md',
    fontSize: 12,
    lineHeight: EYEBROW_HEIGHT,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.8)',
  },

  hero: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: 14,
  },
  title: {
    fontFamily: 'Sarabun_Bd',
    // "Intania One" on one line within the column's 334pt at 390pt wide.
    fontSize: 44,
    lineHeight: 56,
    letterSpacing: -0.8,
    color: c.textOnPrimary,
  },
  titleAccent: {
    color: '#F6C9C6',
  },
  // Separates the name from what the app is for.
  rule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  tagline: {
    fontFamily: 'Sarabun_Rg',
    // One line at 390pt wide without leaning on shrink-to-fit, which web lacks.
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
  },

  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 16,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 14,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    boxShadow: boxShadow('#3C0A0E', { y: 18, blur: 40, opacity: 0.34 }),
  },
  // Width-driven: the height follows the artwork's own ratio, so the button can
  // never end up stretched.
  loginBtn: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: PSU_PASSPORT_BUTTON_ASPECT,
    borderRadius: 6,
    boxShadow: boxShadow('#1E3C8C', { y: 6, blur: 14, opacity: 0.22 }),
  },
  loginBtnImage: {
    width: '100%',
    height: '100%',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  note: {
    flexShrink: 1,
    fontFamily: 'Sarabun_Rg',
    fontSize: 13,
    lineHeight: 20,
    color: c.textMuted,
  },
  version: {
    fontFamily: 'Sarabun_Rg',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
  },
});
