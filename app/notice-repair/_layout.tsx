import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function NoticeRepairLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      {/* Adding a material returns straight to the detail screen — keep the
          transition instant so it reads as "stay on detail, just updated". */}
      <Stack.Screen name="add-material" options={{ animation: 'none' }} />
    </Stack>
  );
}
