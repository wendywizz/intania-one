import React, {useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import type {RepairComputer} from '../models/types';
import {useAuth} from '../context/AuthContext';
import {
  addRepairComputerJob,
  getUserCurrentJob,
  getUserHistory,
  workerQueue,
} from '../services/repairComputerService';
import {AppButton, Card, DetailRow, EmptyState, Field, LoadingState, Screen, Section} from '../components/ui';
import {colors} from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'RepairComputer'>;
type Tab = 'current' | 'queue' | 'history' | 'new';

const tabs: {key: Tab; label: string}[] = [
  {key: 'current', label: 'Current'},
  {key: 'queue', label: 'Queue'},
  {key: 'history', label: 'History'},
  {key: 'new', label: 'New'},
];

export function RepairComputerScreen({navigation}: Props) {
  const {user} = useAuth();
  const [active, setActive] = useState<Tab>('current');
  const [items, setItems] = useState<any[] | null>(null);
  const [phone, setPhone] = useState('');
  const [supplyCode, setSupplyCode] = useState('');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    if (active === 'new') {
      setItems([]);
      return;
    }
    if (!user?.staff_id && active !== 'queue') {
      setItems([]);
      return;
    }
    setItems(null);
    const request =
      active === 'current'
        ? getUserCurrentJob(user?.staff_id ?? '')
        : active === 'history'
          ? getUserHistory(user?.staff_id ?? '')
          : workerQueue();
    request.then(result => setItems(result.data ?? []));
  }, [active, user?.staff_id]);

  async function submitJob() {
    if (!user?.staff_id) {
      Alert.alert('Sign in required', 'Please sign in before submitting a job.');
      return;
    }
    const result = await addRepairComputerJob({
      staff_id: user.staff_id,
      phone,
      supply_code: supplyCode,
      detail,
    });
    Alert.alert(result.success === false ? 'Save failed' : 'Job submitted', result.message);
    if (result.success !== false) {
      setPhone('');
      setSupplyCode('');
      setDetail('');
      setActive('current');
    }
  }

  return (
    <Screen>
      <View style={styles.tabs}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActive(tab.key)}
            style={[styles.tab, active === tab.key && styles.tabActive]}>
            <Text style={[styles.tabText, active === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {active === 'new' ? (
        <Card>
          <Field label="Phone" value={phone} onChangeText={setPhone} />
          <Field label="Supply code" value={supplyCode} onChangeText={setSupplyCode} />
          <Field label="Detail" value={detail} onChangeText={setDetail} multiline />
          <AppButton label="Submit repair job" onPress={submitJob} />
        </Card>
      ) : (
        <Section title={tabs.find(tab => tab.key === active)?.label ?? ''}>
          {items === null ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState message={user || active === 'queue' ? 'No data' : 'Sign in to view jobs'} />
          ) : (
            items.map((item, index) => {
              const repair = item as RepairComputer;
              return (
                <Pressable
                  key={String(repair.id ?? index)}
                  onPress={() => {
                    if (repair.id) {
                      navigation.navigate('RepairComputerDetail', {item: repair});
                    }
                  }}>
                  <Card>
                    <Text style={styles.title}>{repair.detail ?? repair.workerFullname ?? 'Repair job'}</Text>
                    <DetailRow label="Status" value={repair.statusName ?? repair.status} />
                    <DetailRow label="Date" value={repair.informDateTime} />
                    <DetailRow label="Worker" value={repair.workerFullname} />
                    <DetailRow label="Jobs" value={item.jobCountDescription ?? item.jobCount} />
                  </Card>
                </Pressable>
              );
            })
          )}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
});
