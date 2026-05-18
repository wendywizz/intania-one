import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

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
} from '@/constants/type-absent';
import type { Absent } from '@/models/types';
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

function formatValue(value: string) {
  return formatDateTime(value);
}

function formatAbsentDate(startDate: string, endDate: string) {
  return formatDateRange(startDate, endDate);
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function AbsentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; item?: string; type?: string }>();
  const item = parseItem(params.item);
  const routeType = Array.isArray(params.type) ? params.type[0] : params.type ?? '';

  const typeLabel = getAbsentTypeLabel(item, routeType);
  const id = params.id || getText(item, ['id', 'absentId', 'absent_id', 'requestId', 'request_id']);
  const startDate = getText(item, ['startDate', 'start_date', 'dateStart', 'date_start']);
  const endDate = getText(item, ['endDate', 'end_date', 'dateEnd', 'date_end']);
  const leaveDay = getText(item, ['absentDays', 'absent_days', 'leaveDay', 'leave_day', 'days', 'day']);
  const status = getText(item, [
    'progressTypeName',
    'progress_type_name',
    'statusName',
    'status_name',
    'statusLabel',
    'status_label',
    'status',
  ]);
  const approver = getText(item, ['approverName', 'approver_name', 'approver', 'approverId', 'approver_id']);
  const contact = getText(item, ['contact', 'contactChannel', 'contact_channel', 'phone']);
  const createdDate = getText(item, ['writeDate', 'write_date', 'createdAt', 'created_at', 'createDate', 'create_date']);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_HISTORY_TITLE} backHref="/absent/history" />

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText type="subtitle">{typeLabel}</ThemedText>

          <View style={styles.detailList}>
            <DetailRow label="Request ID" value={id} />
            <DetailRow label="Type" value={typeLabel} />
            <DetailRow label="Absent date" value={formatAbsentDate(startDate, endDate)} />
            <DetailRow label="Leave days" value={leaveDay} />
            <DetailRow label="Status" value={status} />
            <DetailRow label="Approver" value={approver} />
            <DetailRow label="Contact" value={contact} />
            <DetailRow label="Created" value={createdDate ? formatValue(createdDate) : ''} />
          </View>
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
  detailList: {
    gap: 12,
    marginTop: 18,
  },
  detailRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7E6EC',
    gap: 4,
    paddingBottom: 12,
  },
  detailLabel: {
    color: '#687076',
    fontSize: 12,
    lineHeight: 18,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
  },
});
