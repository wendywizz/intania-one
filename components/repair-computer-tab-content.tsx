import { StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_TECH,
  type RepairComputerRole,
} from '@/constants/types';
import { useRepairComputerRole } from '@/context/RepairComputerRoleContext';

type RepairComputerTabContentProps = {
  title: string;
  description: string;
};

function getRoleTitlePrefix(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_FOREMAN) {
    return TEXT.REPAIR_COMPUTER_FOREMAN;
  }

  if (role === PRIVILEGE_RC_TECH) {
    return TEXT.REPAIR_COMPUTER_WORKER;
  }

  return 'User';
}

export function RepairComputerTabContent({ title, description }: RepairComputerTabContentProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { currentRole } = useRepairComputerRole();
  const screenTitle = title === TEXT.REPAIR_COMPUTER_NEW_JOB ? `${getRoleTitlePrefix(currentRole)} ${title}` : title;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER_TITLE}
        subtitle={screenTitle}
        moduleIcon="laptop"
        backHref="/"
        showHomeButton={false}
      />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText style={styles.description}>{description}</ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    borderRadius: 8,
    padding: 16,
  },
  description: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
