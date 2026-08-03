import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { APP_ICON } from '@/constants/images';
import { TEXT } from '@/constants/text';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { pingScoobaService } from '@/services/healthService';

type ConnectionStatus = 'checking' | 'online' | 'offline';

/**
 * Pings scooba-service before the app is allowed to open.
 *
 * Every module here is a thin UI over that gateway, so a gateway that is not
 * answering means nothing in the app works. Without this the user gets in, taps
 * a menu, and meets a different failure on every screen. Instead: one probe,
 * one answer, and — when it fails — one screen that says so.
 *
 * Both outcomes are shown on *this* screen, by swapping its content. Routing to
 * a separate screen for the failure meant mounting the navigator first, and the
 * home screen flashed up for a frame on the way to the notice. Holding the
 * navigator back until the gateway answers also stops every screen firing its
 * own requests at a server we have not reached.
 */
export function ConnectionGate({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const { isDarkMode } = useTheme();
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [retrying, setRetrying] = useState(false);
  const didStartupCheckRef = useRef(false);

  const runProbe = useCallback(async () => {
    const reachable = await pingScoobaService();
    setStatus(reachable ? 'online' : 'offline');
    return reachable;
  }, []);

  // The startup probe. Runs once per launch — anything after that comes from
  // the retry button.
  useEffect(() => {
    if (didStartupCheckRef.current) return;
    didStartupCheckRef.current = true;
    void runProbe();
  }, [runProbe]);

  // Retrying keeps the notice on screen and puts the spinner in the button,
  // rather than falling back to the loading state — swapping the whole screen
  // out and back for a probe that usually fails again just flickers.
  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    await runProbe();
    setRetrying(false);
  }, [retrying, runProbe]);

  if (status === 'online') return <>{children}</>;

  return (
    <View style={styles.cover}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {status === 'checking' ? (
        <View style={styles.checking}>
          <View style={styles.iconTile}>
            <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
          </View>
          <InfinityLoader size={64} />
          <ThemedText style={styles.caption}>{TEXT.SERVICE_CHECK_CONNECTING}</ThemedText>
        </View>
      ) : (
        <ErrorState
          variant="offline"
          title={TEXT.SERVICE_UNAVAILABLE_TITLE}
          message={TEXT.SERVICE_UNAVAILABLE_MESSAGE}
          onRetry={handleRetry}
          retryLabel={retrying ? TEXT.SERVICE_UNAVAILABLE_RETRYING : TEXT.SERVICE_UNAVAILABLE_RETRY}
          retrying={retrying}
        />
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: c.background,
  },
  // Both states fill the cover and centre themselves in it (ErrorState does its
  // own), so swapping one for the other doesn't move anything around it.
  checking: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconTile: {
    width: 88,
    height: 88,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 4,
  },
  appIcon: { width: '100%', height: '100%' },
  caption: {
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
  },
});
