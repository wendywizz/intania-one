import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

// Resolved from package.json by app.config.js — same source settings.tsx
// reads, so the two never disagree about what version is running.
const APP_VERSION = Constants.expoConfig?.version ?? '—';

/**
 * Checks EAS Update on every launch, before anything else mounts.
 *
 * The check itself is silent — nothing renders differently while it's in
 * flight (it's usually a few hundred ms, and there's rarely an update to
 * report). This gate only takes over the screen once an update is actually
 * found: it downloads it with a visible progress bar, then reloads the app
 * straight into it.
 *
 * Placed outside ConnectionGate — EAS Update's servers have nothing to do
 * with scooba-service, so an update should still be offered even if the
 * gateway itself is unreachable.
 */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const { isDarkMode } = useTheme();
  const { isUpdateAvailable, isUpdatePending, isDownloading, downloadProgress, downloadError } =
    Updates.useUpdates();

  const [dismissed, setDismissed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const startedCheckRef = useRef(false);
  const startedFetchRef = useRef(false);

  // Disabled in dev/Expo Go/web — expo-updates only does anything in a real
  // EAS-built binary, and calling it outside that just rejects.
  const skippable = Platform.OS === 'web' || !Updates.isEnabled;

  // The startup check. Failure here (offline, update server unreachable, no
  // update published) should never block the app — it just means nothing
  // below ever flips `isUpdateAvailable`, so `children` renders as normal.
  useEffect(() => {
    if (skippable || startedCheckRef.current) return;
    startedCheckRef.current = true;
    Updates.checkForUpdateAsync().catch(() => {});
    // retryToken re-runs this after a failed download, in case the earlier
    // failure was the check itself rather than the fetch.
  }, [skippable, retryToken]);

  // Once an update is confirmed, download it — once per check.
  useEffect(() => {
    if (!isUpdateAvailable || isDownloading || startedFetchRef.current) return;
    startedFetchRef.current = true;
    Updates.fetchUpdateAsync().catch(() => {
      // Surfaced via `downloadError` from useUpdates(); handled in render below.
    });
  }, [isUpdateAvailable, isDownloading]);

  // Once downloaded, reload straight into it. Nothing meaningful runs after
  // this — the app restarts on the new bundle.
  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  const handleRetry = useCallback(() => {
    startedCheckRef.current = false;
    startedFetchRef.current = false;
    setRetryToken((t) => t + 1);
  }, []);

  if (skippable || dismissed || !isUpdateAvailable) {
    return <>{children}</>;
  }

  const progress = Math.max(0, Math.min(1, downloadProgress ?? 0));
  const progressPct = Math.round(progress * 100);

  if (downloadError) {
    return (
      <View style={styles.errorCover}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ErrorState
          title={TEXT.APP_UPDATE_ERROR_TITLE}
          message={TEXT.APP_UPDATE_ERROR_MESSAGE}
          actions={[
            { label: TEXT.APP_UPDATE_RETRY, onPress: handleRetry, variant: 'primary' },
            { label: TEXT.APP_UPDATE_SKIP, onPress: () => setDismissed(true), variant: 'secondary' },
          ]}
        />
      </View>
    );
  }

  return (
    // Fixed brand red rather than the themed background — this is the same
    // red-branded "please wait" family as the cold-start splash and the
    // biometric lock screen, not a neutral system surface.
    <View style={styles.cover}>
      <StatusBar style="light" />
      <View style={styles.body}>
        <BrandMark size={132} />
        <ThemedText style={styles.title}>{TEXT.APP_UPDATE_TITLE}</ThemedText>
        <ThemedText style={styles.stage}>
          {progress >= 1 ? TEXT.APP_UPDATE_INSTALLING : TEXT.APP_UPDATE_DOWNLOADING}
        </ThemedText>

        <View style={styles.progressBlock}>
          <ProgressBar progress={progress} />
          <ThemedText style={styles.progressPct}>{progressPct}%</ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.hint}>{TEXT.APP_UPDATE_HINT}</ThemedText>
        <ThemedText style={styles.version}>v{APP_VERSION}</ThemedText>
      </View>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const styles = useThemedStyles(makeStyles);
  // Animated rather than a raw `width: ${pct}%` — downloadProgress arrives in
  // discrete jumps (per-asset), and animating between them reads as a
  // continuous bar instead of a stepping one.
  const widthAnim = useRef(new Animated.Value(0)).current;
  // The shimmer sweeping across the fill — purely decorative, loops for as
  // long as the bar is mounted regardless of how far the fill has actually
  // gotten.
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          { width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-80, 340],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // The download/install body — fixed brand red, matching ColdStartSplash
    // and BiometricGate's overlay rather than the themed background.
    cover: {
      flex: 1,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The failure branch keeps ErrorState's own themed look (it assumes a
    // neutral surface, not a brand-red one — see its own styles), so it gets
    // a plain cover rather than the red one above.
    errorCover: {
      flex: 1,
      backgroundColor: c.background,
    },
    body: {
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 32,
    },
    title: {
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuBold,
      fontSize: 19,
      marginTop: 8,
    },
    stage: {
      color: 'rgba(255,255,255,0.85)',
      fontFamily: AppFonts.psuRegular,
      fontSize: 14,
      marginBottom: 8,
    },
    progressBlock: {
      width: '100%',
      maxWidth: 280,
      gap: 8,
    },
    progressPct: {
      alignSelf: 'flex-end',
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuBold,
      fontSize: 12,
    },
    track: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.22)',
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: c.textOnPrimary,
    },
    // A soft band of light sweeping across the fill — purely decorative, so
    // it can loop on a fixed timer independent of the real download speed.
    // No `right: 0` alongside the explicit `width` below — pairing the two
    // would leave the engine to arbitrate between them.
    shimmer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 80,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    footer: {
      position: 'absolute',
      bottom: 48,
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 32,
    },
    hint: {
      color: 'rgba(255,255,255,0.9)',
      fontFamily: AppFonts.psuRegular,
      fontSize: 12,
      textAlign: 'center',
    },
    version: {
      color: 'rgba(255,255,255,0.7)',
      fontFamily: AppFonts.psuBold,
      fontSize: 11,
      letterSpacing: 1.5,
    },
  });
