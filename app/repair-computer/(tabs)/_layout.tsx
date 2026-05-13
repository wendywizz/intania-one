import { Tabs, router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { HapticTab } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_USER,
  PRIVILEGE_RC_WORKER,
  REPAIR_COMPUTER_DEFAULT_ROLE,
  type RepairComputerRole,
} from '@/constants/type-repair-computer';
import { Colors } from '@/constants/theme';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { RepairComputerRoleProvider } from '@/context/RepairComputerRoleContext';
import {
  canAccessRepairComputerRole,
  getAccessibleRepairComputerRoleOptions,
  getRepairComputerSelectedRole,
  repairComputerRoleOptions,
  setRepairComputerSelectedRole,
} from '@/context/repairComputerRoleSelection';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkPrivilege } from '@/services/repairComputerService';

const privilegeRoleCache = new Map<string, RepairComputerRole>();

function normalizeRepairComputerRole(privilege?: string): RepairComputerRole {
  if (privilege === PRIVILEGE_RC_WORKER || privilege === PRIVILEGE_RC_FOREMAN) {
    return privilege;
  }

  return REPAIR_COMPUTER_DEFAULT_ROLE;
}

function getDefaultRoute(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_WORKER) {
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
    return PRIVILEGE_RC_WORKER;
  }

  if (
    pathname === '/repair-computer/foreman-new-job' ||
    pathname === '/repair-computer/manage-job' ||
    pathname === '/repair-computer/approvement' ||
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

function getRoleLabel(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_WORKER) {
    return 'Worker';
  }

  if (role === PRIVILEGE_RC_FOREMAN) {
    return 'Foreman';
  }

  return 'User';
}

