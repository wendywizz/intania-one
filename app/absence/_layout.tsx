import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';
import React from 'react';

export default function absenceLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="(tabs)" />
      {/* Request forms — float in from the bottom like a sheet, not a deeper
          drill into content. */}
      <Stack.Screen name="sick" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="business" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="relax" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="birth" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="detail" />
      <Stack.Screen name="approve-detail" />
      <Stack.Screen name="approve-reason" options={ACTION_SHEET_SCREEN_OPTIONS} />
    </Stack>
  );
}
