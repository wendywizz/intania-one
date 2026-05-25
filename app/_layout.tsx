import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { TEXT } from '@/constants/text';

import { AppFonts } from '@/constants/fonts';
import { AuthProvider } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const [loaded] = useFonts({
    [AppFonts.psuRegular]: require('@/assets/fonts/psu-stidti/psu-stidti-regular.ttf'),
    [AppFonts.psuLight]: require('@/assets/fonts/psu-stidti/psu-stidti-light.ttf'),
    [AppFonts.psuItalic]: require('@/assets/fonts/psu-stidti/psu-stidti-italic.ttf'),
    [AppFonts.psuBold]: require('@/assets/fonts/psu-stidti/psu-stidti-bold.ttf'),
    [AppFonts.psuBoldItalic]: require('@/assets/fonts/psu-stidti/psu-stidti-bolditalic.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="absent" options={{ headerShown: false }} />
            <Stack.Screen name="meeting" options={{ headerShown: false }} />
            <Stack.Screen name="repair-computer" options={{ headerShown: false }} />
            <Stack.Screen name="calendar" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-timestamp" options={{ headerShown: false }} />
            <Stack.Screen name="login-callback" options={{ headerShown: false }} />
            <Stack.Screen name="person-search" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: TEXT.SHARED_MODAL }} />
          </Stack>
          <StatusBar style="dark" />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
