import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from "expo-router";
import React from "react";

export default function TimestampLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="history-detail" />
      <Stack.Screen name="approve-detail" />
      <Stack.Screen name="approve-reason" />
      <Stack.Screen name="record-detail" />
    </Stack>
  );
}
