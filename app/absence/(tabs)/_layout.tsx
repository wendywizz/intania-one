import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { tabBarButton } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/constants/theme';
import { approvingWaitingData, peekApprovingWaiting } from '@/services/absenceService';
import { scaleFont } from '@/utils/font-scale';

export default function absenceTabLayout() {
  const c = useColors();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  // Boss/approver → gets the "การลาของฉัน" + "อนุมัติลา" tabs; a general user keeps
  // the "รออนุมัติ" + "ประวัติ" tabs.
  //
  // The two sets are mutually exclusive, so unlike the timestamp bar — where a
  // wrong guess only delays one extra tab — guessing here would show a whole
  // wrong bar. Hence it still waits, but only when there is nothing to go on:
  // the home screen asks this same question on the way in, so arriving from
  // there the answer is already known and no gate is drawn at all. A cold deep
  // link is the only case left that waits.
  const cached = peekApprovingWaiting(staffId);
  const [isApprover, setIsApprover] = useState(() => cached?.show ?? false);
  const [isChecking, setIsChecking] = useState(() => !cached);

  useEffect(() => {
    let active = true;
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
      <ThemedView style={{ flex: 1 }}>
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
      }}>
      {/* The leave-form chooser is still a route — /absence lands on it, and the
          pending list links to it — but it is no longer a tab: picking a form is
          something you do once, not a place you return to. `href: null` hides it
          from the bar without removing the screen. */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: TEXT.ABSENCE_TAB_APPEAL,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle.badge.minus" color={color} />,
        }}
      />
      {/* Approver's own tabs, in tab-bar order: approve-leave leads — reviewing
          others' requests is why a boss opens this module — with "การลาของฉัน"
          second. */}
      <Tabs.Screen
        name="approve-leave"
        options={{
          href: bossHref,
          title: TEXT.ABSENCE_APPROVE_LEAVE_TAB,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="checkmark.circle.fill" color={color} />,
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
