import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getForgetApprovalWaiting } from "@/services/timestampService";

export default function TimestampTabLayout() {
  const colorScheme = useColorScheme();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  // Whether the user may approve others' miss-timestamp requests (holds an active
  // executive position or has pending rows). Only then is the approval tab shown.
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    let active = true;
    getForgetApprovalWaiting(staffId)
      .then((result) => {
        if (active) setIsApprover(result.show);
      })
      .catch(() => {
        if (active) setIsApprover(false);
      });
    return () => {
      active = false;
    };
  }, [staffId]);

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
        name="approve"
        options={{
          // Boss inbox — hidden from the tab bar unless the user is an approver.
          href: isApprover ? undefined : null,
          title: TEXT.TIMESTAMP_APPROVE_TAB,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="checkmark.circle.fill" color={color} />
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
