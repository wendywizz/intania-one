import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { type AppColors, useColors, useThemedStyles } from "@/constants/theme";
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_HAJJ,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from "@/constants/types";
import type { absence } from "@/models/types";
import { formatDateRange } from "@/utils/date-format";

const absenceTypeLabels: Record<string, string> = {
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeFields = ['absentType', 'absenceType', 'typeAbsence', 'ABSENCE_type', 'typeabsence', 'type_absence', 'leaveType', 'leave_type', 'type'];
const absenceTypeNameFields = ['absentTypeName', 'absenceTypeName', 'ABSENCE_type_name', 'typeName', 'type_name', 'leaveTypeName', 'leave_type_name'];
const startDateFields = ['startDate', 'start_date', 'dateStart', 'date_start'];
const endDateFields = ['endDate', 'end_date', 'dateEnd', 'date_end'];

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export function getAbsenceId(item: absence) {
  return getText(item, ['id', 'absenceId', 'ABSENCE_id', 'requestId', 'request_id']);
}

export function getAbsenceType(item: absence) {
  return getText(item, absenceTypeFields);
}

export function getRequesterName(item: absence) {
  return getText(item, ['name', 'staffName', 'staff_name', 'fullname', 'fullName']);
}

function getAbsenceTypeLabel(item: absence) {
  const typeName = getText(item, absenceTypeNameFields);
  const type = getAbsenceType(item);
  return typeName || absenceTypeLabels[type] || (type ? `Absence type ${type}` : 'Absence');
}

function getDateRange(item: absence) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  return formatDateRange(startDate, endDate);
}

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child' | 'doc.text.fill';

function getTypeIcon(type: string): IconName {
  switch (type) {
    case TYPE_ABSENCE_SICK: return 'cross.fill';
    case TYPE_ABSENCE_BUSINESS: return 'briefcase.fill';
    case TYPE_ABSENCE_RELAX: return 'sun.max.fill';
    case TYPE_ABSENCE_BIRTH: return 'figure.child';
    default: return 'doc.text.fill';
  }
}

export type LeaveBadge = { text: string; bg: string; color: string };

export const PENDING_BADGE: LeaveBadge = { text: TEXT.ABSENCE_PENDING_BADGE, bg: '#E1E2E6', color: '#584140' };
export const APPROVED_BADGE: LeaveBadge = { text: TEXT.ABSENCE_APPROVE_STATUS_APPROVED, bg: '#DCFCE7', color: '#166534' };
export const REJECTED_BADGE: LeaveBadge = { text: TEXT.ABSENCE_APPROVE_STATUS_REJECTED, bg: '#FEE2E2', color: '#991B1B' };

export function statusBadge(status: string): LeaveBadge {
  return String(status) === '2' ? REJECTED_BADGE : APPROVED_BADGE;
}

type LeaveCardProps = {
  item: absence;
  name?: string;
  badge?: LeaveBadge | null;
  onPress?: (item: absence) => void;
};

// Shared leave card used across the pending, approval and history lists so they
// render identically: type icon, optional requester name, leave type, date
// range and an optional status/pending badge.
export function LeaveCard({ item, name, badge, onPress }: LeaveCardProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const type = getAbsenceType(item);
  const typeLabel = getText(item, ['approveName']) || getAbsenceTypeLabel(item);
  const dateRange = getDateRange(item);
  const icon = getTypeIcon(type);

  const body = (
    <View style={styles.itemRow}>
      <View style={styles.itemIconCircle}>
        <IconSymbol name={icon} size={20} color={c.primary} />
      </View>
      <View style={styles.itemBody}>
        {name ? (
          <ThemedText style={styles.itemRequester} numberOfLines={1}>
            {name}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.itemTitle}>{typeLabel}</ThemedText>
        {dateRange ? <ThemedText style={styles.itemDate}>{dateRange}</ThemedText> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <ThemedText style={[styles.badgeText, { color: badge.color }]}>{badge.text}</ThemedText>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={styles.itemCard}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.itemCard}>{body}</View>;
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  itemRequester: {
    fontSize: 13,
    lineHeight: 17,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  itemDate: {
    fontSize: 13,
    lineHeight: 17,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
  },
});
