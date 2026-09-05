import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

import { tabBarButton } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AppFonts } from "@/constants/fonts";
import { useColors } from "@/constants/theme";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgetApprovalWaiting,
  peekForgetApprovalWaiting,
} from "@/services/timestampService";
import { scaleFont } from "@/utils/font-scale";

export default function TimestampTabLayout() {
  const c = useColors();
  const { user: authUser, isLecturer } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  // Whether the user may approve others' miss-timestamp requests (holds an active
  // executive position or has pending rows). Only then is the approval tab shown.
  //
  // Seeded from the answer the home screen already got, so in the normal flow
  // (home -> this) the tab bar is right on its first frame. This used to hold
  // the whole navigator back behind a full-screen loader until the check
  // returned, to stop the approval tab appearing a beat late — but that traded
  // a tab sliding in for the entire screen going blank on every entry, which
  // reads as the app reloading. A tab arriving late is the smaller cost.
  const [isApprover, setIsApprover] = useState(
    () => peekForgetApprovalWaiting(staffId)?.show ?? false,
  );

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
        headerShown: false,
        tabBarButton,
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
      }}
    >
      <Tabs.Screen
        name="stamp"
        options={{
          // Lecturers only (POSITION_ID), and declared first so it is the tab a
          // lecturer's eye lands on. `isLecturer` comes from AuthContext, which
          // seeds it from AsyncStorage before the first paint — unlike the
          // approval tab below, this one does not arrive a beat late.
          href: isLecturer ? undefined : null,
          title: TEXT.LECT_TIMESTAMP_TAB,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="log-in" color={color} />
          ),
        }}
      />
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
