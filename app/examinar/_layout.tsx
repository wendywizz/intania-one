import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function ExaminarLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" />
      <Stack.Screen name="detail" />
    </Stack>
  );
}
