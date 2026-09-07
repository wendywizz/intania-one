import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { APP_ICON } from '@/constants/images';
import { TEXT } from '@/constants/text';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

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

  return (
    <View style={styles.cover}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {downloadError ? (
        <ErrorState
          title={TEXT.APP_UPDATE_ERROR_TITLE}
          message={TEXT.APP_UPDATE_ERROR_MESSAGE}
          actions={[
            { label: TEXT.APP_UPDATE_RETRY, onPress: handleRetry, variant: 'primary' },
            { label: TEXT.APP_UPDATE_SKIP, onPress: () => setDismissed(true), variant: 'secondary' },
          ]}
        />
      ) : (
        <View style={styles.body}>
          <View style={styles.iconTile}>
            <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
          </View>
          <ThemedText style={styles.title}>{TEXT.APP_UPDATE_TITLE}</ThemedText>
          <ProgressBar progress={progress} />
          <ThemedText style={styles.caption}>
            {progress >= 1 ? TEXT.APP_UPDATE_INSTALLING : `${TEXT.APP_UPDATE_DOWNLOADING} ${progressPct}%`}
          </ThemedText>
          <ThemedText style={styles.hint}>{TEXT.APP_UPDATE_HINT}</ThemedText>
        </View>
      )}
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const styles = useThemedStyles(makeStyles);
  // Animated rather than a raw `width: ${pct}%` — downloadProgress arrives in
  // discrete jumps (per-asset), and animating between them reads as a
  // continuous bar instead of a stepping one.
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          { width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    cover: {
      flex: 1,
      backgroundColor: c.background,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 32,
    },
    iconTile: {
      width: 88,
      height: 88,
      borderRadius: 22,
      overflow: 'hidden',
      marginBottom: 4,
    },
    appIcon: { width: '100%', height: '100%' },
    title: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: 17,
      marginTop: 4,
    },
    caption: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: 14,
    },
    hint: {
      color: c.textFaint,
      fontFamily: AppFonts.psuRegular,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 2,
    },
    track: {
      width: '100%',
      maxWidth: 260,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
      marginTop: 4,
    },
    fill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: c.primary,
    },
  });
