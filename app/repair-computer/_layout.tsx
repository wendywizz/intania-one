import { Stack } from 'expo-router';
import React from 'react';

export default function RepairComputerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="edit-job" />
      <Stack.Screen name="foreman-job-detail" />
    </Stack>
  );
}
