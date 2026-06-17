import MaterialIcons from '@react-native-vector-icons/material-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import {
  TYPE_absence_BIRTH,
  TYPE_absence_BUSINESS,
  TYPE_absence_HAJJ,
  TYPE_absence_HELPMATE,
  TYPE_absence_RELAX,
  TYPE_absence_SICK,
} from '@/constants/types';
import type { absence } from '@/models/types';
import { getabsenceData } from '@/services/absenceService';
import { formatDateTime } from '@/utils/date-format';

const absenceTypeLabels: Record<string, string> = {
  [TYPE_absence_SICK]: TEXT.absence_SICK_TITLE,
  [TYPE_absence_BUSINESS]: TEXT.absence_BUSINESS_TITLE,
  [TYPE_absence_BIRTH]: TEXT.absence_BIRTH_TITLE,
  [TYPE_absence_RELAX]: TEXT.absence_RELAX_TITLE,
  [TYPE_absence_HELPMATE]: TEXT.absence_BIRTH_TITLE,
  [TYPE_absence_HAJJ]: TEXT.absence_HAJJ_TITLE,
};

const absenceTypeFields = [
  'absenceType',
  'absence_type',
  'typeabsence',
  'type_absence',
  'leaveType',
  'leave_type',
  'type',
];
const absenceTypeNameFields = [
  'absenceTypeName',
  'absence_type_name',
  'typeName',
  'type_name',
  'leaveTypeName',
  'leave_type_name',
];

type IconName = keyof typeof MaterialIcons.glyphMap;

const TYPE_ICON: Record<string, IconName> = {
  [TYPE_absence_SICK]: 'local-hospital',
  [TYPE_absence_BUSINESS]: 'business-center',
  [TYPE_absence_RELAX]: 'beach-access',
  [TYPE_absence_BIRTH]: 'child-care',
  [TYPE_absence_HELPMATE]: 'child-care',
  [TYPE_absence_HAJJ]: 'mosque',
};

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

function formatDateOnly(value: string) {
  return formatDateTime(value).split(' ')[0] || value.split(' ')[0] || value;
}

