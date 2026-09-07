import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from "expo-router";
import React from "react";

export default function TimestampLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="history-detail" />
      <Stack.Screen name="approve-detail" />
      <Stack.Screen name="record-detail" />
      {/* Approve-with-reason form — floats in from the bottom like a sheet,
          not a deeper drill into content. */}
      <Stack.Screen name="approve-reason" options={ACTION_SHEET_SCREEN_OPTIONS} />
    </Stack>
  );
}
