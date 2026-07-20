import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';

import { ToastProvider } from '@/components/toast-provider';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { registerForegroundNotificationHandler } from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

function AppStack() {
  const { isDarkMode } = useTheme();
  return (
    <NavThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="absence" options={{ headerShown: false }} />
        <Stack.Screen name="meeting" options={{ headerShown: false }} />
        <Stack.Screen name="repair-computer" options={{ headerShown: false }} />
        <Stack.Screen name="notice-repair" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="news" options={{ headerShown: false }} />
        <Stack.Screen name="news-detail" options={{ headerShown: false }} />
        <Stack.Screen name="notification" options={{ headerShown: false }} />
        <Stack.Screen name="timestamp" options={{ headerShown: false }} />
        <Stack.Screen name="clear-auth" options={{ headerShown: false }} />
        <Stack.Screen name="login-callback" options={{ headerShown: false }} />
        <Stack.Screen name="openid-webview" options={{ headerShown: false }} />
        <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="person-search" options={{ headerShown: false }} />
        <Stack.Screen name="examiner" options={{ headerShown: false }} />
        <Stack.Screen name="examinar" options={{ headerShown: false }} />
        <Stack.Screen name="my-profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile-field" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: TEXT.SHARED_MODAL }} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    LINESeedSansTH_Th: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_Th.ttf'),
    LINESeedSansTH_Rg: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_Rg.ttf'),
    LINESeedSansTH_Bd: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_Bd.ttf'),
    LINESeedSansTH_XBd: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_XBd.ttf'),
    // IBM Plex Sans Thai — clean, loopless minimalist sans (Airbnb-style trial on Home)
    IBMPlexSansThai_Rg: require('../assets/fonts/IBMPlexSansThai/IBMPlexSansThai-Regular.ttf'),
    IBMPlexSansThai_Md: require('../assets/fonts/IBMPlexSansThai/IBMPlexSansThai-Medium.ttf'),
    IBMPlexSansThai_Sb: require('../assets/fonts/IBMPlexSansThai/IBMPlexSansThai-SemiBold.ttf'),
    IBMPlexSansThai_Bd: require('../assets/fonts/IBMPlexSansThai/IBMPlexSansThai-Bold.ttf'),
    // FC Mittraphap — single-weight display sans (Home trial). NOTE: non-commercial license.
    FCMittraphap: require('../assets/fonts/FC Mittraphap/FC Mittraphap.ttf'),
    // PSU Stidti — Prince of Songkla University's official typeface (Light/Regular/Bold).
    PSUStidti_Lt: require('../assets/fonts/psu-stidti/psu-stidti-light.ttf'),
    PSUStidti_Rg: require('../assets/fonts/psu-stidti/psu-stidti-regular.ttf'),
    PSUStidti_Bd: require('../assets/fonts/psu-stidti/psu-stidti-bold.ttf'),
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
              <AppStack />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

