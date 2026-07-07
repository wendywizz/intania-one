import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_HAJJ,
  TYPE_ABSENCE_HELPMATE,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from '@/constants/types';
import type { absence } from '@/models/types';
import { getabsenceData } from '@/services/absenceService';
import { formatFullDate } from '@/utils/date-format';
import { getStaffDisplayLabel } from '@/utils/staff-label';

const absenceTypeLabels: Record<string, string> = {
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HELPMATE]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeFields = [
  'absentType',
  'absenceType',
  'ABSENCE_type',
  'typeabsence',
  'type_absence',
  'leaveType',
  'leave_type',
  'type',
];
const absenceTypeNameFields = [
  'absentTypeName',
  'absenceTypeName',
  'ABSENCE_type_name',
  'typeName',
  'type_name',
  'leaveTypeName',
  'leave_type_name',
];

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getabsenceType(item: absence, routeType: string) {
  return routeType || getText(item, absenceTypeFields);
}

function getabsenceTypeLabel(item: absence, routeType: string) {
  const typeName = getText(item, absenceTypeNameFields);
  const type = getabsenceType(item, routeType);
  return typeName || absenceTypeLabels[type] || (type ? `absence type ${type}` : 'absence');
}

function parseItem(value: string | string[] | undefined): absence {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return {};
  try {
    return JSON.parse(decodeURIComponent(rawValue)) as absence;
  } catch {
    return {};
  }
}

function getHalfDayLabel(value: string) {
  switch (value) {
    case '1': return TEXT.ABSENCE_HALF_DAY_FIRST_MORNING;
    case '2': return TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON;
    case '3': return TEXT.ABSENCE_HALF_DAY_LAST_MORNING;
    case '4': return TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING;
    case '0': return TEXT.ABSENCE_HALF_DAY_NONE;
    default: return value;
  }
}

function getDisplayHalfDay(value: string) {
  const v = value.trim();
  if (!v || v === '0') return '';
  return getHalfDayLabel(v);
}

function getDisplayText(value: string) {
  const v = value.trim();
  return v && v !== '0' ? v : '';
}

function getAgentText(item: absence) {
  const rawValue =
    item.selectedAgents ??
    item.selected_agents ??
    item.agents ??
    item.agentList ??
    item.agentStaffIds ??
    item.agent_staff_ids;

  if (Array.isArray(rawValue)) {
    return rawValue.map(formatAgentValue).filter(Boolean).join(', ');
  }

  if (rawValue && typeof rawValue === 'object') {
    const selectedAgents = rawValue as Record<string, unknown>;
    const nestedItems =
      selectedAgents.item ?? selectedAgents.items ?? selectedAgents.data ?? selectedAgents.list;
    if (Array.isArray(nestedItems)) {
      return nestedItems.map(formatAgentValue).filter(Boolean).join(', ');
    }
    return Object.values(selectedAgents).map(formatAgentValue).filter(Boolean).join(', ');
  }

  return getText(item, [
    'selectedAgents',
    'agents',
    'agentNames',
    'agent_names',
    'agentStaffIds',
    'agent_staff_ids',
    'selected_agents',
  ]);
}

function formatAgentValue(agent: unknown) {
  if (typeof agent === 'string' || typeof agent === 'number') return String(agent);
  if (agent && typeof agent === 'object') {
    const agentItem = agent as absence;
    const thaiName = `${getText(agentItem, ['firstNameTH', 'first_name_th'])} ${getText(agentItem, ['lastNameTH', 'last_name_th'])}`.trim();
    return thaiName || getText(agentItem, ['label', 'name', 'fullName', 'full_name', 'staffName', 'staff_name', 'staffId', 'staff_id']);
  }
  return '';
}

