import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppFonts } from '@/constants/fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="absent" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'โมดัล' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
