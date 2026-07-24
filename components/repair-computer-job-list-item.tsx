import { Pressable, StyleSheet } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
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
    <ListCard
      onPress={onPress ? () => onPress(job) : undefined}
      icon={<IconSymbol name={categoryIcon} size={22} color={c.text} />}
      iconBackground={c.surfaceMuted}
      title={jobTitle}
      badge={statusLabel ? { text: statusLabel, bg: badgeStyle.background, color: badgeStyle.text } : null}
      meta={[
        { icon: <IconSymbol name="tag.fill" size={13} color={c.textMuted} />, text: supplyCode },
        { label: TEXT.REPAIR_COMPUTER_REPAIR_TYPE_LABEL, text: repairTypeName },
        { icon: <IconSymbol name="calendar" size={13} color={c.textMuted} />, text: informDate },
      ]}
    />
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
  deleteAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: c.primary,
    marginLeft: 8,
  },
});
