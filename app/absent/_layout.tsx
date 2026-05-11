import { Stack } from 'expo-router';
import React from 'react';

export default function AbsentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sick" />
      <Stack.Screen name="business" />
      <Stack.Screen name="relax" />
      <Stack.Screen name="birth" />
    </Stack>
  );
}
