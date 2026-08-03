/**
 * Booking Room tab bar.
 *
 * Tab keys map to route files as:
 *   current_booking  → index    (so /booking-room lands on it)
 *   booking_schedule → schedule
 *   booking_history  → history
 */
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { scaleFont } from '@/utils/font-scale';

export default function BookingRoomTabLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        tabBarStyle: {
          backgroundColor: c.primary,
          borderTopColor: c.primary,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: scaleFont(11),
          fontFamily: AppFonts.psuRegular,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: TEXT.BOOKING_ROOM_TAB_CURRENT,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: TEXT.BOOKING_ROOM_TAB_SCHEDULE,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar-range" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TEXT.BOOKING_ROOM_TAB_HISTORY,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="history" color={color} />,
        }}
      />
    </Tabs>
  );
}