function getHalfDayLabel(value: string) {
  switch (value) {
    case '1': return TEXT.absence_HALF_DAY_FIRST_MORNING;
    case '2': return TEXT.absence_HALF_DAY_FIRST_AFTERNOON;
    case '3': return TEXT.absence_HALF_DAY_LAST_MORNING;
    case '4': return TEXT.absence_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING;
    case '0': return TEXT.absence_HALF_DAY_NONE;
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

type FieldProps = {
  label: string;
  value: string;
  icon: IconName;
  bold?: boolean;
};

function Field({ label, value, icon, bold }: FieldProps) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.fieldValueRow}>
        <MaterialIcons name={icon} size={18} color="#B33939" style={styles.fieldIcon} />
        <ThemedText style={[styles.fieldValue, bold && styles.fieldValueBold]} numberOfLines={0}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function DateFields({ startDate, endDate }: { startDate: string; endDate: string }) {
  if (!startDate && !endDate) return null;
  const startDisplay = startDate ? formatDateOnly(startDate) : '—';
  const endDisplay = endDate ? formatDateOnly(endDate) : '—';

  return (
    <View style={styles.dateGroup}>
      <View style={styles.dateField}>
        <ThemedText style={styles.fieldLabel}>START DATE</ThemedText>
        <View style={styles.fieldValueRow}>
          <MaterialIcons name="event" size={18} color="#B33939" style={styles.fieldIcon} />
          <ThemedText style={styles.fieldValue}>{startDisplay}</ThemedText>
        </View>
      </View>
      <View style={styles.dateDivider} />
      <View style={styles.dateField}>
        <ThemedText style={styles.fieldLabel}>END DATE</ThemedText>
        <View style={styles.fieldValueRow}>
          <MaterialIcons name="event-available" size={18} color="#B33939" style={styles.fieldIcon} />
          <ThemedText style={styles.fieldValue}>{endDisplay}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function FileField({ fileUrl, onPress }: { fileUrl: string; onPress: () => void }) {
  if (!fileUrl) return null;
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{TEXT.absence_MEDICAL_CERTIFICATE_LABEL}</ThemedText>
      <Pressable accessibilityRole="link" onPress={onPress} style={styles.fieldValueRow}>
        <MaterialIcons name="attach-file" size={18} color="#B33939" style={styles.fieldIcon} />
        <ThemedText lightColor="#B33939" darkColor="#B33939" style={[styles.fieldValue, styles.fileLinkText]}>
          Uploaded file
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
  const title = TEXT.absence_HISTORY_TITLE;
  const backHref = '/absence/history';
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const requestId = routeId || getText(initialItem, ['id', 'absenceId', 'absence_id', 'requestId', 'request_id']);
  const requestType = getabsenceType(initialItem, routeType);
  const detailKey = requestId && requestType ? `${requestType}:${requestId}` : '';

  const typeLabel = getabsenceTypeLabel(item, routeType);
  const absType = getabsenceType(item, routeType);
  const typeIcon: IconName = TYPE_ICON[absType] ?? 'description';

  const startDate = getText(item, ['startDate', 'start_date', 'dateStart', 'date_start']);
  const endDate = getText(item, ['endDate', 'end_date', 'dateEnd', 'date_end']);
  const leaveDay = getText(item, ['numDays', 'num_days', 'absenceDays', 'absence_days', 'leaveDay', 'leave_day', 'days', 'day']);
  const approver = getText(item, ['approverPositionName', 'approver_position_name', 'approverName', 'approver_name', 'approver', 'approverId', 'approver_id']);
  const reason = getText(item, ['reason', 'detail', 'description']);
  const halfDay = getDisplayHalfDay(getText(item, ['partFlag', 'part_flag', 'startpart', 'half_day', 'halfDay']));
  const contact = getText(item, ['contact', 'contactChannel', 'contact_channel', 'phone']);
  const travelDetail = getDisplayText(getText(item, ['travelDetail', 'travel_detail']));
  const agents = getAgentText(item);
  const fileUploadLink = getText(item, ['fileUploadLink', 'file_upload_link']);
  const status = getText(item, ['status', 'statusName', 'requestStatus', 'request_status', 'approvalStatus', 'approval_status', 'approvalStatusName', 'flowStatus', 'flow_status']);

  const isSick = absType === TYPE_absence_SICK;
  const isBusiness = absType === TYPE_absence_BUSINESS;
  const statusBadge = status ? getStatusBadge(status) : null;

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
        {/* Title section */}
        <View style={styles.titleSection}>
          <View style={styles.titleLeft}>
            <ThemedText style={styles.titleText}>{typeLabel}</ThemedText>
            <ThemedText style={styles.titleSubtitle}>
              Review the details of this absence request.
            </ThemedText>
          </View>
          {statusBadge ? (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                {status.toUpperCase()}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Fields */}
        <View style={styles.form}>
          <Field
            label="APPROVER"
            value={approver}
            icon="person"
          />

          {isSick || isBusiness ? (
            <Field
              label="REASON"
              value={reason}
              icon="notes"
            />
          ) : null}

          <DateFields startDate={startDate} endDate={endDate} />

          <Field
            label="TOTAL DAYS"
            value={leaveDay ? `${leaveDay} ${TEXT.absence_DAY_UNIT}` : ''}
            icon="date-range"
            bold
          />

          {(isSick || isBusiness) && halfDay ? (
            <Field
              label={TEXT.absence_HALF_DAY_LABEL.toUpperCase()}
              value={halfDay}
              icon="schedule"
            />
          ) : null}

          <Field
            label="EMERGENCY CONTACT"
            value={contact}
            icon="phone"
          />

          {isBusiness ? (
            <Field
              label={TEXT.absence_TRAVEL_DETAIL_LABEL.toUpperCase()}
              value={travelDetail}
              icon="flight"
            />
          ) : null}

          <Field
            label="SUBSTITUTE WORKER"
            value={agents}
            icon="group"
          />

          {isSick ? (
            <FileField fileUrl={fileUploadLink} onPress={handleOpenUploadedFile} />
          ) : null}
        </View>

        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const FIELD_ICON_COLOR = '#B33939';
const LABEL_COLOR = '#8A1A1F';
const VALUE_COLOR = '#191C1F';
const BORDER_COLOR = '#DFBFBD';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContent: {
    paddingBottom: 112,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  titleLeft: {
    flex: 1,
    gap: 4,
  },
  titleText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: VALUE_COLOR,
  },
  titleSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#584140',
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  form: {
    paddingHorizontal: 16,
    gap: 32,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: LABEL_COLOR,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  fieldIcon: {
    flexShrink: 0,
  },
  fieldValue: {
    flex: 1,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 24,
    color: VALUE_COLOR,
  },
  fieldValueBold: {
    fontFamily: AppFonts.psuBold,
    fontWeight: '600',
  },
  dateGroup: {
    flexDirection: 'row',
    gap: 32,
  },
  dateField: {
    flex: 1,
    gap: 6,
  },
  dateDivider: {
    width: 0,
  },
  fileLinkText: {
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
