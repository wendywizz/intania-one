import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarButton } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { moduleTabBarLabelStyle, moduleTabBarStyle } from '@/constants/tab-bar';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import { countIncomingCompOtSwaps, useCompOtSwaps } from '@/stores/compOtSwaps';

/**
 * เวรห้องคอม: the roster, and the exchange/sale requests.
 *
 * The requests tab carries the number waiting for the caller's answer - the
 * only ones that need them to act. It reads the list the two tabs share
 * (stores/compOtSwaps.ts), so it follows every load either tab does and the
 * layout itself never fetches or waits on anything.
 */
export default function CompOtTabLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { requests } = useCompOtSwaps();
  const incoming = countIncomingCompOtSwaps(requests);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        tabBarStyle: moduleTabBarStyle(c, insets.bottom),
        tabBarLabelStyle: moduleTabBarLabelStyle,
      }}>
      <Tabs.Screen
        name="schedule"
        options={{
          title: TEXT.COMP_OT_TAB_SCHEDULE,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar-range" color={color} />,
        }}
      />
      <Tabs.Screen
        name="swaps"
        options={{
          title: TEXT.COMP_OT_TAB_SWAPS,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="replace" color={color} />,
          tabBarBadge: incoming > 0 ? (incoming > 99 ? '99+' : incoming) : undefined,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          // `/comp-ot` (the home tile) redirects to the roster; not a tab of its own.
          href: null,
        }}
      />
    </Tabs>
  );
}
