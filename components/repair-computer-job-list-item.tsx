import { Pressable, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { RepairComputer } from '@/models/types';
import { getRepairComputerTypeIcon } from '@/utils/category-icon';
import { formatDateTime } from '@/utils/date-format';
import { getRepairStatusBadgeStyle } from '@/utils/repair-computer-status';

const titleFields = ['repairTypeName', 'repair_type_name', 'description', 'problemTypeName', 'problem_type_name', 'problemType', 'problem_type', 'name', 'title', 'issueDescription', 'issue_description'];
const repairTypeTitleFields = ['repairTypeName', 'repair_type_name', 'repairType', 'repair_type'];
const repairTypeIdFields = ['repairTypeId', 'repair_type_id'];
const supplyFields = ['supplyCode', 'supply_code', 'assetCode', 'asset_code', 'code'];
const informDateFields = ['informDateTime', 'inform_date_time', 'informDate', 'inform_date', 'createdAt', 'created_at', 'createDate', 'create_date', 'date'];
const statusLabelFields = ['statusLabel', 'status_label', 'statusName', 'status_name', 'labelStatus', 'label_status'];
const statusIdFields = ['status', 'state', 'statusId', 'status_id'];
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
  fallbackTitle?: string;
  repairTypeOnly?: boolean;
  showRepairType?: boolean;
  onDelete?: (job: RepairComputer) => void;
  onPress?: (job: RepairComputer) => void;
};

export function RepairComputerJobListItem({ job, fallbackTitle = TEXT.REPAIR_COMPUTER_PENDING_JOB_TYPE, repairTypeOnly = false, showRepairType = false, onDelete, onPress }: RepairComputerJobListItemProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const jobId = getRepairComputerJobId(job);
  const jobTitle = getRepairComputerJobText(job, repairTypeOnly ? repairTypeTitleFields : titleFields) || fallbackTitle || jobId || '-';
  const supplyCode = getRepairComputerJobText(job, supplyFields);
  const repairType = getRepairComputerJobText(job, repairTypeTitleFields);
  const repairTypeId = getRepairComputerJobText(job, repairTypeIdFields);
  // Only show the repair-type row when it adds info beyond the title (avoids the
  // duplicate "ประเภทงาน" line under a title that already is the repair type).
  const repairTypeName = showRepairType && repairType !== jobTitle ? repairType : '';
  // Prefer the stable job-type id for an accurate icon; fall back to the name.
  const categoryIcon = getRepairComputerTypeIcon(repairTypeId, repairType);
  const informDate = formatDateTime(getRepairComputerJobText(job, informDateFields));
  const statusLabel = getRepairComputerJobText(job, statusLabelFields);
  const statusId = getRepairComputerJobText(job, statusIdFields);
  const badgeStyle = getRepairStatusBadgeStyle(statusId);

  const content = (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={() => onPress?.(job)}>
      <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#151718">
        <View style={styles.itemRow}>
          {/* Leading category icon. When a repair type is defined it uses the
              branded red style; otherwise a related generic icon in grey. */}
          <View style={[styles.iconBox, repairType ? undefined : styles.iconBoxMuted]}>
            <IconSymbol name={categoryIcon} size={22} color={repairType ? '#922124' : '#9CA3AF'} />
          </View>

          <View style={styles.itemBody}>
            <View style={styles.itemHeader}>
              <ThemedText type="defaultSemiBold" style={styles.itemTitle} numberOfLines={2}>
                {jobTitle}
              </ThemedText>
              {statusLabel ? (
                <View style={[styles.statusBadge, { backgroundColor: badgeStyle.background }]}>
                  <ThemedText style={[styles.statusText, { color: badgeStyle.text }]}>
                    {statusLabel}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {supplyCode ? (
              <View style={styles.codeRow}>
                <ThemedText style={styles.codeLabel}>
                  {TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL}{' '}
                </ThemedText>
                <ThemedText style={styles.codeValue}>{supplyCode}</ThemedText>
              </View>
            ) : null}

            {repairTypeName ? (
              <View style={styles.codeRow}>
                <ThemedText style={styles.codeLabel}>
                  {TEXT.REPAIR_COMPUTER_REPAIR_TYPE_LABEL}{' '}
                </ThemedText>
                <ThemedText style={styles.repairTypeValue}>{repairTypeName}</ThemedText>
              </View>
            ) : null}

            {informDate ? (
              <View style={styles.dateRow}>
                <IconSymbol name="calendar" size={13} color={c.textMuted} />
                <ThemedText style={styles.itemMeta}>{informDate}</ThemedText>
              </View>
            ) : null}
          </View>

          {/* Navigable indicator */}
          {onPress ? (
            <IconSymbol name="chevron.right" size={18} color={c.textFaint} style={styles.chevron} />
          ) : null}
        </View>
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

const makeStyles = (c: AppColors) => StyleSheet.create({
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 16,
    gap: 8,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
  },
  iconBoxMuted: {
    backgroundColor: c.border,
  },
  itemBody: {
    flex: 1,
    gap: 8,
  },
  chevron: {
    alignSelf: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
    marginTop: 1,
  },
  statusText: {
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
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  codeValue: {
    color: c.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  repairTypeValue: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemMeta: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  deleteAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: c.primary,
    marginLeft: 8,
  },
});
