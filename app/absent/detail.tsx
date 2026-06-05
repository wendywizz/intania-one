import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { openBrowserAsync } from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import {
  TYPE_ABSENT_BIRTH,
  TYPE_ABSENT_BUSINESS,
  TYPE_ABSENT_HAJJ,
  TYPE_ABSENT_RELAX,
  TYPE_ABSENT_SICK,
} from '@/constants/types';
import type { Absent } from '@/models/types';
import { getAbsentData } from '@/services/absentService';
import { formatDateRange, formatDateTime } from '@/utils/date-format';

const absentTypeLabels: Record<string, string> = {
  [TYPE_ABSENT_SICK]: TEXT.ABSENT_SICK_TITLE,
  [TYPE_ABSENT_BUSINESS]: TEXT.ABSENT_BUSINESS_TITLE,
  [TYPE_ABSENT_BIRTH]: TEXT.ABSENT_BIRTH_TITLE,
  [TYPE_ABSENT_RELAX]: TEXT.ABSENT_RELAX_TITLE,
  [TYPE_ABSENT_HAJJ]: 'Hajj leave',
};

const absentTypeFields = [
  'absentType',
  'absent_type',
  'typeAbsent',
  'type_absent',
  'leaveType',
  'leave_type',
  'type',
];
const absentTypeNameFields = [
  'absentTypeName',
  'absent_type_name',
  'typeName',
  'type_name',
  'leaveTypeName',
  'leave_type_name',
];

function getText(item: Absent, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function getAbsentType(item: Absent, routeType: string) {
  return routeType || getText(item, absentTypeFields);
}

function getAbsentTypeLabel(item: Absent, routeType: string) {
  const typeName = getText(item, absentTypeNameFields);
  const type = getAbsentType(item, routeType);

  return typeName || absentTypeLabels[type] || (type ? `Absent type ${type}` : 'Absent');
}

function parseItem(value: string | string[] | undefined): Absent {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as Absent;
  } catch {
    return {};
  }
}

function formatDateOnly(value: string) {
  return formatDateTime(value).split(' ')[0] || value.split(' ')[0] || value;
}

type DetailRowProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: DetailRowProps) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.readOnlyInput}>
        <ThemedText style={styles.readOnlyText}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function ReadOnlyTextArea({ label, value }: DetailRowProps) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>{label}</ThemedText>
      <View style={[styles.readOnlyInput, styles.textArea]}>
        <ThemedText style={styles.readOnlyText}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function ReadOnlyDateRange({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  if (!startDate && !endDate) {
    return null;
  }

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>{TEXT.ABSENT_LEAVE_DATE_LABEL}</ThemedText>
      <ThemedText style={styles.readOnlyText}>
        {formatDateRange(startDate, endDate) ||
          [formatDateOnly(startDate), formatDateOnly(endDate)].filter(Boolean).join(' - ')}
      </ThemedText>
    </View>
  );
}

function getHalfDayLabel(value: string) {
  switch (value) {
    case '1':
      return TEXT.ABSENT_HALF_DAY_FIRST_MORNING;
    case '2':
      return TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON;
    case '3':
      return TEXT.ABSENT_HALF_DAY_LAST_MORNING;
    case '4':
      return TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING;
    case '0':
      return TEXT.ABSENT_HALF_DAY_NONE;
    default:
      return value;
  }
}

function getDisplayHalfDay(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue === '0') {
    return '';
  }

  return getHalfDayLabel(normalizedValue);
}

function getDisplayText(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue && normalizedValue !== '0' ? normalizedValue : '';
}

