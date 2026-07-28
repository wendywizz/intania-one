import { Tabs } from 'expo-router';
import React from 'react';
import { TEXT } from '@/constants/text';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';
import { scaleFont } from '@/utils/font-scale';

export default function MeetingTabLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
          backgroundColor: c.primary,
          borderTopColor: c.primary,
        },
        tabBarLabelStyle: {
          fontSize: scaleFont(11),
          fontFamily: AppFonts.psuRegular,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: TEXT.MEETING_TODAY,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="incoming"
        options={{
          title: TEXT.MEETING_INCOMING,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TEXT.SHARED_HISTORY,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="history" color={color} />,
        }}
      />
    </Tabs>
  );
}
