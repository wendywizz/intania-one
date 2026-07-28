import { HapticTab } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';
import { TEXT } from '@/constants/text';
import {
  NOTICE_REPAIR_ROLE_APPROVE, NOTICE_REPAIR_ROLE_ADMIN, NOTICE_REPAIR_ROLE_HEADER,
  NOTICE_REPAIR_ROLE_TECHNICIAN, NOTICE_REPAIR_ROLE_INFORMER, type NoticeRepairRole,
} from '@/constants/types';
import { NoticeRepairRoleProvider } from '@/context/NoticeRepairRoleContext';
import {
  getCachedPRRoles, getCachedPRSelectedRole,
  getDefaultPRRole, getPRDefaultRoute, setCachedPRRoles,
} from '@/context/noticeRepairRoleSelection';
import { getPrivilege } from '@/services/noticeRepairService';
import { useNoticeRepairStaffId } from '@/hooks/useNoticeRepairStaffId';
import { Tabs, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { scaleFont } from '@/utils/font-scale';

function getRoleRoute(pathname: string): NoticeRepairRole | null {
  if (pathname.includes('/inform'))            return NOTICE_REPAIR_ROLE_INFORMER;
  if (pathname.includes('/informer-'))         return NOTICE_REPAIR_ROLE_INFORMER;
  if (pathname.includes('/approve-'))          return NOTICE_REPAIR_ROLE_APPROVE;
  if (pathname.includes('/admin-'))            return NOTICE_REPAIR_ROLE_ADMIN;
  if (pathname.includes('/header-'))           return NOTICE_REPAIR_ROLE_HEADER;
  if (pathname.includes('/tech-'))             return NOTICE_REPAIR_ROLE_TECHNICIAN;
  return null;
}

export default function NoticeRepairTabLayout() {
  const c = useColors();
  const pathname = usePathname();
  const staffId = useNoticeRepairStaffId();

  const cachedRoles = getCachedPRRoles(staffId) ?? [NOTICE_REPAIR_ROLE_INFORMER];
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
        if (!roles.includes(NOTICE_REPAIR_ROLE_INFORMER)) roles = [NOTICE_REPAIR_ROLE_INFORMER, ...roles];
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
        if (active) setAvailableRoles([NOTICE_REPAIR_ROLE_INFORMER]);
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

  const isRedirecting = !isChecking && Boolean(getRoleRoute(pathname)) && getRoleRoute(pathname) !== currentRole;

  return (
    <NoticeRepairRoleProvider currentRole={currentRole} availableRoles={availableRoles} staffId={staffId}>
      <View style={styles.container}>
        <Tabs screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
          tabBarStyle: { backgroundColor: c.primary, borderTopColor: c.primary, height: 68, paddingBottom: 10, paddingTop: 6 },
          tabBarLabelStyle: { fontSize: scaleFont(11), fontFamily: AppFonts.psuRegular },
        }}>
          {/* ── Informer ── */}
          {/* inform is reached via the FAB on the current-job screen, not a tab,
              and hides the bottom tab bar while open. */}
          <Tabs.Screen name="(informer)/inform"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_INFORM, href: null, tabBarStyle: { display: 'none' },
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="paperplane.fill" color={color} /> }} />
          <Tabs.Screen name="(informer)/informer-current"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_CURRENT, href: visibleFor(NOTICE_REPAIR_ROLE_INFORMER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(informer)/informer-history"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_HISTORY, href: visibleFor(NOTICE_REPAIR_ROLE_INFORMER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="history" color={color} /> }} />
          {/* ── Approver ── */}
          <Tabs.Screen name="(approver)/approve-pending"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_PENDING, href: visibleFor(NOTICE_REPAIR_ROLE_APPROVE),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(approver)/approve-all"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_ALL, href: visibleFor(NOTICE_REPAIR_ROLE_APPROVE),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet" color={color} /> }} />
          {/* ── Admin ── */}
          <Tabs.Screen name="(admin)/admin-pending-receipt"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_PENDING_RECEIPT, href: visibleFor(NOTICE_REPAIR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(admin)/admin-in-progress"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_IN_PROGRESS, href: visibleFor(NOTICE_REPAIR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(admin)/admin-supply"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_SUPPLY, href: visibleFor(NOTICE_REPAIR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="briefcase.fill" color={color} /> }} />
          <Tabs.Screen name="(admin)/admin-done"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_DONE, href: visibleFor(NOTICE_REPAIR_ROLE_ADMIN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.circle.fill" color={color} /> }} />
          {/* ── Header ── */}
          <Tabs.Screen name="(header)/header-pending"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_PENDING_RECEIPT, href: visibleFor(NOTICE_REPAIR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(header)/header-assessment"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_ASSESSMENT, href: visibleFor(NOTICE_REPAIR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} /> }} />
          <Tabs.Screen name="(header)/header-review"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_REVIEW, href: visibleFor(NOTICE_REPAIR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="doc.text.fill" color={color} /> }} />
          <Tabs.Screen name="(header)/header-repair-list"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_REPAIR_LIST, href: visibleFor(NOTICE_REPAIR_ROLE_HEADER),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          {/* ── Technician ── */}
          <Tabs.Screen name="(technician)/tech-assigned"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_ASSIGNED, href: visibleFor(NOTICE_REPAIR_ROLE_TECHNICIAN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.fill" color={color} /> }} />
          <Tabs.Screen name="(technician)/tech-in-progress"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_IN_PROGRESS, href: visibleFor(NOTICE_REPAIR_ROLE_TECHNICIAN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} /> }} />
          <Tabs.Screen name="(technician)/tech-done"
            options={{ title: TEXT.NOTICE_REPAIR_TAB_DONE, href: visibleFor(NOTICE_REPAIR_ROLE_TECHNICIAN),
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.circle.fill" color={color} /> }} />
        </Tabs>

        {(isChecking || isRedirecting) && (
          <ThemedView style={styles.overlay}>
            <LoadingAnimate title={TEXT.NOTICE_REPAIR__TITLE} desc={TEXT.NOTICE_REPAIR_LOADING_PRIVILEGE} />
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