// The server returns the approver as a `mainApprover` object plus an
// `approverPosition` code + `approverList`, not a ready display string. Resolve
// it to a readable "position (name)" label, matching how the form shows staff.
function getApproverText(item: absence) {
  const record = item as Record<string, unknown>;

  const position = getText(item, [
    'approverPosition',
    'approver_position',
    'approverPositionId',
    'approver_position_id',
  ]);
  const list = Array.isArray(record.approverList) ? (record.approverList as object[]) : [];
  if (position && list.length) {
    const matched = list.find(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        getText(entry as absence, ['positionId', 'position_id', 'POSITION_ID']) === position,
    );
    if (matched) {
      const label = getStaffDisplayLabel(matched);
      if (label) return label;
    }
  }

  const main = record.mainApprover;
  if (main && typeof main === 'object' && !Array.isArray(main)) {
    const label = getStaffDisplayLabel(main as object);
    if (label) return label;
  }

  return getText(item, [
    'approverPositionName',
    'approver_position_name',
    'approverName',
    'approver_name',
    'approver',
  ]);
}

function getStatusBadge(status: string): { bg: string; color: string } {
  const lower = status.toLowerCase();
  if (lower.includes('อนุมัติแล้ว') || lower.includes('approved') || lower.includes('completed') || lower.includes('success')) {
    return { bg: '#D1FAE5', color: '#065F46' };
  }
  if (lower.includes('รออนุมัติ') || lower.includes('pending') || lower.includes('waiting') || lower.includes('processing')) {
    return { bg: '#FEF3C7', color: '#92400E' };
  }
  if (lower.includes('ไม่อนุมัติ') || lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
    return { bg: '#FEE2E2', color: '#991B1B' };
  }
  return { bg: '#B33939', color: '#FFFFFF' };
}

// Read-only field: mirrors the business-form field layout (label + hairline
// divider) but shows the value as plain text instead of an editable input.
function ReadonlyField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

