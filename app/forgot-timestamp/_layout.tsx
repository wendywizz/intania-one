import { Stack } from "expo-router";
import React from "react";

export default function ForgotTimestampLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="history-detail" />
    </Stack>
  );
}
