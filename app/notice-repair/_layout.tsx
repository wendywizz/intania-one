import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function NoticeRepairLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      {/* Adding a material returns straight to the detail screen — keep the
          transition instant so it reads as "stay on detail, just updated". */}
      <Stack.Screen name="add-material" options={{ animation: 'none' }} />
      <Stack.Screen name="detail" />
      <Stack.Screen name="header-estimate-detail" />
      <Stack.Screen name="index" />
      <Stack.Screen name="supply-list" />
      {/* Reject/edit/requisition forms — float in from the bottom like a
          sheet, not a deeper drill into content. */}
      <Stack.Screen name="admin-reject" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="edit" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="not-agree" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="requisition" options={ACTION_SHEET_SCREEN_OPTIONS} />
    </Stack>
  );
}
