import React, {useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text} from 'react-native';
import {AppButton, Card, DetailRow, EmptyState, Field, LoadingState, Screen, Section} from '../../components/ui';
import {colors} from '../../constants/colors';
import {useAuth} from '../../context/AuthContext';
import {ABSENT_TYPES, MEETING_TYPES} from '../../constants/domain';
import type {Absent, Meeting, RepairComputer} from '../../models/types';
import {historyAbsentData, waitingAbsentData, addAbsentData} from '../../services/absentService';
import {listMeeting} from '../../services/meetingService';
import {
  addRepairComputerJob,
  assignJob,
  closeJob,
  getRepairTypes,
  getUserCurrentJob,
  getUserHistory,
  listForemanHistory,
  listForemanManageJob,
  listForemanNewJob,
  listWorkerCurrentJob,
  listWorkerHistory,
  listWorkerNewJob,
  requestSupply,
  submitJob,
  workerQueue,
  workerReceiveJob,
  workerOperateJob,
} from '../../services/repairComputerService';

type ScreenKind = 'absent' | 'meeting' | 'repair' | 'static' | 'form' | 'detail';

type ConvertedScreenProps = {
  title: string;
  source: string;
  kind?: ScreenKind;
  subtype?: string;
  route?: any;
  navigation?: any;
};

