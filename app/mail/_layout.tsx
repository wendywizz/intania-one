import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function MailLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="detail" />
      {/* A form over the screen beneath it rather than a step deeper into
          content — the same slot every other form in the app uses. That
          slot currently animates like a push; see constants/navigation.ts. */}
      <Stack.Screen name="compose" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="webview" />
    </Stack>
  );
}
