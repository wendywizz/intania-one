import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';
import React from 'react';

export default function RepairComputerLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="foreman-job-detail" />
      <Stack.Screen name="job-history-detail" />
      <Stack.Screen name="user-job-detail" />
      <Stack.Screen name="worker-job-detail" />
      <Stack.Screen name="supply-result" />
      {/* Assign/edit/reject/operate forms and pickers — float in from the
          bottom like a sheet, not a deeper drill into content. */}
      <Stack.Screen name="assign-job" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="edit-job" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="operate-job" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="reject-job" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="request-supply" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="select-foreman" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="supply-approval" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="worker-reject-job" options={ACTION_SHEET_SCREEN_OPTIONS} />
    </Stack>
  );
}
