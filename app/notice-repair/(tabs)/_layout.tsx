import { HapticTab } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { TEXT } from '@/constants/text';
import {
  PR_ROLE_APPROVE, PR_ROLE_ADMIN, PR_ROLE_HEADER,
  PR_ROLE_TECHNICIAN, PR_ROLE_INFORMER, type NoticeRepairRole,
} from '@/constants/types';
import { NoticeRepairRoleProvider } from '@/context/NoticeRepairRoleContext';
import {
  getCachedPRRoles, getCachedPRSelectedRole,
  getDefaultPRRole, getPRDefaultRoute, setCachedPRRoles,
} from '@/context/noticeRepairRoleSelection';
import { getPrivilege } from '@/services/noticeRepairService';
import { useNoticeRepairStaffId } from '@/hooks/useNoticeRepairStaffId';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

function getRoleRoute(pathname: string): NoticeRepairRole | null {
  if (pathname.includes('/inform'))            return PR_ROLE_INFORMER;
  if (pathname.includes('/informer-'))         return PR_ROLE_INFORMER;
  if (pathname.includes('/approve-'))          return PR_ROLE_APPROVE;
  if (pathname.includes('/admin-'))            return PR_ROLE_ADMIN;
  if (pathname.includes('/header-'))           return PR_ROLE_HEADER;
  if (pathname.includes('/tech-'))             return PR_ROLE_TECHNICIAN;
  return null;
}

