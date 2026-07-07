import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_TECH,
  REPAIR_COMPUTER_DEFAULT_ROLE,
  type RepairComputerRole,
} from '@/constants/types';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import {
  getCachedRepairComputerPrivilege,
  setCachedRepairComputerPrivilege,
} from '@/context/repairComputerRoleSelection';
import { checkPrivilege } from '@/services/repairComputerService';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

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

export default function RepairComputerIndexScreen() {
  const { user: authUser } = useAuth();
  const userId = authUser?.staffId || USER_ID;

  useEffect(() => {
    let isMounted = true;

    async function init() {
      let role = getCachedRepairComputerPrivilege(userId);

      if (!role) {
        const privilege = await checkPrivilege(userId);
        role = normalizeRepairComputerRole(privilege?.privilege);
        setCachedRepairComputerPrivilege(userId, role);
      }

      if (isMounted) {
        router.replace(getDefaultRoute(role) as Parameters<typeof router.replace>[0]);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <ThemedView style={styles.container}>
      <LoadingAnimate
        title={TEXT.REPAIR_COMPUTER_TITLE}
        desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
