import { HapticTab } from '@/components/haptic-tab';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { TEXT } from '@/constants/text';
import {
  PR_ROLE_APPROVE, PR_ROLE_ADMIN, PR_ROLE_HEADER,
  PR_ROLE_TECHNICIAN, PR_ROLE_INFORMER, type PublicRepairRole,
} from '@/constants/types';
import { PublicRepairRoleProvider } from '@/context/PublicRepairRoleContext';
import {
  getAccessiblePRRoleOptions, getCachedPRRoles, getCachedPRSelectedRole,
  getDefaultPRRole, getPRDefaultRoute, publicRepairRoleOptions,
  setCachedPRRoles, setCachedPRSelectedRole,
} from '@/context/publicRepairRoleSelection';
import { getPrivilege } from '@/services/publicRepairService';
import { usePublicRepairStaffId } from '@/hooks/usePublicRepairStaffId';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

function getRoleRoute(pathname: string): PublicRepairRole | null {
  if (pathname.includes('/inform'))            return PR_ROLE_INFORMER;
  if (pathname.includes('/informer-'))         return PR_ROLE_INFORMER;
  if (pathname.includes('/approve-'))          return PR_ROLE_APPROVE;
  if (pathname.includes('/admin-'))            return PR_ROLE_ADMIN;
  if (pathname.includes('/header-'))           return PR_ROLE_HEADER;
  if (pathname.includes('/tech-'))             return PR_ROLE_TECHNICIAN;
  return null;
}

export default function PublicRepairTabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const staffId = usePublicRepairStaffId();

  const cachedRoles = getCachedPRRoles(staffId) ?? [PR_ROLE_INFORMER];
  const cachedSelected = getCachedPRSelectedRole(staffId) ?? getDefaultPRRole(cachedRoles);

  const [availableRoles, setAvailableRoles] = useState<PublicRepairRole[]>(cachedRoles);
  const [currentRole, setCurrentRole] = useState<PublicRepairRole>(cachedSelected);
  const [isChecking, setIsChecking] = useState(!getCachedPRRoles(staffId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const switchingRoleRef = useRef<PublicRepairRole | null>(null);
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
        let roles = (data.roles ?? []) as PublicRepairRole[];
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

  const handleSelectRole = (role: PublicRepairRole) => {
    setIsModalOpen(false);
    if (role === currentRole) return;
    setCachedPRSelectedRole(staffId, role);
    switchingRoleRef.current = role;
    setCurrentRole(role);
  };

  const accessibleOptions = getAccessiblePRRoleOptions(availableRoles);
  const canSwitch = accessibleOptions.length > 1;

  const visibleFor = (role: PublicRepairRole) => (currentRole === role ? undefined : null);

  const roleLabel = publicRepairRoleOptions.find((o) => o.value === currentRole)?.label ?? currentRole;

  const roleSwitcher = (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={canSwitch ? () => setIsModalOpen(true) : undefined}
        style={[styles.switchBtn, !canSwitch && styles.switchBtnStatic]}>
        <ThemedText lightColor="#fff" darkColor="#fff" type="defaultSemiBold" style={styles.switchBtnText}>
          {roleLabel}
        </ThemedText>
        {canSwitch && <ThemedText lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)" style={styles.switchBtnCaret}>▾</ThemedText>}
      </Pressable>
      {canSwitch && (
        <Modal transparent visible={isModalOpen} animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIsModalOpen(false)}>
            <Pressable>
              <ThemedView style={styles.modal} lightColor="#fff" darkColor="#151718">
                <View style={styles.modalHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.modalTitle}>{TEXT.PR_SELECT_ROLE}</ThemedText>
                  <Pressable accessibilityRole="button" onPress={() => setIsModalOpen(false)} style={styles.closeBtn}>
                    <ThemedText type="defaultSemiBold">{TEXT.CLOSE}</ThemedText>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
                  {accessibleOptions.map((opt) => {
                    const selected = currentRole === opt.value;
                    return (
                      <Pressable key={opt.value} accessibilityRole="button"
                        onPress={() => handleSelectRole(opt.value)}
                        style={[styles.option, selected && styles.optionSelected]}>
                        <ThemedText lightColor={selected ? '#fff' : undefined} darkColor={selected ? '#fff' : undefined}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );

  const tint = Colors[colorScheme ?? 'light'].tint;
  const isRedirecting = !isChecking && Boolean(getRoleRoute(pathname)) && getRoleRoute(pathname) !== currentRole;

  return (
    <PublicRepairRoleProvider currentRole={currentRole} availableRoles={availableRoles} roleSwitcher={roleSwitcher} staffId={staffId}>
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
    </PublicRepairRoleProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  switchBtn: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, backgroundColor: '#751A1D', paddingHorizontal: 12 },
  switchBtnStatic: { opacity: 0.85 },
  switchBtnText: { fontSize: 13, lineHeight: 18 },
  switchBtnCaret: { fontSize: 11, lineHeight: 18 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,28,.45)', padding: 24 },
  modal: { width: '100%', maxWidth: 420, maxHeight: 460, borderRadius: 8, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 16 },
  closeBtn: { minHeight: 40, justifyContent: 'center', borderRadius: 8, backgroundColor: '#edeef2', paddingHorizontal: 14 },
  option: { minHeight: 48, justifyContent: 'center', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e1e2e6', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12 },
  optionSelected: { borderColor: '#b33939', backgroundColor: '#b33939' },
});
