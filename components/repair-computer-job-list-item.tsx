import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { RepairComputer } from '@/models/types';
import { formatDateTime } from '@/utils/date-format';

const titleFields = ['repairTypeName', 'repair_type_name', 'description', 'problemTypeName', 'problem_type_name', 'problemType', 'problem_type', 'name', 'title', 'issueDescription', 'issue_description'];
const supplyFields = ['supplyCode', 'supply_code', 'assetCode', 'asset_code', 'code'];
const informDateFields = ['informDateTime', 'inform_date_time', 'informDate', 'inform_date', 'createdAt', 'created_at', 'createDate', 'create_date', 'date'];
const statusLabelFields = ['statusLabel', 'status_label', 'statusName', 'status_name', 'labelStatus', 'label_status'];
const jobIdFields = ['jobId', 'job_id', 'informId', 'inform_id', 'informID', 'id'];

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
  return getRepairComputerJobText(job, jobIdFields);
}

type RepairComputerJobListItemProps = {
  job: RepairComputer;
  onDelete?: (job: RepairComputer) => void;
  onPress?: (job: RepairComputer) => void;
};

export function RepairComputerJobListItem({ job, onDelete, onPress }: RepairComputerJobListItemProps) {
  const jobId = getRepairComputerJobId(job);
  const jobTitle = getRepairComputerJobText(job, titleFields) || jobId || '-';
  const supplyCode = getRepairComputerJobText(job, supplyFields);
  const informDate = formatDateTime(getRepairComputerJobText(job, informDateFields));
  const statusLabel = getRepairComputerJobText(job, statusLabelFields);

  const content = (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={() => onPress?.(job)}>
      <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#151718">
        <View style={styles.itemHeader}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle} numberOfLines={2}>
            {jobTitle}
          </ThemedText>
          <View style={styles.itemRight}>
            {statusLabel ? (
              <View style={styles.statusBadge}>
                <ThemedText style={styles.statusText}>{statusLabel}</ThemedText>
              </View>
            ) : null}
            {onPress ? (
              <IconSymbol name="chevron.right" size={14} color="#9EA3A8" />
            ) : null}
          </View>
        </View>

        {supplyCode ? (
          <View style={styles.codeRow}>
            <ThemedText style={styles.codeLabel}>
              {TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL}{' '}
            </ThemedText>
            <ThemedText style={styles.codeValue}>{supplyCode}</ThemedText>
          </View>
        ) : null}

        {informDate ? (
          <View style={styles.dateRow}>
            <IconSymbol name="calendar" size={13} color="#687076" />
            <ThemedText style={styles.itemMeta}>{informDate}</ThemedText>
          </View>
        ) : null}
      </ThemedView>
    </Pressable>
  );

  if (!onDelete) {
    return content;
  }

  const renderRightActions = () => (
    <Pressable accessibilityRole="button" onPress={() => onDelete(job)} style={styles.deleteAction}>
      <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
        {TEXT.DELETE}
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
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  statusBadge: {
    borderRadius: 20,
    backgroundColor: '#EEEEF4',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    color: '#555568',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  codeLabel: {
    color: '#687076',
    fontSize: 13,
    lineHeight: 18,
  },
  codeValue: {
    color: '#b33939',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemMeta: {
    color: '#687076',
    fontSize: 13,
    lineHeight: 18,
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
