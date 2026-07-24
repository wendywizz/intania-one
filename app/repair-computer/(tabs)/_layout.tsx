import { Tabs, router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { HapticTab } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_USER,
  PRIVILEGE_RC_TECH,
  REPAIR_COMPUTER_DEFAULT_ROLE,
  type RepairComputerRole,
} from '@/constants/types';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { RepairComputerRoleProvider } from '@/context/RepairComputerRoleContext';
import {
  getCachedRepairComputerPrivilege,
  setCachedRepairComputerPrivilege,
} from '@/context/repairComputerRoleSelection';
import { checkPrivilege } from '@/services/repairComputerService';

function normalizeRepairComputerRole(privilege?: string): RepairComputerRole {
  if (privilege === PRIVILEGE_RC_TECH || privilege === PRIVILEGE_RC_FOREMAN) {
    return privilege;
  }

  return REPAIR_COMPUTER_DEFAULT_ROLE;
}

function getDefaultRoute(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_TECH) {
    return '/repair-computer/worker-new-job';
  }

  if (role === PRIVILEGE_RC_FOREMAN) {
    return '/repair-computer/foreman-new-job';
  }

  return '/repair-computer/current-job';
}

function getRouteRole(pathname: string): RepairComputerRole | null {
  if (
    pathname === '/repair-computer/worker-new-job' ||
    pathname === '/repair-computer/worker-current-job' ||
    pathname === '/repair-computer/worker-history'
  ) {
    return PRIVILEGE_RC_TECH;
  }

  if (
    pathname === '/repair-computer/foreman-new-job' ||
    pathname === '/repair-computer/manage-job' ||
    pathname === '/repair-computer/foreman-history'
  ) {
    return PRIVILEGE_RC_FOREMAN;
  }

  if (
    pathname === '/repair-computer/inform' ||
    pathname === '/repair-computer/current-job' ||
    pathname === '/repair-computer/queue' ||
    pathname === '/repair-computer/history'
  ) {
    return PRIVILEGE_RC_USER;
  }

  return null;
}

function blurActiveWebElement() {
  if (Platform.OS !== 'web') {
    return;
  }

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

export default function RepairComputerTabLayout() {
  const c = useColors();
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const userId = authUser?.staffId || USER_ID;
  const cachedPrivilegeRole = getCachedRepairComputerPrivilege(userId) ?? REPAIR_COMPUTER_DEFAULT_ROLE;
  const [privilegeRole, setPrivilegeRole] = useState<RepairComputerRole>(cachedPrivilegeRole);
  // Always use the highest privilege role (no switching)
  const currentRole = privilegeRole;
  const [isCheckingPrivilege, setIsCheckingPrivilege] = useState(!getCachedRepairComputerPrivilege(userId));
  const lastRedirectRef = useRef('');
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const replaceRoute = useCallback((route: string) => {
    if (pathname === route || lastRedirectRef.current === route) {
      return;
    }

    lastRedirectRef.current = route;
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = setTimeout(() => {
      redirectTimerRef.current = null;
      router.replace(route as Parameters<typeof router.replace>[0]);
    }, 0);
  }, [pathname]);

  useEffect(() => {
    lastRedirectRef.current = '';
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPrivilege() {
      const cachedUserRole = getCachedRepairComputerPrivilege(userId);

      if (cachedUserRole) {
        setPrivilegeRole(cachedUserRole);
        setIsCheckingPrivilege(false);
        return;
      }

      setIsCheckingPrivilege(true);
      const privilege = await checkPrivilege(userId);
      const nextRole = normalizeRepairComputerRole(privilege?.privilege);

      if (!isMounted) {
        return;
      }

      setPrivilegeRole(nextRole);
      setCachedRepairComputerPrivilege(userId, nextRole);
      setIsCheckingPrivilege(false);
    }

    loadPrivilege();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (isCheckingPrivilege) {
      return;
    }

    const routeRole = getRouteRole(pathname);

    if (!routeRole) {
      return;
    }

    if (routeRole === currentRole) {
      return;
    }

    const defaultRoute = getDefaultRoute(currentRole);

    if (pathname !== defaultRoute) {
      replaceRoute(defaultRoute);
    }
  }, [currentRole, isCheckingPrivilege, pathname, replaceRoute]);

  // Show tabs based on highest privilege only
  const visibleFor = (role: RepairComputerRole) => (currentRole === role ? undefined : null);
  const routeRole = getRouteRole(pathname);
  const isRedirectingToRole = !isCheckingPrivilege && Boolean(routeRole) && routeRole !== currentRole;

  return (
    <RepairComputerRoleProvider currentRole={currentRole}>
      <View style={styles.container}>
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
              fontFamily: AppFonts.psuRegular,
            },
          }}>
          {/* User tabs - only shown if highest role is user */}
          <Tabs.Screen
            name="(user)/inform"
            options={{
              title: TEXT.REPAIR_COMPUTER_INFORM,
              href: null,
              tabBarStyle: { display: 'none' },
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(user)/current-job"
            options={{
              title: TEXT.REPAIR_COMPUTER_CURRENT_JOB,
              href: visibleFor(PRIVILEGE_RC_USER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(user)/queue"
            options={{
              title: TEXT.REPAIR_COMPUTER_QUEUE,
              // Hidden from the informer (user) role's tab bar.
              href: null,
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(user)/history"
            options={{
              title: TEXT.SHARED_HISTORY,
              href: visibleFor(PRIVILEGE_RC_USER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="history" color={color} />,
            }}
          />

          {/* Worker tabs - only shown if highest role is worker */}
          <Tabs.Screen
            name="(worker)/worker-new-job"
            options={{
              title: TEXT.REPAIR_COMPUTER_NEW_JOB,
              href: visibleFor(PRIVILEGE_RC_TECH),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(worker)/worker-current-job"
            options={{
              title: TEXT.REPAIR_COMPUTER_CURRENT_JOB,
              href: visibleFor(PRIVILEGE_RC_TECH),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(worker)/worker-history"
            options={{
              title: TEXT.SHARED_HISTORY,
              href: visibleFor(PRIVILEGE_RC_TECH),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="history" color={color} />,
            }}
          />

          {/* Foreman tabs - only shown if highest role is foreman */}
          <Tabs.Screen
            name="(foreman)/foreman-new-job"
            options={{
              title: TEXT.REPAIR_COMPUTER_NEW_JOB,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(foreman)/manage-job"
            options={{
              title: TEXT.REPAIR_COMPUTER_MANAGE_JOB,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(foreman)/foreman-history"
            options={{
              title: TEXT.SHARED_HISTORY,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="history" color={color} />,
            }}
          />
        </Tabs>

        {isCheckingPrivilege || isRedirectingToRole ? (
          <ThemedView style={styles.loadingOverlay}>
            <LoadingAnimate
              title={isCheckingPrivilege ? TEXT.REPAIR_COMPUTER_CHECKING_PRIVILEGE : TEXT.REPAIR_COMPUTER_TITLE}
              desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
            />
          </ThemedView>
        ) : null}
      </View>
    </RepairComputerRoleProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
