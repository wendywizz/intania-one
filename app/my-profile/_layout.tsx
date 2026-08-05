import { STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function MyProfileLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}
