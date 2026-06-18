import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';

import { AuthProvider } from '@/context/AuthContext';
import { registerForegroundNotificationHandler } from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const [loaded] = useFonts({
    LINESeedSansTH_Th: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_Th.ttf'),
    LINESeedSansTH_Rg: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_Rg.ttf'),
    LINESeedSansTH_Bd: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_Bd.ttf'),
    LINESeedSansTH_XBd: require('../assets/fonts/LINE_Seed_Sans_TH/TTF/LINESeedSansTH_A_XBd.ttf'),
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
          <ThemeProvider value={DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="absence" options={{ headerShown: false }} />
              <Stack.Screen name="meeting" options={{ headerShown: false }} />
              <Stack.Screen name="repair-computer" options={{ headerShown: false }} />
              <Stack.Screen name="calendar" options={{ headerShown: false }} />
              <Stack.Screen name="news" options={{ headerShown: false }} />
              <Stack.Screen name="news-detail" options={{ headerShown: false }} />
              <Stack.Screen name="notification" options={{ headerShown: false }} />
              <Stack.Screen name="forgot-timestamp" options={{ headerShown: false }} />
              <Stack.Screen name="clear-auth" options={{ headerShown: false }} />
              <Stack.Screen name="login-callback" options={{ headerShown: false }} />
              <Stack.Screen name="openid-webview" options={{ headerShown: false }} />
              <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
              <Stack.Screen name="person-search" options={{ headerShown: false }} />
              <Stack.Screen name="my-profile" options={{ headerShown: false }} />
              <Stack.Screen name="edit-profile-field" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: TEXT.SHARED_MODAL }} />
            </Stack>
            <StatusBar style="dark" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
