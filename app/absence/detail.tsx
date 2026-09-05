import { useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DetailInfoCard } from '@/components/ui/detail-info-card';
import { UserAvatar } from '@/components/user-avatar';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';
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
import { formatDateRange } from '@/utils/date-format';

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

// Staff name/position split — the requester and delegate cards show the name as a
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

// Profile photos are keyed by UNI_STAFF_ID, not the internal STAFF_ID.
function getStaffId(staff: object): string {
  return getText(staff as absence, ['uniStaffId', 'uni_staff_id', 'UNI_STAFF_ID']);
}

type StaffEntry = { name: string; position: string; staffId?: string };

// Same shape the approver-facing screen (approve-detail.tsx) reads: a nested
// `requester` object when present, else the record's own top-level name
// fields — this view can be reached either as "my own request" (history/
// my-leave, where that's redundant) or, via a boss's approve-leave history
// tab, as someone else's decided request — where knowing who asked matters
// more than re-showing the boss their own name as "ผู้อนุมัติ".
function getRequesterInfo(item: absence): StaffEntry {
  const record = item as Record<string, unknown>;
  const req = record.requester;
  if (req && typeof req === 'object' && !Array.isArray(req)) {
    return { name: getStaffName(req), position: getStaffPosition(req), staffId: getStaffId(req) };
  }
  return {
    name: getText(item, ['name', 'fullname', 'staffName', 'staff_name']),
    position: '',
    staffId: getText(item, ['uniStaffId', 'uni_staff_id']),
  };
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
      if (name) return { name, position: getStaffPosition(agent), staffId: getStaffId(agent) };
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

// Avatar + name + position row used by both the requester and delegate cards.
function PersonRow({ name, position, staffId }: StaffEntry) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.personCard}>
      <UserAvatar staffId={staffId} size={44} />
      <View style={styles.personText}>
        <ThemedText style={styles.personName}>{name}</ThemedText>
        {position ? <ThemedText style={styles.personPosition}>{position}</ThemedText> : null}
      </View>
    </View>
  );
}

export default function absenceDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const params = useLocalSearchParams<{ id?: string; item?: string; type?: string; backHref?: string }>();
  const initialItem = useMemo(() => parseItem(params.item), [params.item]);
  const [item, setItem] = useState<absence>(initialItem);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedDetailKeyRef = useRef('');
  const loadingDetailKeyRef = useRef('');
  const routeType = Array.isArray(params.type) ? params.type[0] : params.type ?? '';
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = (backHrefParam || '/absence/history') as Href;
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const requestId = routeId || getText(initialItem, ['id', 'absenceId', 'ABSENCE_id', 'requestId', 'request_id']);
  const requestType = getabsenceType(initialItem, routeType);
  const detailKey = requestId && requestType ? `${requestType}:${requestId}` : '';

  const typeLabel = getabsenceTypeLabel(item, routeType);
  const absType = getabsenceType(item, routeType);

  const startDate = getText(item, ['startDate', 'start_date', 'dateStart', 'date_start']);
  const endDate = getText(item, ['endDate', 'end_date', 'dateEnd', 'date_end']);
  const dateText = formatDateRange(startDate, endDate);
  const leaveDay = getText(item, ['numDays', 'num_days', 'absentDays', 'absent_days', 'absenceDays', 'ABSENCE_days', 'leaveDay', 'leave_day', 'days', 'day']);
  const requester = getRequesterInfo(item);
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
        <ScreenHeader title={typeLabel} backHref={backHref} titleInNavBar tone="primary" />
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={typeLabel} backHref={backHref} titleInNavBar tone="primary" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]} showsVerticalScrollIndicator={false}>
        {/* Leave-info section */}
        <DetailInfoCard
          title={TEXT.ABSENCE_DETAIL_INFO_SECTION}
          trailing={
            statusBadge ? (
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                  {statusLabel}
                </ThemedText>
              </View>
            ) : null
          }
          rows={[
            { label: TEXT.ABSENCE_LEAVE_DATE_LABEL, value: dateText, icon: 'calendar' },
            {
              label: TEXT.ABSENCE_LEAVE_DAY_COUNT_LABEL,
              value: leaveDay ? `${leaveDay} ${TEXT.ABSENCE_DAY_UNIT}` : '',
              icon: 'calendar-range',
            },
            { label: TEXT.ABSENCE_HALF_DAY_LABEL, value: halfDay, icon: 'calendar-clock' },
            { label: TEXT.ABSENCE_REASON_LABEL, value: reason, icon: 'list.bullet' },
            { label: TEXT.ABSENCE_CONTACT_CHANNEL_LABEL, value: contact, icon: 'phone.fill' },
            { label: TEXT.ABSENCE_TRAVEL_DETAIL_LABEL, value: travelDetail, icon: 'mappin' },
          ]}
        />

        {/* Requester card */}
        {requester.name ? (
          <SectionCard title={TEXT.ABSENCE_REQUESTER_LABEL}>
            <PersonRow name={requester.name} position={requester.position} staffId={requester.staffId} />
          </SectionCard>
        ) : null}

        {/* Delegate card */}
        {agentEntries.length ? (
          <SectionCard title={TEXT.ABSENCE_DELEGATE_LABEL}>
            {agentEntries.map((agent, index) => (
              <PersonRow
                key={`${agent.name}-${index}`}
                name={agent.name}
                position={agent.position}
                staffId={agent.staffId}
              />
            ))}
          </SectionCard>
        ) : null}

        {/* Attachment card (read-only view of the uploaded file) */}
        {fileUploadLink ? (
          <SectionCard title={attachmentTitle}>
            <Pressable
              accessibilityRole="link"
              onPress={handleOpenUploadedFile}
              style={styles.fileRow}
            >
              <View style={styles.fileIcon}>
                <IconSymbol name="doc.text.fill" size={20} color={c.inverse} />
              </View>
              <View style={styles.fileText}>
                <ThemedText style={styles.fileName} numberOfLines={1}>
                  {uploadedFileName || TEXT.ABSENCE_VIEW_ATTACHED_FILE}
                </ThemedText>
                <ThemedText style={styles.fileLink}>{TEXT.ABSENCE_VIEW_ATTACHED_FILE}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={18} color={c.textFaint} />
            </Pressable>
          </SectionCard>
        ) : null}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requesterText: {
    flex: 1,
    gap: 2,
  },
  requesterName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 16,
    lineHeight: 22,
    color: c.text,
  },
  requesterPosition: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  typeRow: {
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
    backgroundColor: c.primarySoft,
  },
  infoType: {
    flex: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 17,
    lineHeight: 24,
    color: c.text,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexShrink: 0,
  },
  statusText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  agentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
  },
  personText: {
    flex: 1,
    gap: 3,
  },
  personName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  personPosition: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
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
    backgroundColor: c.primarySoft,
  },
  fileText: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  fileLink: {
    fontSize: 13,
    lineHeight: 18,
    color: c.primary,
    textDecorationLine: 'underline',
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
    color: c.primary,
    textAlign: 'center',
  },
});
