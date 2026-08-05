import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';
import React from 'react';

export default function absenceLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sick" />
      <Stack.Screen name="business" />
      <Stack.Screen name="relax" />
      <Stack.Screen name="birth" />
      <Stack.Screen name="detail" />
    </Stack>
  );
}
