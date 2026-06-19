import { Stack } from 'expo-router';
import React from 'react';

export default function RepairComputerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="edit-job" />
      <Stack.Screen name="foreman-job-detail" />
      <Stack.Screen name="job-history-detail" />
      <Stack.Screen name="user-job-detail" />
      <Stack.Screen name="worker-job-detail" />
      <Stack.Screen name="assign-job" />
      <Stack.Screen name="reject-job" />
      <Stack.Screen name="worker-reject-job" />
      <Stack.Screen name="operate-job" />
    </Stack>
  );
}
