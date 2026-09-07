import { ACTION_SHEET_SCREEN_OPTIONS, STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { Stack } from 'expo-router';

export default function BookingRoomLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="booking-detail" />
      <Stack.Screen name="booking-slots" />
      <Stack.Screen name="meeting-room-date" />
      <Stack.Screen name="meeting-room-detail" />
      {/* Booking forms and pickers — float in from the bottom like a sheet,
          not a deeper drill into content. */}
      <Stack.Screen name="cart" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="general-booking" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="meeting-room-form" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="period-booking" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="select-booking" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="select-room-type" options={ACTION_SHEET_SCREEN_OPTIONS} />
      <Stack.Screen name="term-booking" options={ACTION_SHEET_SCREEN_OPTIONS} />
    </Stack>
  );
}
