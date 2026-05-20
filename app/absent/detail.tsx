import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
} from '@/constants/type-absent';
import type { Absent } from '@/models/types';
import { getAbsentData, removeData, updateAbsentData } from '@/services/absentService';
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
  const params = useLocalSearchParams<{ id?: string; item?: string; mode?: string; source?: string; type?: string }>();
  const initialItem = useMemo(() => parseItem(params.item), [params.item]);
  const [item, setItem] = useState<Absent>(initialItem);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');
  const routeType = Array.isArray(params.type) ? params.type[0] : params.type ?? '';
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode ?? '';
  const source = Array.isArray(params.source) ? params.source[0] : params.source ?? '';
  const canEdit = source === 'waiting' || mode === 'edit';
  const title = canEdit ? TEXT.ABSENT_WAITING_TITLE : TEXT.ABSENT_HISTORY_TITLE;
  const backHref = canEdit ? '/absent/waiting' : '/absent/history';
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const requestId = routeId || getText(initialItem, ['id', 'absentId', 'absent_id', 'requestId', 'request_id']);
  const requestType = getAbsentType(initialItem, routeType);

  const typeLabel = getAbsentTypeLabel(item, routeType);
  const id = requestId || getText(item, ['id', 'absentId', 'absent_id', 'requestId', 'request_id']);
  const type = getAbsentType(item, routeType);
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

  const loadDetail = useCallback(async () => {
    if (!requestId || !requestType) {
      setItem(initialItem);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getAbsentData(requestId, requestType);
      setItem(data);
    } catch (error) {
      setItem(initialItem);
      setError(error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG);
    } finally {
      setIsLoading(false);
    }
  }, [initialItem, requestId, requestType]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const handleUpdate = async () => {
    if (!id || !type || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updateAbsentData(id, item, type);
      Alert.alert(TEXT.SHARED_SUCCESS, result.message || TEXT.SHARED_UPDATE);
      loadDetail();
    } catch (error) {
      Alert.alert(
        TEXT.SHARED_UNABLE_TO_COMPLETE,
        error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = () => {
    if (!id || !type || isRemoving) {
      return;
    }

    Alert.alert(TEXT.CONFIRM_DELETE, 'Do you want to remove this absent request?', [
      { text: TEXT.CANCEL, style: 'cancel' },
      {
        text: TEXT.DELETE,
        style: 'destructive',
        onPress: async () => {
          setIsRemoving(true);

          try {
            await removeData(id, type);
            router.replace('/absent/waiting');
          } catch (error) {
            Alert.alert(
              TEXT.SHARED_UNABLE_TO_COMPLETE,
              error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
            );
          } finally {
            setIsRemoving(false);
          }
        },
      },
    ]);
  };

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

          {error ? <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText> : null}

          {canEdit ? (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isUpdating || isRemoving || !id || !type}
                onPress={handleUpdate}
                style={[styles.updateButton, isUpdating || isRemoving || !id || !type ? styles.disabledButton : undefined]}>
                {isUpdating ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                  {TEXT.SHARED_UPDATE}
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isUpdating || isRemoving || !id || !type}
                onPress={handleRemove}
                style={[styles.removeButton, isUpdating || isRemoving || !id || !type ? styles.disabledButton : undefined]}>
                {isRemoving ? <ActivityIndicator color="#B42318" size="small" /> : null}
                <ThemedText lightColor="#B42318" darkColor="#B42318" type="defaultSemiBold">
                  {TEXT.SHARED_DELETE_THAI}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
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
  stateMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#B42318',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 24,
  },
  updateButton: {
    minHeight: 48,
    minWidth: 132,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    paddingHorizontal: 16,
  },
  removeButton: {
    minHeight: 48,
    minWidth: 132,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0B4AE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
