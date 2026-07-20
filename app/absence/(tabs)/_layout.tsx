import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/constants/theme';
import { approvingWaitingData } from '@/services/absenceService';

export default function absenceTabLayout() {
  const c = useColors();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  // Boss/approver → gets the "การลาของฉัน" + "อนุมัติลา" tabs; a general user keeps
  // the "รออนุมัติ" + "ประวัติ" tabs. Wait for the check so the bar doesn't flicker.
  const [isApprover, setIsApprover] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    setIsChecking(true);
    approvingWaitingData(staffId)
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
      <ThemedView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      </ThemedView>
    );
  }

  // Tabs shown only to a boss vs only to a general user.
  const bossHref = isApprover ? undefined : null;
  const generalHref = isApprover ? null : undefined;

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
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: TEXT.ABSENCE_TAB_APPEAL,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle.badge.minus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-leave"
        options={{
          href: bossHref,
          title: TEXT.ABSENCE_MY_LEAVE_TAB,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="approve-leave"
        options={{
          href: bossHref,
          title: TEXT.ABSENCE_APPROVE_LEAVE_TAB,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="checkmark.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          href: generalHref,
          title: TEXT.ABSENCE_TAB_WAITING,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: TEXT.ABSENCE_TAB_STATS,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: generalHref,
          title: TEXT.ABSENCE_TAB_HISTORY,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="history" color={color} />,
        }}
      />
    </Tabs>
  );
}