function getAgentText(item: Absent) {
  const rawValue =
    item.selectedAgents ??
    item.selected_agents ??
    item.agents ??
    item.agentList ??
    item.agentStaffIds ??
    item.agent_staff_ids;

  if (Array.isArray(rawValue)) {
    return rawValue
      .map(formatAgentValue)
      .filter(Boolean)
      .join(', ');
  }

  if (rawValue && typeof rawValue === 'object') {
    const selectedAgents = rawValue as Record<string, unknown>;
    const nestedItems =
      selectedAgents.item ??
      selectedAgents.items ??
      selectedAgents.data ??
      selectedAgents.list;

    if (Array.isArray(nestedItems)) {
      return nestedItems
        .map(formatAgentValue)
        .filter(Boolean)
        .join(', ');
    }

    return Object.values(selectedAgents)
      .map(formatAgentValue)
      .filter(Boolean)
      .join(', ');
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
  if (typeof agent === 'string' || typeof agent === 'number') {
    return String(agent);
  }

  if (agent && typeof agent === 'object') {
    const agentItem = agent as Absent;
    const thaiName = `${getText(agentItem, ['firstNameTH', 'first_name_th'])} ${getText(agentItem, ['lastNameTH', 'last_name_th'])}`.trim();

    return thaiName || getText(agentItem, [
      'label',
      'name',
      'fullName',
      'full_name',
      'staffName',
      'staff_name',
      'staffId',
      'staff_id',
    ]);
  }

  return '';
}

function UploadedFileLink({
  fileUrl,
  onPress,
}: {
  fileUrl: string;
  onPress: () => void;
}) {
  if (!fileUrl) {
    return null;
  }

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>{TEXT.ABSENT_MEDICAL_CERTIFICATE_LABEL}</ThemedText>
      <Pressable accessibilityRole="link" onPress={onPress} style={styles.uploadedFileLink}>
        <MaterialIcons name="attach-file" size={18} color="#12805C" />
        <ThemedText
          lightColor="#12805C"
          darkColor="#5EC6A3"
          type="defaultSemiBold"
          style={styles.uploadedFileLinkText}
        >
          Uploaded file
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function AbsentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; item?: string; type?: string }>();
  const initialItem = useMemo(() => parseItem(params.item), [params.item]);
  const [item, setItem] = useState<Absent>(initialItem);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedDetailKeyRef = useRef('');
  const loadingDetailKeyRef = useRef('');
  const routeType = Array.isArray(params.type) ? params.type[0] : params.type ?? '';
  const title = TEXT.ABSENT_HISTORY_TITLE;
  const backHref = '/absent/history';
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const requestId = routeId || getText(initialItem, ['id', 'absentId', 'absent_id', 'requestId', 'request_id']);
  const requestType = getAbsentType(initialItem, routeType);
  const detailKey = requestId && requestType ? `${requestType}:${requestId}` : '';

  const typeLabel = getAbsentTypeLabel(item, routeType);
  const startDate = getText(item, ['startDate', 'start_date', 'dateStart', 'date_start']);
  const endDate = getText(item, ['endDate', 'end_date', 'dateEnd', 'date_end']);
  const leaveDay = getText(item, ['numDays', 'num_days', 'absentDays', 'absent_days', 'leaveDay', 'leave_day', 'days', 'day']);
  const approver = getText(item, [
    'approverPositionName',
    'approver_position_name',
    'approverName',
    'approver_name',
    'approver',
    'approverId',
    'approver_id',
  ]);
  const reason = getText(item, ['reason', 'detail', 'description']);
  const halfDay = getDisplayHalfDay(getText(item, ['partFlag', 'part_flag', 'startpart', 'half_day', 'halfDay']));
  const contact = getText(item, ['contact', 'contactChannel', 'contact_channel', 'phone']);
  const travelDetail = getDisplayText(getText(item, ['travelDetail', 'travel_detail']));
  const agents = getAgentText(item);
  const fileUploadLink = getText(item, ['fileUploadLink', 'file_upload_link']);

  const loadDetail = useCallback(async () => {
    if (!detailKey) {
      setItem(initialItem);
      setIsLoading(false);
      return;
    }

    if (
      loadedDetailKeyRef.current === detailKey ||
      loadingDetailKeyRef.current === detailKey
    ) {
      setIsLoading(false);
      return;
    }

    loadingDetailKeyRef.current = detailKey;
    setIsLoading(true);
    setError('');

    try {
      const data = await getAbsentData(requestId, requestType);
      setItem(data);
      loadedDetailKeyRef.current = detailKey;
    } catch (error) {
      setItem(initialItem);
      setError(error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG);
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
    if (!fileUploadLink) {
      return;
    }

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

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText type="subtitle">{typeLabel}</ThemedText>

          <View style={styles.form}>
            <ReadOnlyField label={TEXT.ABSENT_APPROVER_LABEL} value={approver} />
            <ReadOnlyTextArea label={TEXT.ABSENT_REASON_LABEL} value={reason} />
            <ReadOnlyDateRange startDate={startDate} endDate={endDate} />
            <ReadOnlyField label={TEXT.ABSENT_LEAVE_DAY_COUNT_LABEL} value={leaveDay ? `${leaveDay} ${TEXT.ABSENT_DAY_UNIT}` : ''} />
            <ReadOnlyField label={TEXT.ABSENT_HALF_DAY_LABEL} value={halfDay} />
            <ReadOnlyField label={TEXT.ABSENT_CONTACT_CHANNEL_LABEL} value={contact} />
            <ReadOnlyTextArea label={TEXT.ABSENT_TRAVEL_DETAIL_LABEL} value={travelDetail} />
            <ReadOnlyField label={TEXT.ABSENT_DELEGATE_LABEL} value={agents} />
            <UploadedFileLink fileUrl={fileUploadLink} onPress={handleOpenUploadedFile} />
          </View>

          {error ? <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText> : null}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  panel: {
    borderRadius: 8,
    padding: 0,
  },
  form: {
    gap: 0,
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D7E6EC',
  },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7E6EC',
    paddingVertical: 14,
  },
  fieldLabel: {
    width: 118,
  },
  readOnlyInput: {
    flex: 1,
  },
  readOnlyText: {
    flex: 1,
    color: '#11181C',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  textArea: {
    flex: 1,
  },
  uploadedFileLink: {
    flex: 1,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  uploadedFileLinkText: {
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  stateMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#B42318',
  },
});
