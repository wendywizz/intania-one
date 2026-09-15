import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/components/biometric-gate';
import { ColdStartSplash } from '@/components/cold-start-splash';
import { ConnectionGate } from '@/components/connection-gate';
import { ToastProvider } from '@/components/toast-provider';
import { UpdateGate } from '@/components/update-gate';
import { REDIRECT_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useBlurOnNavigate } from '@/hooks/use-blur-on-navigate';
import { useNotificationDeepLink } from '@/hooks/use-notification-deep-link';
import { registerForegroundNotificationHandler } from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

/**
 * How long the app has to sit backgrounded before coming back counts as
 * "away long enough to go stale" rather than a quick app-switcher trip.
 *
 * Nothing here is push-driven — a booking made elsewhere, a repair job
 * reassigned, an EAS Update published — so a session that's never force-quit
 * would otherwise keep showing whatever it last fetched, and keep running
 * whatever JS bundle it launched with, indefinitely. Kept well above a quick
 * glance at another app, and well below "a whole day", so a session left open
 * over lunch still comes back current.
 */
const IDLE_RESET_AFTER_MS = 30 * 60 * 1000;

function AppStack() {
  const { isDarkMode } = useTheme();
  const { initializing: isRestoringSession, user } = useAuth();

  // Tapping a notification from the OS opens the screen it is about. Armed from
  // here because the navigator it drives is the one rendered below; the hook
  // waits for that navigator and holds any tap that beats it.
  useNotificationDeepLink(!isRestoringSession && Boolean(user));

  // Web only — see the hook's own docblock for why every route change needs
  // this.
  useBlurOnNavigate();

  /**
   * Nothing mounts until the session is restored.
   *
   * Almost every screen derives its staff id as `user?.staffId || USER_ID`, and
   * USER_ID is empty unless a build sets one — so a screen that mounts during
   * this window fires its whole load with `staff_id=`, which the gateway answers
   * 400. Then the session lands, the id changes, the callbacks change identity,
   * and every one of those screens loads a second time. What that looks like is
   * a spinner, an error, and a spinner again before the data arrives.
   *
   * Waiting costs nothing visible: `restoreSession()` is a local storage read
   * that always settles (it resolves through `.finally`), and BiometricGate is
   * holding its plain cover over the app for exactly this window anyway.
   *
   * `initializing`, not `loading` — `loading` also goes true while a sign-in
   * runs, and unmounting the navigator there blanks the app in the middle of
   * signing in.
   */
  if (isRestoringSession) {
    return null;
  }

  return (
    <>
      {/* Screens draw their own <NavTopBar/>, so the navigator header is off by
          default. Listing routes one by one meant a new route that forgot its
          entry got the native header *as well as* its NavTopBar — two stacked
          bars. Opting out here makes that impossible. */}
      <Stack screenOptions={STACK_SCREEN_OPTIONS}>
        {/* Auth/session hops the user never asked to "navigate" to — no
            transition should be visible when they land. */}
        <Stack.Screen name="login-callback" options={REDIRECT_SCREEN_OPTIONS} />
        <Stack.Screen name="clear-auth" options={REDIRECT_SCREEN_OPTIONS} />
        <Stack.Screen name="oauth/callback" options={REDIRECT_SCREEN_OPTIONS} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    // Sarabun — app-wide typeface (Light/Regular/Medium/SemiBold/Bold), used for
    // every label including the bottom tab bar. Covers Thai and Latin.
    //
    // Sukhumvit Set and PSU Stidti used to be registered here too, "in case a
    // screen hardcoded one of those names" — neither ever was (verified: no
    // `fontFamily` anywhere references them), so both were dropped along with
    // their font files, rather than keeping dead weight registered against a
    // hypothetical. Google Sans, Mitr, and Noto Sans Thai Looped were never
    // even registered — pure unused files, dropped the same way.
    Sarabun_Lt: require('../assets/fonts/Sarabun/Sarabun-Light.ttf'),
    Sarabun_Rg: require('../assets/fonts/Sarabun/Sarabun-Regular.ttf'),
    Sarabun_Md: require('../assets/fonts/Sarabun/Sarabun-Medium.ttf'),
    Sarabun_Sb: require('../assets/fonts/Sarabun/Sarabun-SemiBold.ttf'),
    Sarabun_Bd: require('../assets/fonts/Sarabun/Sarabun-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    registerForegroundNotificationHandler();
  }, []);

  // Bumped once per idle spell past IDLE_RESET_AFTER_MS; used as `key` below
  // to remount everything from AuthProvider down. That's a deliberate reuse
  // of each gate's own cold-start logic rather than a second, parallel set of
  // "resume" branches bolted onto UpdateGate/ConnectionGate/BiometricGate/every
  // screen's data fetch: a fresh mount already checks for an update, pings
  // the gateway, decides whether to lock, and fetches every screen's data
  // from scratch, because that's what a cold start already does. Living here
  // rather than inside one of those gates because the key has to be set from
  // outside the subtree it remounts.
  const [remountKey, setRemountKey] = useState(0);
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'background') {
        backgroundedAtRef.current = Date.now();
        return;
      }
      if (next !== 'active') return;

      const since = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (since === null || Date.now() - since < IDLE_RESET_AFTER_MS) return;
      setRemountKey((k) => k + 1);
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider key={remountKey}>
          <ThemeProvider>
            <ToastProvider>
              {/* Checked before anything else — an EAS Update is unrelated to
                  scooba-service, so it's offered even if the gateway below is
                  unreachable. */}
              <UpdateGate>
                {/* Nothing below this mounts — not the app lock, not the
                    navigator — until scooba-service has answered. */}
                <ConnectionGate>
                  <BiometricGate>
                    <AppStack />
                  </BiometricGate>
                </ConnectionGate>
              </UpdateGate>

              {/* The cold-start splash. A sibling rather than a wrapper around
                  the gate stack above, and declared after it, so it paints on
                  top of whatever any gate is doing underneath — including
                  BiometricGate's own plain cover for this exact window — for
                  as long as the session is still restoring. Remounting along
                  with everything else above means it reappears for an idle
                  reset too, which is correct: that reset re-runs the same
                  session restore this splash exists to cover. */}
              <ColdStartSplash />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
