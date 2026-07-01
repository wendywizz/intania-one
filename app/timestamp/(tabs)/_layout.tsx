import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { TEXT } from "@/constants/text";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TimestampTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: TEXT.TIMESTAMP_CALENDAR_TAB,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="calendar-range" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forgot-timestamp"
        options={{
          title: TEXT.TIMESTAMP_FORGOT_TAB,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          // Thin redirect to `forgot-timestamp`; keep the /timestamp route working
          // but hide it from the bottom tab bar.
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          // History is now a top tab inside `forgot-timestamp`; keep the route as a
          // redirect but hide it from the bottom tab bar.
          href: null,
        }}
      />
    </Tabs>
  );
}
