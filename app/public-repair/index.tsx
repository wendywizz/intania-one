import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { PR_ROLE_INFORMER, type PublicRepairRole } from '@/constants/types';
import { usePublicRepairStaffId } from '@/hooks/usePublicRepairStaffId';
import {
  getCachedPRRoles, getCachedPRSelectedRole,
  getDefaultPRRole, getPRDefaultRoute, setCachedPRRoles,
} from '@/context/publicRepairRoleSelection';
import { getPrivilege } from '@/services/publicRepairService';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

export default function PublicRepairIndexScreen() {
  const staffId = usePublicRepairStaffId();

  useEffect(() => {
    let active = true;

    async function init() {
      let roles = getCachedPRRoles(staffId);

      if (!roles) {
        try {
          const data = await getPrivilege(staffId);
          roles = (data.roles ?? []) as PublicRepairRole[];
          if (!roles.includes(PR_ROLE_INFORMER)) roles = [PR_ROLE_INFORMER, ...roles];
          console.log('[PR] privilege roles for', staffId, '→', roles);
          setCachedPRRoles(staffId, roles);
        } catch (e) {
          console.warn('[PR] privilege fetch failed for', staffId, e instanceof Error ? e.message : e);
          roles = [PR_ROLE_INFORMER];
          // do NOT cache the failure — let the next visit retry the API
        }
      }

      if (!active) return;

      const selected = getCachedPRSelectedRole(staffId);
      const role = selected ?? getDefaultPRRole(roles);
      router.replace(getPRDefaultRoute(role) as Parameters<typeof router.replace>[0]);
    }

    init();
    return () => { active = false; };
  }, [staffId]);

  return (
    <ThemedView style={styles.container}>
      <LoadingAnimate title={TEXT.PUBLIC_REPAIR_TITLE} desc={TEXT.PR_LOADING_PRIVILEGE} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
