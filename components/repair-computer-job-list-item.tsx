import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { RepairComputer } from '@/models/types';

const supplyFields = ['supplyCode', 'supply_code', 'assetCode', 'asset_code', 'code'];
const informDateFields = ['informDateTime', 'inform_date_time', 'informDate', 'inform_date', 'createdAt', 'created_at', 'createDate', 'create_date', 'date'];
const statusLabelFields = ['statusLabel', 'status_label', 'statusName', 'status_name', 'labelStatus', 'label_status'];
const statusFields = ['status', 'state'];

export function getRepairComputerJobText(job: RepairComputer, fields: string[]) {
  for (const field of fields) {
    const value = job[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

export function getRepairComputerJobId(job: RepairComputer) {
  return getRepairComputerJobText(job, ['id', 'jobId', 'job_id', 'informId', 'inform_id']);
}

type RepairComputerJobListItemProps = {
  job: RepairComputer;
  onDelete?: (job: RepairComputer) => void;
  onPress?: (job: RepairComputer) => void;
};

export function RepairComputerJobListItem({ job, onDelete, onPress }: RepairComputerJobListItemProps) {
  const jobId = getRepairComputerJobId(job);
  const supplyCode = getRepairComputerJobText(job, supplyFields);
  const informDate = getRepairComputerJobText(job, informDateFields);
  const statusLabel = getRepairComputerJobText(job, statusLabelFields) || getRepairComputerJobText(job, statusFields);
  const content = (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={() => onPress?.(job)}>
      <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#151718">
        <View style={styles.itemHeader}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            Job ID: {jobId || '-'}
          </ThemedText>
          {statusLabel ? <ThemedText style={styles.statusText}>{statusLabel}</ThemedText> : null}
        </View>

        {supplyCode ? <ThemedText style={styles.itemMeta}>Supply Code: {supplyCode}</ThemedText> : null}
        {informDate ? <ThemedText style={styles.itemMeta}>Inform Date: {informDate}</ThemedText> : null}
      </ThemedView>
    </Pressable>
  );

  if (!onDelete) {
    return content;
  }

  const renderRightActions = () => (
    <Pressable accessibilityRole="button" onPress={() => onDelete(job)} style={styles.deleteAction}>
      <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
        Delete
      </ThemedText>
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      {content}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  statusText: {
    color: '#0A6E8A',
    fontSize: 13,
    lineHeight: 18,
  },
  itemMeta: {
    color: '#687076',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  deleteAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#C44D58',
    marginLeft: 8,
  },
});