function getCurrentRoleFromCache(userId: string, privilegeRole: RepairComputerRole) {
  return getRepairComputerSelectedRole(userId, privilegeRole);
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
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const userId = authUser?.staffId || USER_ID;
  const cachedPrivilegeRole = privilegeRoleCache.get(userId) ?? REPAIR_COMPUTER_DEFAULT_ROLE;
  const cachedCurrentRole = getCurrentRoleFromCache(userId, cachedPrivilegeRole);
  const [privilegeRole, setPrivilegeRole] = useState<RepairComputerRole>(cachedPrivilegeRole);
  const [currentRole, setCurrentRole] = useState<RepairComputerRole>(cachedCurrentRole);
  const [isCheckingPrivilege, setIsCheckingPrivilege] = useState(!privilegeRoleCache.has(userId));
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const lastRedirectRef = useRef('');
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchingRoleRef = useRef<RepairComputerRole | null>(null);

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
      const cachedUserRole = privilegeRoleCache.get(userId);

      if (cachedUserRole) {
        const cachedCurrentUserRole = getCurrentRoleFromCache(userId, cachedUserRole);
        setPrivilegeRole(cachedUserRole);
        if (!switchingRoleRef.current) {
          setCurrentRole(cachedCurrentUserRole);
        }
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
      privilegeRoleCache.set(userId, nextRole);
      const nextCurrentRole = getCurrentRoleFromCache(userId, nextRole);
      if (!switchingRoleRef.current) {
        setCurrentRole(nextCurrentRole);
      }
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
    const switchingRole = switchingRoleRef.current;

    if (switchingRole) {
      const switchingRoute = getDefaultRoute(switchingRole);

      if (pathname === switchingRoute) {
        switchingRoleRef.current = null;
        return;
      }

      replaceRoute(switchingRoute);
      return;
    }

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

  const accessibleRoleOptions = getAccessibleRepairComputerRoleOptions(privilegeRole);
  const visibleFor = (role: RepairComputerRole) => (currentRole === role ? undefined : null);
  const canSwitchRole = accessibleRoleOptions.length > 1;
  const routeRole = getRouteRole(pathname);
  const isRedirectingToRole = !isCheckingPrivilege && Boolean(routeRole) && routeRole !== currentRole;

  const handleSwitchRole = () => {
    if (!canSwitchRole) {
      return;
    }

    blurActiveWebElement();
    setIsRoleModalOpen(true);
  };

  const handleCloseRoleModal = () => {
    blurActiveWebElement();
    setIsRoleModalOpen(false);
  };

  const handleSelectRole = (role: RepairComputerRole) => {
    blurActiveWebElement();
    setIsRoleModalOpen(false);

    const canAccessRole = canAccessRepairComputerRole(privilegeRole, role);

    if (!canSwitchRole || !canAccessRole || currentRole === role) {
      return;
    }

    setRepairComputerSelectedRole(userId, role);
    switchingRoleRef.current = role;
    setCurrentRole(role);
    const nextRoute = getDefaultRoute(role);
    replaceRoute(nextRoute);
  };

  const roleSwitcher = canSwitchRole ? (
    <>
      <Pressable accessibilityRole="button" onPress={handleSwitchRole} style={styles.switchButton}>
        <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.switchButtonText}>
          {getRoleLabel(currentRole)}
        </ThemedText>
      </Pressable>

      <Modal transparent visible={isRoleModalOpen} animationType="fade" onRequestClose={handleCloseRoleModal}>
        <Pressable style={styles.backdrop} onPress={handleCloseRoleModal}>
          <Pressable>
            <ThemedView style={styles.selectModal} lightColor="#FFFFFF" darkColor="#151718">
              <View style={styles.selectModalHeader}>
                <ThemedText type="defaultSemiBold" style={styles.selectModalTitle}>
                  {TEXT.SELECT_ROLE}</ThemedText>
                <Pressable accessibilityRole="button" onPress={handleCloseRoleModal} style={styles.closeButton}>
                  <ThemedText type="defaultSemiBold">{TEXT.CLOSE}</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.optionScroll} contentContainerStyle={styles.optionScrollContent}>
                {repairComputerRoleOptions
                  .filter((option) => accessibleRoleOptions.some((accessibleOption) => accessibleOption.value === option.value))
                  .map((option) => {
                  const isSelected = currentRole === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      onPress={() => handleSelectRole(option.value)}
                      style={[styles.option, isSelected ? styles.selectedOption : undefined]}>
                      <ThemedText
                        lightColor={isSelected ? '#FFFFFF' : undefined}
                        darkColor={isSelected ? '#FFFFFF' : undefined}
                        style={styles.optionText}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  ) : undefined;
  const informAction =
    currentRole === PRIVILEGE_RC_USER && pathname === '/repair-computer/current-job' ? (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/repair-computer/inform' as Parameters<typeof router.push>[0])}
        style={styles.switchButton}>
        <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.switchButtonText}>
          {TEXT.INFORM}</ThemedText>
      </Pressable>
    ) : undefined;
  const topRightAction =
    roleSwitcher && informAction ? (
      <View style={styles.actionGroup}>
        {informAction}
        {roleSwitcher}
      </View>
    ) : (
      roleSwitcher ?? informAction
    );

  return (
    <RepairComputerRoleProvider currentRole={currentRole} roleSwitcher={topRightAction}>
      {isCheckingPrivilege || isRedirectingToRole ? (
        <ThemedView style={styles.container}>
          <LoadingAnimate
            title={isCheckingPrivilege ? TEXT.CHECKING_PRIVILEGE : TEXT.REPAIR_COMPUTER}
            desc={TEXT.PLEASE_WAIT_A_MOMENT}
          />
        </ThemedView>
      ) : (
        <Tabs
          key={currentRole}
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
          }}>
          <Tabs.Screen
            name="(user)/inform"
            options={{
              title: TEXT.INFORM,
              href: null,
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(user)/current-job"
            options={{
              title: TEXT.CURRENT_JOB,
              href: visibleFor(PRIVILEGE_RC_USER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(user)/queue"
            options={{
              title: TEXT.QUEUE,
              href: visibleFor(PRIVILEGE_RC_USER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(user)/history"
            options={{
              title: TEXT.HISTORY,
              href: visibleFor(PRIVILEGE_RC_USER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
            }}
          />

          <Tabs.Screen
            name="(worker)/worker-new-job"
            options={{
              title: TEXT.NEW_JOB,
              href: visibleFor(PRIVILEGE_RC_WORKER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(worker)/worker-current-job"
            options={{
              title: TEXT.CURRENT_JOB,
              href: visibleFor(PRIVILEGE_RC_WORKER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(worker)/worker-history"
            options={{
              title: TEXT.HISTORY,
              href: visibleFor(PRIVILEGE_RC_WORKER),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
            }}
          />

          <Tabs.Screen
            name="(foreman)/foreman-new-job"
            options={{
              title: TEXT.NEW_JOB,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(foreman)/manage-job"
            options={{
              title: TEXT.MANAGE_JOB,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(foreman)/approvement"
            options={{
              title: TEXT.APPROVEMENT,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="checkmark.circle.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="(foreman)/foreman-history"
            options={{
              title: TEXT.HISTORY,
              href: visibleFor(PRIVILEGE_RC_FOREMAN),
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
            }}
          />
        </Tabs>
      )}
    </RepairComputerRoleProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  switchButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#0A6E8A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  switchButtonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  selectModal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: 460,
    borderRadius: 8,
    padding: 16,
  },
  selectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  selectModalTitle: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E4F0F6',
    paddingHorizontal: 14,
  },
  optionScroll: {
    maxHeight: 360,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: {
    borderColor: '#0A6E8A',
    backgroundColor: '#0A6E8A',
  },
  optionText: {
    lineHeight: 20,
  },
});
