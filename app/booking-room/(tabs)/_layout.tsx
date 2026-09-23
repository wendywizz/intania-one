/**
 * Booking Room tab bar.
 *
 * Tab keys map to route files as:
 *   current_booking  → index    (so /booking-room lands on it)
 *   booking_schedule → schedule
 *   booking_history  → completed
 *
 * The key stays `booking_history` — it is the server's, and the tab permission
 * it gates is the same one whatever the tab is called here.
 */
import { Tabs } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarButton } from '@/components/haptic-tab';
import { moduleTabBarStyle } from '@/constants/tab-bar';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MIN_LINE_HEIGHT_RATIO, scaleFont } from '@/utils/font-scale';

export default function BookingRoomTabLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        tabBarStyle: moduleTabBarStyle(c, insets.bottom),
        tabBarLabelStyle: {
          fontSize: scaleFont(11),
          lineHeight: Math.round(scaleFont(11) * MIN_LINE_HEIGHT_RATIO),
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
        name="completed"
        options={{
          title: TEXT.BOOKING_ROOM_TAB_COMPLETED,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="history" color={color} />,
        }}
      />
    </Tabs>
  );
}