export default function NoticeRepairTabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const staffId = useNoticeRepairStaffId();

  const cachedRoles = getCachedPRRoles(staffId) ?? [PR_ROLE_INFORMER];
  const cachedSelected = getCachedPRSelectedRole(staffId) ?? getDefaultPRRole(cachedRoles);

  const [availableRoles, setAvailableRoles] = useState<NoticeRepairRole[]>(cachedRoles);
  const [currentRole, setCurrentRole] = useState<NoticeRepairRole>(cachedSelected);
  const [isChecking, setIsChecking] = useState(!getCachedPRRoles(staffId));
  const switchingRoleRef = useRef<NoticeRepairRole | null>(null);
  const lastRedirectRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceRoute = useCallback((route: string) => {
    if (pathname === route || lastRedirectRef.current === route) return;
    lastRedirectRef.current = route;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      router.replace(route as Parameters<typeof router.replace>[0]);
    }, 0);
  }, [pathname]);

  useEffect(() => { lastRedirectRef.current = ''; }, [pathname]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const cached = getCachedPRRoles(staffId);
      if (cached) {
        setAvailableRoles(cached);
        if (!switchingRoleRef.current) setCurrentRole(getCachedPRSelectedRole(staffId) ?? getDefaultPRRole(cached));
        setIsChecking(false);
        return;
      }
      setIsChecking(true);
      try {
        const data = await getPrivilege(staffId);
        let roles = (data.roles ?? []) as NoticeRepairRole[];
        if (!roles.includes(PR_ROLE_INFORMER)) roles = [PR_ROLE_INFORMER, ...roles];
        setCachedPRRoles(staffId, roles);
        if (!active) return;
        setAvailableRoles(roles);
        if (!switchingRoleRef.current) {
          const sel = getCachedPRSelectedRole(staffId) ?? getDefaultPRRole(roles);
          setCurrentRole(sel);
        }
      } catch (e) {
        console.warn('[PR] privilege fetch failed for', staffId, e instanceof Error ? e.message : e);
        // do NOT cache the failure — next mount/focus will retry
        if (active) setAvailableRoles([PR_ROLE_INFORMER]);
      } finally {
        if (active) setIsChecking(false);
      }
    }
    load();
    return () => { active = false; };
  }, [staffId]);

  useEffect(() => {
    if (isChecking) return;
    const switching = switchingRoleRef.current;
    if (switching) {
      const target = getPRDefaultRoute(switching);
      if (pathname === target) { switchingRoleRef.current = null; return; }
      replaceRoute(target);
      return;
    }
    const routeRole = getRoleRoute(pathname);
    if (!routeRole || routeRole === currentRole) return;
    replaceRoute(getPRDefaultRoute(currentRole));
  }, [currentRole, isChecking, pathname, replaceRoute]);

  const visibleFor = (role: NoticeRepairRole) => (currentRole === role ? undefined : null);

  const tint = Colors[colorScheme ?? 'light'].tint;
  const isRedirecting = !isChecking && Boolean(getRoleRoute(pathname)) && getRoleRoute(pathname) !== currentRole;

  return (
    <NoticeRepairRoleProvider currentRole={currentRole} availableRoles={availableRoles} staffId={staffId}>
      <View style={styles.container}>
        <Tabs screenOptions={{
          tabBarActiveTintColor: tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: { height: 68, paddingBottom: 10, paddingTop: 6 },
          tabBarLabelStyle: { fontSize: 11 },
        }}>
          {/* ── Informer ── */}
          <Tabs.Screen name="(informer)/inform"
            options={{ title: TEXT.PR_TAB_INFORM, href: visibleFor(PR_ROLE_INFORMER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="paperplane.fill" color={color} /> }} />
          <Tabs.Screen name="(informer)/informer-current"
            options={{ title: TEXT.PR_TAB_CURRENT, href: visibleFor(PR_ROLE_INFORMER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(informer)/informer-history"
            options={{ title: TEXT.PR_TAB_HISTORY, href: visibleFor(PR_ROLE_INFORMER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="history" color={color} /> }} />
          {/* ── Approver ── */}
          <Tabs.Screen name="(approver)/approve-pending"
            options={{ title: TEXT.PR_TAB_PENDING, href: visibleFor(PR_ROLE_APPROVE),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(approver)/approve-all"
            options={{ title: TEXT.PR_TAB_ALL, href: visibleFor(PR_ROLE_APPROVE),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet" color={color} /> }} />
          {/* ── Admin ── */}
          <Tabs.Screen name="(admin)/admin-approved"
            options={{ title: TEXT.PR_TAB_APPROVED, href: visibleFor(PR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(admin)/admin-in-progress"
            options={{ title: TEXT.PR_TAB_IN_PROGRESS, href: visibleFor(PR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(admin)/admin-done"
            options={{ title: TEXT.PR_TAB_DONE, href: visibleFor(PR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.circle.fill" color={color} /> }} />
          {/* ── Header ── */}
          <Tabs.Screen name="(header)/header-pending"
            options={{ title: TEXT.PR_TAB_PENDING, href: visibleFor(PR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(header)/header-in-progress"
            options={{ title: TEXT.PR_TAB_IN_PROGRESS, href: visibleFor(PR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(header)/header-done"
            options={{ title: TEXT.PR_TAB_DONE, href: visibleFor(PR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.circle.fill" color={color} /> }} />
          {/* ── Technician ── */}
          <Tabs.Screen name="(technician)/tech-assigned"
            options={{ title: TEXT.PR_TAB_ASSIGNED, href: visibleFor(PR_ROLE_TECHNICIAN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(technician)/tech-in-progress"
            options={{ title: TEXT.PR_TAB_IN_PROGRESS, href: visibleFor(PR_ROLE_TECHNICIAN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(technician)/tech-done"
            options={{ title: TEXT.PR_TAB_DONE, href: visibleFor(PR_ROLE_TECHNICIAN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.circle.fill" color={color} /> }} />
        </Tabs>

        {(isChecking || isRedirecting) && (
          <ThemedView style={styles.overlay}>
            <LoadingAnimate title={TEXT.PUBLIC_REPAIR_TITLE} desc={TEXT.PR_LOADING_PRIVILEGE} />
          </ThemedView>
        )}
      </View>
    </NoticeRepairRoleProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
});
