import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { NOTICE_REPAIR_ROLE_INFORMER, type NoticeRepairRole } from '@/constants/types';
import { useNoticeRepairStaffId } from '@/hooks/useNoticeRepairStaffId';
import {
  getCachedPRRoles, getCachedPRSelectedRole,
  getDefaultPRRole, getPRDefaultRoute, setCachedPRRoles,
} from '@/context/noticeRepairRoleSelection';
import { getPrivilege } from '@/services/noticeRepairService';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export default function NoticeRepairIndexScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const staffId = useNoticeRepairStaffId();
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      let roles = getCachedPRRoles(staffId);

      if (!roles) {
        try {
          const data = await getPrivilege(staffId);
          roles = (data.roles ?? []) as NoticeRepairRole[];
          // Grant the baseline informer role only to users who already hold a
          // role in this app; users with no role are denied access below.
          if (roles.length > 0 && !roles.includes(NOTICE_REPAIR_ROLE_INFORMER)) {
            roles = [NOTICE_REPAIR_ROLE_INFORMER, ...roles];
          }
          console.log('[PR] privilege roles for', staffId, '→', roles);
          // Cache the result (including an empty list — a definitive "no role"
          // answer) so we don't re-query on every visit.
          setCachedPRRoles(staffId, roles);
        } catch (e) {
          console.warn('[PR] privilege check failed for', staffId, e instanceof Error ? e.message : e);
          // Could not determine any role (no privilege / upstream error) → deny
          // access. No informer fallback. Don't cache so the next visit retries.
          roles = [];
        }
      }

      if (!active) return;

      // No role in this app → block access and show a message instead of routing.
      if (!roles.length) {
        setNoAccess(true);
        return;
      }

      const selected = getCachedPRSelectedRole(staffId);
      const role = selected ?? getDefaultPRRole(roles);
      router.replace(getPRDefaultRoute(role) as Parameters<typeof router.replace>[0]);
    }

    init();
    return () => { active = false; };
  }, [staffId]);

  if (noAccess) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={TEXT.NOTICE_REPAIR__TITLE} backHref="/" titleInNavBar showHomeButton={false} />
        <View style={styles.center}>
          <ThemedText style={styles.noAccessTitle}>{TEXT.NOTICE_REPAIR_NO_ACCESS_TITLE}</ThemedText>
          <ThemedText style={styles.noAccessMessage}>{TEXT.NOTICE_REPAIR_NO_ACCESS_MESSAGE}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <LoadingAnimate title={TEXT.NOTICE_REPAIR__TITLE} desc={TEXT.NOTICE_REPAIR_LOADING_PRIVILEGE} />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  noAccessTitle: { fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' },
  noAccessMessage: { fontSize: 14, color: c.textMuted, lineHeight: 22, textAlign: 'center' },
});
