import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { LoadingAnimate } from "@/components/loading-animate";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/constants/theme";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { getForgetApprovalWaiting } from "@/services/timestampService";

export default function TimestampTabLayout() {
  const c = useColors();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  // Whether the user may approve others' miss-timestamp requests (holds an active
  // executive position or has pending rows). Only then is the approval tab shown.
  const [isApprover, setIsApprover] = useState(false);
  // Wait for the boss check to finish before rendering the tab bar, so the
  // approval tab doesn't flash in after the view has already appeared.
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    setIsChecking(true);
    getForgetApprovalWaiting(staffId)
      .then((result) => {
        if (active) setIsApprover(result.show);
      })
      .catch(() => {
        if (active) setIsApprover(false);
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });
    return () => {
      active = false;
    };
  }, [staffId]);

  if (isChecking) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: c.background }}>
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      </ThemedView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
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
            <IconSymbol size={28} name="clock.fill" color={color} />
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
