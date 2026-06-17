import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';

const BRAND_RED = '#B33939';
const INACTIVE_COLOR = '#585E6D';
const TAB_BAR_BG = '#F8F9FD';

export default function absenceTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: BRAND_RED,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopColor: 'rgba(223, 191, 189, 0.6)',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: TEXT.absence_TAB_APPEAL,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle.badge.minus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          title: TEXT.absence_TAB_WAITING,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: TEXT.absence_TAB_STATS,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TEXT.absence_TAB_HISTORY,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}
