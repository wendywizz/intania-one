import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import {
  REPAIR_STATUS_NEW_JOB,
  REPAIR_STATUS_WORKER_REJECT,
} from '@/constants/type-repair-computer';
import type { RepairComputer } from '@/models/types';
import { getJobDetail } from '@/services/repairComputerService';

const TEXT_NONE = '-';
const TEXT_RC_NO_SUPPLYCODE = 'No supply code';

function getJobText(job: RepairComputer | null, fields: string[]) {
  if (!job) {
    return '';
  }

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

function formatDate(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

type RowDetailProps = {
  description: string;
  title: string;
};

function RowDetail({ description, title }: RowDetailProps) {
  return (
    <View style={styles.rowDetail}>
      <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.rowDescription}>{description}</ThemedText>
    </View>
  );
}

export default function ForemanJobDetailScreen() {
  const params = useLocalSearchParams<{ backHref?: string | string[]; id?: string | string[] }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || '/repair-computer/foreman-new-job';
  const [data, setData] = useState<RepairComputer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!jobId) {
      setError(TEXT.UNABLE_TO_LOAD_JOB_DETAIL);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await getJobDetail(jobId);

    if (result.processType === PROCESS.error || !result.data) {
      setError(result.message || TEXT.UNABLE_TO_LOAD_JOB_DETAIL);
      setData(null);
      setIsLoading(false);
      return;
    }

    setData(result.data);
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const status = getJobText(data, ['status', 'state', 'statusId', 'status_id']);
  const showAssignedWorker = true;
  const informDateTime = getJobText(data, ['informDateTime', 'inform_date_time', 'informDate', 'inform_date']);
  const rejectDetail = getJobText(data, ['rejectDetail', 'reject_detail', 'rejectReason', 'reject_reason', 'reason']);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.LOADING_JOB_DETAIL} desc={TEXT.PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={loadDetail} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.RETRY}</ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.form}>
        <RowDetail title={TEXT.USER} description={getJobText(data, ['staffFullname', 'staff_fullname']) || TEXT_NONE} />
        <RowDetail title={TEXT.DEPARTMENT} description={getJobText(data, ['deptName', 'dept_name']) || TEXT_NONE} />
        <RowDetail title={TEXT.INFORM_DATE} description={informDateTime ? formatDate(informDateTime) : TEXT_NONE} />
        <RowDetail
          title={TEXT.SUPPLY_CODE_2}
          description={getJobText(data, ['supplyCode', 'supply_code']) || TEXT_RC_NO_SUPPLYCODE}
        />
        <RowDetail title={TEXT.PHONE_2} description={getJobText(data, ['phone']) || TEXT_NONE} />
        <RowDetail title={TEXT.DETAIL_2} description={getJobText(data, ['detail']) || TEXT_NONE} />

        {status !== REPAIR_STATUS_NEW_JOB && showAssignedWorker ? (
          <View style={styles.assignedSection}>
            <ThemedText type="subtitle">{TEXT.ASSIGN_CONFIRM}</ThemedText>
            <RowDetail
              title={TEXT.WORKER_2}
              description={getJobText(data, ['workerFullname', 'worker_fullname']) || TEXT_NONE}
            />
            <RowDetail
              title={TEXT.STATUS}
              description={getJobText(data, ['statusName', 'status_name']) || TEXT_NONE}
            />
            {status === REPAIR_STATUS_WORKER_REJECT ? (
              <RowDetail title={TEXT.REJECT_DETAIL} description={rejectDetail || TEXT_NONE} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER}
        backHref={backHref as Parameters<typeof NavTopBar>[0]['backHref']}
        showBackButton
      />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">{TEXT.JOB_DETAIL}</ThemedText>
          {renderContent()}
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 20,
  },
  form: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  rowDetail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7E6EC',
    paddingBottom: 12,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowDescription: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  assignedSection: {
    gap: 12,
    marginTop: 28,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#B42318',
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
  },
});
