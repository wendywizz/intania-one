import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function MyProfileLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      {/* A single-field edit form — floats in from the bottom like a sheet,
          not a deeper drill into content. */}
      <Stack.Screen name="edit-field" options={ACTION_SHEET_SCREEN_OPTIONS} />
    </Stack>
  );
}
