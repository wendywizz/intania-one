import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';
import React from 'react';

export default function MeetingLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="detail" />
    </Stack>
  );
}
