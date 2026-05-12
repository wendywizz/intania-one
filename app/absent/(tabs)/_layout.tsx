import { Tabs } from 'expo-router';
import React from 'react';
import { TEXT } from '@/constants/text';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AbsentTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: TEXT.TITLE_6,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle.badge.minus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="waiting"
        options={{
          title: TEXT.TITLE_7,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TEXT.TITLE_8,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}
