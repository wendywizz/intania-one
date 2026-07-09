import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
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

const absenceTypeLabels: Record<string, string> = {
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HELPMATE]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeIcons: Record<string, IconSymbolName> = {
  [TYPE_ABSENCE_SICK]: 'cross.fill',
  [TYPE_ABSENCE_BUSINESS]: 'briefcase.fill',
  [TYPE_ABSENCE_BIRTH]: 'figure.child',
  [TYPE_ABSENCE_RELAX]: 'sun.max.fill',
  [TYPE_ABSENCE_HELPMATE]: 'figure.child',
  [TYPE_ABSENCE_HAJJ]: 'calendar-clock',
};

function getabsenceTypeIcon(type: string): IconSymbolName {
  return absenceTypeIcons[type] || 'calendar-clock';
}

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

// Staff name/position split — the approver and delegate cards show the name as a
// bold title with the position underneath (rather than the combined
// "position (name)" label used inside the forms).
function getStaffName(staff: object): string {
  const s = staff as absence;
  const fullName = getText(s, [
    'staffFullName',
    'staff_full_name',
    'staffFullname',
    'staff_fullname',
    'fullname',
    'fullName',
    'staffName',
    'staff_name',
    'name',
  ]);
  if (fullName) return fullName;
  const prefix = getText(s, [
    'prefixNameTH',
    'prefix_name_th',
    'PREFIX_NAME_TH',
    'titleName',
    'title_name',
    'titleNameTH',
    'title_name_th',
    'prefix',
  ]);
  const firstName = getText(s, [
    'firstNameTH',
    'first_name_th',
    'firstnameTH',
    'firstname_th',
    'FIRST_NAME_TH',
    'firstName',
    'first_name',
    'firstname',
  ]);
  const lastName = getText(s, [
    'lastNameTH',
    'last_name_th',
    'lastnameTH',
    'lastname_th',
    'LAST_NAME_TH',
    'lastName',
    'last_name',
    'lastname',
  ]);
  return [prefix, firstName, lastName].filter(Boolean).join(' ');
}

function getStaffPosition(staff: object): string {
  return getText(staff as absence, ['positionName', 'position_name', 'POSITION_NAME', 'position']);
}

type StaffEntry = { name: string; position: string };

// The server returns the approver as a `mainApprover` object plus an
// `approverPosition` code + `approverList`, not a ready display string.
function getApproverInfo(item: absence): StaffEntry {
  const record = item as Record<string, unknown>;

  const position = getText(item, [
    'approverPosition',
    'approver_position',
    'approverPositionId',
    'approver_position_id',
  ]);
  const list = Array.isArray(record.approverList) ? (record.approverList as object[]) : [];

  let staff: object | null = null;
  if (position && list.length) {
    staff =
      list.find(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          getText(entry as absence, ['positionId', 'position_id', 'POSITION_ID']) === position,
      ) ?? null;
  }
  if (!staff) {
    const main = record.mainApprover;
    if (main && typeof main === 'object' && !Array.isArray(main)) {
      staff = main as object;
    }
  }
  if (staff) {
    return { name: getStaffName(staff), position: getStaffPosition(staff) };
  }

  const posName = getText(item, ['approverPositionName', 'approver_position_name']);
  const name = getText(item, ['approverName', 'approver_name', 'approver']);
  if (name) return { name, position: posName };
  return { name: posName, position: '' };
}