function labelFromSource(source: string) {
  return source
    .replace(/_/g, ' ')
    .replace(/\.dart$/i, '')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function asRepairList(data: unknown): RepairComputer[] {
  return Array.isArray(data) ? (data as RepairComputer[]) : [];
}

export function ConvertedScreen({title, source, kind = 'static', subtype, route, navigation}: ConvertedScreenProps) {
  if (kind === 'absent') {
    return <AbsentConvertedScreen title={title} subtype={subtype} navigation={navigation} />;
  }
  if (kind === 'meeting') {
    return <MeetingConvertedScreen title={title} subtype={subtype} />;
  }
  if (kind === 'repair') {
    return <RepairConvertedScreen title={title} subtype={subtype} route={route} navigation={navigation} />;
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>{title || labelFromSource(source)}</Text>
        <Text style={styles.muted}>Converted from {source}.</Text>
      </Card>
    </Screen>
  );
}

function AbsentConvertedScreen({title, subtype, navigation}: Omit<ConvertedScreenProps, 'source' | 'kind'>) {
  const {user} = useAuth();
  const [items, setItems] = useState<Absent[] | null>(null);
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const type = subtype ?? ABSENT_TYPES.leave;

  useEffect(() => {
    if (title.toLowerCase().includes('form') || ['1', '2', '3', '4', '6'].includes(type)) {
      setItems([]);
      return;
    }
    if (!user?.staff_id) {
      setItems([]);
      return;
    }
    const request = title.toLowerCase().includes('waiting')
      ? waitingAbsentData(user.staff_id).then(result => result.data ? [result.data] : [])
      : historyAbsentData(user.staff_id).then(result => result.data ?? []);
    request.then(setItems);
  }, [title, type, user?.staff_id]);

  async function submit() {
    if (!user?.staff_id) {
      Alert.alert('Sign in required', 'Please sign in before submitting a leave request.');
      return;
    }
    const result = await addAbsentData({staff_id: user.staff_id, start_date: startDate, end_date: endDate, reason}, type);
    Alert.alert(result.success === false ? 'Request failed' : 'Request sent', result.message);
    if (result.success !== false && navigation?.goBack) {
      navigation.goBack();
    }
  }

  const lowerTitle = title.toLowerCase();
  const shouldShowForm = ['leave', 'business', 'relax', 'birth', 'hajj', 'vacation'].some(key => lowerTitle.includes(key));

  return (
    <Screen>
      <Section title={title}>
        {shouldShowForm ? (
          <Card>
            <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
            <Field label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
            <Field label="Reason" value={reason} onChangeText={setReason} multiline />
            <AppButton label="Submit" onPress={submit} />
          </Card>
        ) : items === null ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message={user ? 'No leave data' : 'Sign in to view leave data'} />
        ) : (
          items.map((item, index) => (
            <Card key={String(item.id ?? index)}>
              <Text style={styles.itemTitle}>{item.statusName ?? item.absentType ?? title}</Text>
              <DetailRow label="Requester" value={item.staffFullname} />
              <DetailRow label="Start" value={item.startDate} />
              <DetailRow label="End" value={item.endDate} />
              <DetailRow label="Days" value={item.totalDay} />
              <DetailRow label="Reason" value={item.reason} />
              <DetailRow label="Status" value={item.status} />
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}

function MeetingConvertedScreen({title, subtype}: Omit<ConvertedScreenProps, 'source' | 'kind'>) {
  const {user} = useAuth();
  const [items, setItems] = useState<Meeting[] | null>(null);
  const type = subtype ?? MEETING_TYPES.today;

  useEffect(() => {
    setItems(null);
    listMeeting(user?.staff_id ?? '', type).then(result => setItems(result.data ?? []));
  }, [type, user?.staff_id]);

  return (
    <Screen>
      <Section title={title}>
        {items === null ? <LoadingState /> : items.length === 0 ? <EmptyState /> : items.map((item, index) => (
          <Card key={String(item.id ?? index)}>
            <Text style={styles.itemTitle}>{item.title ?? String(item.name ?? 'Meeting')}</Text>
            <DetailRow label="Room" value={item.room} />
            <DetailRow label="Start" value={item.startDateTime ?? item.dateTime} />
            <DetailRow label="End" value={item.endDateTime} />
            <DetailRow label="Detail" value={item.detail} />
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

function RepairConvertedScreen({title, subtype, route, navigation}: Omit<ConvertedScreenProps, 'source' | 'kind'>) {
  const {user} = useAuth();
  const [items, setItems] = useState<RepairComputer[] | Record<string, unknown>[] | null>(null);
  const [detail, setDetail] = useState('');
  const [phone, setPhone] = useState('');
  const [supplyCode, setSupplyCode] = useState('');
  const job = route?.params?.item as RepairComputer | undefined;

  useEffect(() => {
    if (['inform_form', 'inform_add', 'inform_edit', 'closejob', 'operate_form', 'request_supply', 'receive_reject', 'assign_confirm'].includes(subtype ?? '')) {
      setItems([]);
      return;
    }
    if (job) {
      setItems([]);
      return;
    }
    if (!user?.staff_id && subtype !== 'queue' && subtype !== 'foreman_new') {
      setItems([]);
      return;
    }

    setItems(null);
    const staffId = user?.staff_id ?? '';
    const request =
      subtype === 'queue' ? workerQueue() :
      subtype === 'history' ? getUserHistory(staffId) :
      subtype === 'foreman_new' ? listForemanNewJob() :
      subtype === 'foreman_manage' ? listForemanManageJob(staffId) :
      subtype === 'foreman_history' ? listForemanHistory(staffId) :
      subtype === 'worker_new' ? listWorkerNewJob(staffId) :
      subtype === 'worker_current' ? listWorkerCurrentJob(staffId) :
      subtype === 'worker_history' ? listWorkerHistory(staffId) :
      subtype === 'repair_types' ? getRepairTypes() :
      getUserCurrentJob(staffId);

    request.then(result => setItems(asRepairList(result.data)));
  }, [job, subtype, user?.staff_id]);

  async function submitAction(action: string) {
    if (!user?.staff_id && !job?.id) {
      Alert.alert('Sign in required', 'Please sign in before continuing.');
      return;
    }

    const id = job?.id ?? '';
    const result =
      subtype === 'closejob' ? await closeJob(id) :
      subtype === 'request_supply' ? await requestSupply(id, detail) :
      subtype === 'operate_form' ? await workerOperateJob(id, detail, detail) :
      subtype === 'receive_reject' ? await workerReceiveJob(id, false, detail) :
      subtype === 'assign_confirm' ? await assignJob(id, '', '', user?.staff_id ?? '') :
      subtype === 'inform_form' || subtype === 'inform_add' ? await addRepairComputerJob({staff_id: user?.staff_id, phone, supply_code: supplyCode, detail}) :
      subtype === 'worker_submit' ? await submitJob(id, detail) :
      await addRepairComputerJob({staff_id: user?.staff_id, phone, supply_code: supplyCode, detail});

    Alert.alert(result.success === false ? `${action} failed` : action, result.message);
    if (result.success !== false && navigation?.goBack) {
      navigation.goBack();
    }
  }

  const formMode = ['inform_form', 'inform_add', 'inform_edit', 'closejob', 'operate_form', 'request_supply', 'receive_reject', 'assign_confirm'].includes(subtype ?? '');

  return (
    <Screen>
      <Section title={title}>
        {job ? (
          <Card>
            <Text style={styles.itemTitle}>{job.detail ?? 'Repair job'}</Text>
            <DetailRow label="Requester" value={job.staffFullname} />
            <DetailRow label="Department" value={job.deptName} />
            <DetailRow label="Phone" value={job.phone} />
            <DetailRow label="Supply code" value={job.supplyCode} />
            <DetailRow label="Repair type" value={job.repairTypeName} />
            <DetailRow label="Status" value={job.statusName ?? job.status} />
            <DetailRow label="Foreman" value={job.foremanFullname} />
            <DetailRow label="Worker" value={job.workerFullname} />
          </Card>
        ) : null}

        {formMode ? (
          <Card>
            {subtype?.startsWith('inform') ? <Field label="Phone" value={phone} onChangeText={setPhone} /> : null}
            {subtype?.startsWith('inform') ? <Field label="Supply code" value={supplyCode} onChangeText={setSupplyCode} /> : null}
            <Field label="Detail" value={detail} onChangeText={setDetail} multiline />
            <AppButton label="Submit" onPress={() => submitAction(title)} />
          </Card>
        ) : items === null ? (
          <LoadingState />
        ) : items.length === 0 && !job ? (
          <EmptyState message={user || subtype === 'queue' ? 'No repair data' : 'Sign in to view repair data'} />
        ) : (
          items.map((item, index) => {
            const repair = item as RepairComputer;
            return (
              <Pressable key={String(repair.id ?? index)} onPress={() => navigation?.navigate?.('RepairComputerDetail', {item: repair})}>
                <Card>
                  <Text style={styles.itemTitle}>{repair.detail ?? repair.workerFullname ?? 'Repair job'}</Text>
                  <DetailRow label="Status" value={repair.statusName ?? repair.status} />
                  <DetailRow label="Date" value={repair.informDateTime} />
                  <DetailRow label="Worker" value={repair.workerFullname} />
                  <DetailRow label="Jobs" value={(item as any).jobCountDescription ?? (item as any).jobCount} />
                </Card>
              </Pressable>
            );
          })
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  muted: {
    color: colors.mutedText,
  },
});
