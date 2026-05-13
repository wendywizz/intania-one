import { StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_WORKER,
  type RepairComputerRole,
} from '@/constants/type-repair-computer';
import { useRepairComputerRole } from '@/context/RepairComputerRoleContext';

type RepairComputerTabContentProps = {
  title: string;
  description: string;
};

function getRoleTitlePrefix(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_FOREMAN) {
    return TEXT.FOREMAN;
  }

  if (role === PRIVILEGE_RC_WORKER) {
    return TEXT.WORKER;
  }

  return 'User';
}

export function RepairComputerTabContent({ title, description }: RepairComputerTabContentProps) {
  const { currentRole, roleSwitcher } = useRepairComputerRole();
  const screenTitle = title === TEXT.NEW_JOB ? `${getRoleTitlePrefix(currentRole)} ${title}` : title;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.REPAIR_COMPUTER} backHref="/" rightContent={roleSwitcher} />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">{screenTitle}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  panel: {
    borderRadius: 8,
    padding: 20,
  },
  description: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
});