function getAgentEntries(item: absence): StaffEntry[] {
  const rawValue =
    item.selectedAgents ??
    item.selected_agents ??
    item.agents ??
    item.agentList ??
    item.agentStaffIds ??
    item.agent_staff_ids;

  const toEntry = (agent: unknown): StaffEntry | null => {
    if (typeof agent === 'string' || typeof agent === 'number') {
      const name = String(agent).trim();
      return name ? { name, position: '' } : null;
    }
    if (agent && typeof agent === 'object') {
      const name = getStaffName(agent);
      if (name) return { name, position: getStaffPosition(agent) };
    }
    return null;
  };

  const collect = (list: unknown[]) => list.map(toEntry).filter(Boolean) as StaffEntry[];

  if (Array.isArray(rawValue)) return collect(rawValue);

  if (rawValue && typeof rawValue === 'object') {
    const nested =
      (rawValue as Record<string, unknown>).item ??
      (rawValue as Record<string, unknown>).items ??
      (rawValue as Record<string, unknown>).data ??
      (rawValue as Record<string, unknown>).list;
    if (Array.isArray(nested)) return collect(nested);
    return collect(Object.values(rawValue as Record<string, unknown>));
  }

  const text = getText(item, [
    'selectedAgents',
    'agents',
    'agentNames',
    'agent_names',
    'agentStaffIds',
    'agent_staff_ids',
    'selected_agents',
  ]);
  if (text) {
    return text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => ({ name, position: '' }));
  }
  return [];
}

function formatDateText(startDate: string, endDate: string) {
  const start = startDate ? formatFullDate(startDate) : '';
  const end = endDate ? formatFullDate(endDate) : '';
  if (start && end) return start === end ? start : `${start} - ${end}`;
  return start || end;
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
  return { bg: '#FDECEC', color: '#B33939' };
}

