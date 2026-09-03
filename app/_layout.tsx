import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/components/biometric-gate';
import { ConnectionGate } from '@/components/connection-gate';
import { ToastProvider } from '@/components/toast-provider';
import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useNotificationDeepLink } from '@/hooks/use-notification-deep-link';
import { registerForegroundNotificationHandler } from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

function AppStack() {
  const { isDarkMode } = useTheme();
  const { initializing: isRestoringSession, user } = useAuth();

  // Tapping a notification from the OS opens the screen it is about. Armed from
  // here because the navigator it drives is the one rendered below; the hook
  // waits for that navigator and holds any tap that beats it.
  useNotificationDeepLink(!isRestoringSession && Boolean(user));

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
      <Stack screenOptions={STACK_SCREEN_OPTIONS} />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    // Sukhumvit Set — currently referenced by nothing; kept registered only so a
    // screen that hardcodes one of these names still renders. Safe to drop.
    SukhumvitSet_Thin: require('../assets/fonts/Sukhumvit-Set/SukhumvitSet-Thin.ttf'),
    SukhumvitSet_Light: require('../assets/fonts/Sukhumvit-Set/SukhumvitSet-Light.ttf'),
    SukhumvitSet_Text: require('../assets/fonts/Sukhumvit-Set/SukhumvitSet-Text.ttf'),
    SukhumvitSet_Md: require('../assets/fonts/Sukhumvit-Set/SukhumvitSet-Medium.ttf'),
    SukhumvitSet_Sb: require('../assets/fonts/Sukhumvit-Set/SukhumvitSet-SemiBold.ttf'),
    SukhumvitSet_Bd: require('../assets/fonts/Sukhumvit-Set/SukhumvitSet-Bold.ttf'),
    // PSU Stidti — Prince of Songkla University's official typeface (Light/Regular/Bold).
    PSUStidti_Lt: require('../assets/fonts/PSU-Stidti/psu-stidti-light.ttf'),
    PSUStidti_Rg: require('../assets/fonts/PSU-Stidti/psu-stidti-regular.ttf'),
    PSUStidti_Bd: require('../assets/fonts/PSU-Stidti/psu-stidti-bold.ttf'),
    // Sarabun — app-wide typeface (Light/Regular/Medium/SemiBold/Bold), used for
    // every label including the bottom tab bar. Covers Thai and Latin.
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

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {/* Outermost gate: nothing below it mounts — not the app lock,
                  not the navigator — until scooba-service has answered. */}
              <ConnectionGate>
                <BiometricGate>
                  <AppStack />
                </BiometricGate>
              </ConnectionGate>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