function DateField({ startDate, endDate }: { startDate: string; endDate: string }) {
  const start = startDate ? formatFullDate(startDate) : '';
  const end = endDate ? formatFullDate(endDate) : '';
  if (!start && !end) return null;

  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{TEXT.ABSENCE_LEAVE_DATE_LABEL}</ThemedText>
      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <ThemedText style={styles.dateSubLabel}>{TEXT.ABSENCE_START_DATE_LABEL}</ThemedText>
          <ThemedText style={styles.fieldValue}>{start || '—'}</ThemedText>
        </View>
        <View style={styles.dateCol}>
          <ThemedText style={styles.dateSubLabel}>{TEXT.ABSENCE_END_DATE_LABEL}</ThemedText>
          <ThemedText style={styles.fieldValue}>{end || '—'}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function FileField({ fileUrl, onPress }: { fileUrl: string; onPress: () => void }) {
  if (!fileUrl) return null;
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{TEXT.ABSENCE_MEDICAL_CERTIFICATE_LABEL}</ThemedText>
      <Pressable accessibilityRole="link" onPress={onPress}>
        <ThemedText style={[styles.fieldValue, styles.fileLink]}>
          {TEXT.ABSENCE_VIEW_ATTACHED_FILE}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function absenceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; item?: string; type?: string }>();
  const initialItem = useMemo(() => parseItem(params.item), [params.item]);
  const [item, setItem] = useState<absence>(initialItem);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedDetailKeyRef = useRef('');
  const loadingDetailKeyRef = useRef('');
  const routeType = Array.isArray(params.type) ? params.type[0] : params.type ?? '';
  const title = TEXT.ABSENCE_HISTORY_TITLE;
  const backHref = '/absence/history';
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const requestId = routeId || getText(initialItem, ['id', 'absenceId', 'ABSENCE_id', 'requestId', 'request_id']);
  const requestType = getabsenceType(initialItem, routeType);
  const detailKey = requestId && requestType ? `${requestType}:${requestId}` : '';

  const typeLabel = getabsenceTypeLabel(item, routeType);
  const absType = getabsenceType(item, routeType);

  const startDate = getText(item, ['startDate', 'start_date', 'dateStart', 'date_start']);
  const endDate = getText(item, ['endDate', 'end_date', 'dateEnd', 'date_end']);
  const leaveDay = getText(item, ['numDays', 'num_days', 'absentDays', 'absent_days', 'absenceDays', 'ABSENCE_days', 'leaveDay', 'leave_day', 'days', 'day']);
  const approver = getApproverText(item);
  const reason = getText(item, ['reason', 'detail', 'description']);
  const halfDay = getDisplayHalfDay(getText(item, ['partFlag', 'part_flag', 'startpart', 'half_day', 'halfDay']));
  const contact = getText(item, ['contact', 'contactChannel', 'contact_channel', 'phone']);
  const travelDetail = getDisplayText(getText(item, ['travelDetail', 'travel_detail']));
  const agents = getAgentText(item);
  const fileUploadLink = getText(item, ['fileUploadLink', 'file_upload_link']);
  // Prefer the human-readable status name; fall back to a non-zero raw code.
  const statusName = getText(item, ['statusName', 'status_name', 'approvalStatusName', 'requestStatusName', 'flowStatusName']);
  const statusCode = getText(item, ['status', 'requestStatus', 'request_status', 'approvalStatus', 'approval_status', 'flowStatus', 'flow_status']);
  const statusLabel = statusName || (statusCode && statusCode !== '0' ? statusCode : '');

  const isSick = absType === TYPE_ABSENCE_SICK;
  const statusBadge = statusLabel ? getStatusBadge(statusLabel) : null;

  const loadDetail = useCallback(async () => {
    if (!detailKey) {
      setItem(initialItem);
      setIsLoading(false);
      return;
    }

    if (loadedDetailKeyRef.current === detailKey || loadingDetailKeyRef.current === detailKey) {
      setIsLoading(false);
      return;
    }

    loadingDetailKeyRef.current = detailKey;
    setIsLoading(true);
    setError('');

    try {
      const data = await getabsenceData(requestId, requestType);
      setItem(data);
      loadedDetailKeyRef.current = detailKey;
    } catch (err) {
      setItem(initialItem);
      setError(err instanceof Error ? err.message : TEXT.SHARED_SOMETHING_WENT_WRONG);
    } finally {
      if (loadingDetailKeyRef.current === detailKey) {
        loadingDetailKeyRef.current = '';
      }
      setIsLoading(false);
    }
  }, [detailKey, initialItem, requestId, requestType]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const handleOpenUploadedFile = useCallback(async () => {
    if (!fileUploadLink) return;
    try {
      if (/^https?:/i.test(fileUploadLink)) {
        await openBrowserAsync(fileUploadLink);
        return;
      }
      await Linking.openURL(fileUploadLink);
    } catch {
      setError(TEXT.SHARED_UNABLE_TO_COMPLETE);
    }
  }, [fileUploadLink]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={title} backHref={backHref} />
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={title} backHref={backHref} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header: type label + subtitle + status badge */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <ThemedText style={styles.pageTitle}>{typeLabel}</ThemedText>
            <ThemedText style={styles.pageSubtitle}>{TEXT.ABSENCE_DETAIL_SUBTITLE}</ThemedText>
          </View>
          {statusBadge ? (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                {statusLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Read-only detail card (business-form look, no editable inputs) */}
        <View style={styles.formCard}>
          <ReadonlyField label={TEXT.ABSENCE_APPROVER_LABEL} value={approver} />
          <ReadonlyField label={TEXT.ABSENCE_REASON_LABEL} value={reason} />
          <DateField startDate={startDate} endDate={endDate} />
          <ReadonlyField
            label={TEXT.ABSENCE_LEAVE_DAY_COUNT_LABEL}
            value={leaveDay ? `${leaveDay} ${TEXT.ABSENCE_DAY_UNIT}` : ''}
          />
          <ReadonlyField label={TEXT.ABSENCE_HALF_DAY_LABEL} value={halfDay} />
          <ReadonlyField label={TEXT.ABSENCE_CONTACT_CHANNEL_LABEL} value={contact} />
          <ReadonlyField label={TEXT.ABSENCE_TRAVEL_DETAIL_LABEL} value={travelDetail} />
          <ReadonlyField label={TEXT.ABSENCE_DELEGATE_LABEL} value={agents} />
          {isSick ? <FileField fileUrl={fileUploadLink} onPress={handleOpenUploadedFile} /> : null}
        </View>

        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
  },
  pageHeaderText: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: '#191C1F',
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#687076',
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8ECF0',
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#687076',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 22,
    color: '#191C1F',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: {
    flex: 1,
    gap: 4,
  },
  dateSubLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#9CA3AF',
  },
  fileLink: {
    color: '#B33939',
    textDecorationLine: 'underline',
  },
  errorText: {
    marginTop: 24,
    marginHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#B33939',
    textAlign: 'center',
  },
});
