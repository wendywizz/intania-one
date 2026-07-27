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

import { BiometricGate } from '@/components/biometric-gate';
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
    // Sukhumvit Set — app-wide typeface (Thin/Light/Text/Medium/SemiBold/Bold).
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
    // Sarabun — app-wide typeface (Light/Regular/Medium/SemiBold/Bold).
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
              <BiometricGate>
                <AppStack />
              </BiometricGate>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