// A stacked "label above value" row inside the leave-info card. Hidden when the
// value is empty so records with fewer fields still look clean.
function InfoRow({ label, value, icon }: { label: string; value: string; icon?: IconSymbolName }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <View style={styles.infoValueRow}>
        {icon ? <IconSymbol name={icon} size={16} color="#B33939" /> : null}
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

// Avatar + name + position row used by both the approver and delegate cards.
function PersonRow({ name, position }: StaffEntry) {
  return (
    <View style={styles.personRow}>
      <View style={styles.avatar}>
        <IconSymbol name="person.fill" size={22} color="#B33939" />
      </View>
      <View style={styles.personText}>
        <ThemedText style={styles.personName}>{name}</ThemedText>
        {position ? <ThemedText style={styles.personPosition}>{position}</ThemedText> : null}
      </View>
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
  const backHref = '/absence/history';
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const requestId = routeId || getText(initialItem, ['id', 'absenceId', 'ABSENCE_id', 'requestId', 'request_id']);
  const requestType = getabsenceType(initialItem, routeType);
  const detailKey = requestId && requestType ? `${requestType}:${requestId}` : '';

  const typeLabel = getabsenceTypeLabel(item, routeType);
  const absType = getabsenceType(item, routeType);
  const typeIcon = getabsenceTypeIcon(absType);

  const startDate = getText(item, ['startDate', 'start_date', 'dateStart', 'date_start']);
  const endDate = getText(item, ['endDate', 'end_date', 'dateEnd', 'date_end']);
  const dateText = formatDateText(startDate, endDate);
  const leaveDay = getText(item, ['numDays', 'num_days', 'absentDays', 'absent_days', 'absenceDays', 'ABSENCE_days', 'leaveDay', 'leave_day', 'days', 'day']);
  const approver = getApproverInfo(item);
  const agentEntries = getAgentEntries(item);
  const reason = getText(item, ['reason', 'detail', 'description']);
  const halfDay = getDisplayHalfDay(getText(item, ['partFlag', 'part_flag', 'startpart', 'half_day', 'halfDay']));
  const contact = getText(item, ['contact', 'contactChannel', 'contact_channel', 'phone']);
  const travelDetail = getDisplayText(getText(item, ['travelDetail', 'travel_detail']));
  const fileUploadLink = getText(item, ['fileUploadLink', 'file_upload_link']);
  const uploadedFileName = getText(item, ['fileUpload', 'file_upload', 'medicalCertificate', 'medical_certificate']);
  // Prefer the human-readable status name; fall back to a non-zero raw code.
  const statusName = getText(item, ['statusName', 'status_name', 'approvalStatusName', 'requestStatusName', 'flowStatusName']);
  const statusCode = getText(item, ['status', 'requestStatus', 'request_status', 'approvalStatus', 'approval_status', 'flowStatus', 'flow_status']);
  const statusLabel = statusName || (statusCode && statusCode !== '0' ? statusCode : '');

  const isSick = absType === TYPE_ABSENCE_SICK;
  const statusBadge = statusLabel ? getStatusBadge(statusLabel) : null;
  const attachmentTitle = isSick ? TEXT.ABSENCE_MEDICAL_CERTIFICATE_LABEL : TEXT.ABSENCE_DETAIL_ATTACHMENT_SECTION;

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
        <NavTopBar
          title={typeLabel}
          subtitle={TEXT.ABSENCE_DETAIL_TITLE}
          moduleIcon={typeIcon}
          backHref={backHref}
        />
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={typeLabel}
        subtitle={TEXT.ABSENCE_DETAIL_TITLE}
        moduleIcon={typeIcon}
        backHref={backHref}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Leave-info card */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>{TEXT.ABSENCE_DETAIL_INFO_SECTION}</ThemedText>

          <View style={styles.infoHeader}>
            <View style={styles.typeIconCircle}>
              <IconSymbol name={typeIcon} size={22} color="#B33939" />
            </View>
            <ThemedText style={styles.infoType} numberOfLines={2}>
              {typeLabel}
            </ThemedText>
            {statusBadge ? (
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                  {statusLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.infoBody}>
            <InfoRow label={TEXT.ABSENCE_LEAVE_DATE_LABEL} value={dateText} icon="calendar" />
            <InfoRow
              label={TEXT.ABSENCE_LEAVE_DAY_COUNT_LABEL}
              value={leaveDay ? `${leaveDay} ${TEXT.ABSENCE_DAY_UNIT}` : ''}
              icon="calendar-range"
            />
            <InfoRow label={TEXT.ABSENCE_HALF_DAY_LABEL} value={halfDay} />
            <InfoRow label={TEXT.ABSENCE_REASON_LABEL} value={reason} />
            <InfoRow label={TEXT.ABSENCE_CONTACT_CHANNEL_LABEL} value={contact} icon="phone.fill" />
            <InfoRow label={TEXT.ABSENCE_TRAVEL_DETAIL_LABEL} value={travelDetail} />
          </View>
        </View>

        {/* Approver card */}
        {approver.name ? (
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>{TEXT.ABSENCE_APPROVER_LABEL}</ThemedText>
            <PersonRow name={approver.name} position={approver.position} />
          </View>
        ) : null}

        {/* Delegate card */}
        {agentEntries.length ? (
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>{TEXT.ABSENCE_DELEGATE_LABEL}</ThemedText>
            {agentEntries.map((agent, index) => (
              <PersonRow key={`${agent.name}-${index}`} name={agent.name} position={agent.position} />
            ))}
          </View>
        ) : null}

        {/* Attachment card (read-only view of the uploaded file) */}
        {fileUploadLink ? (
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>{attachmentTitle}</ThemedText>
            <Pressable
              accessibilityRole="link"
              onPress={handleOpenUploadedFile}
              style={styles.fileRow}
            >
              <View style={styles.fileIcon}>
                <IconSymbol name="doc.text.fill" size={20} color="#B33939" />
              </View>
              <View style={styles.fileText}>
                <ThemedText style={styles.fileName} numberOfLines={1}>
                  {uploadedFileName || TEXT.ABSENCE_VIEW_ATTACHED_FILE}
                </ThemedText>
                <ThemedText style={styles.fileLink}>{TEXT.ABSENCE_VIEW_ATTACHED_FILE}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={18} color="#9CA3AF" />
            </Pressable>
          </View>
        ) : null}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#687076',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBEAEA',
  },
  infoType: {
    flex: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 17,
    lineHeight: 24,
    color: '#191C1F',
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
  },
  infoBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8ECF0',
    paddingTop: 4,
  },
  infoRow: {
    paddingVertical: 10,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F2F5',
  },
  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    flex: 1,
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 22,
    color: '#191C1F',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBEAEA',
  },
  personText: {
    flex: 1,
    gap: 3,
  },
  personName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: '#191C1F',
  },
  personPosition: {
    fontSize: 13,
    lineHeight: 18,
    color: '#687076',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBEAEA',
  },
  fileText: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: '#191C1F',
  },
  fileLink: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B33939',
    textDecorationLine: 'underline',
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#B33939',
    textAlign: 'center',
  },
});
