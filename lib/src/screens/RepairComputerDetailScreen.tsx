import React from 'react';
import {Alert, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import {AppButton, Card, DetailRow, Screen} from '../components/ui';
import {closeJob, removeJob} from '../services/repairComputerService';

type Props = NativeStackScreenProps<RootStackParamList, 'RepairComputerDetail'>;

export function RepairComputerDetailScreen({route, navigation}: Props) {
  const {item} = route.params;

  async function close() {
    const result = await closeJob(item.id);
    Alert.alert(result.success === false ? 'Close failed' : 'Job closed', result.message);
    if (result.success !== false) {
      navigation.goBack();
    }
  }

  async function remove() {
    const result = await removeJob(item.id);
    Alert.alert(result.success === false ? 'Cancel failed' : 'Job cancelled', result.message);
    if (result.success !== false) {
      navigation.goBack();
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={{fontSize: 18, fontWeight: '800'}}>{item.detail ?? 'Repair job'}</Text>
        <DetailRow label="Requester" value={item.staffFullname} />
        <DetailRow label="Department" value={item.deptName} />
        <DetailRow label="Phone" value={item.phone} />
        <DetailRow label="Supply code" value={item.supplyCode} />
        <DetailRow label="Repair type" value={item.repairTypeName} />
        <DetailRow label="Status" value={item.statusName ?? item.status} />
        <DetailRow label="Foreman" value={item.foremanFullname} />
        <DetailRow label="Worker" value={item.workerFullname} />
        <AppButton label="Close job" onPress={close} />
        <AppButton label="Cancel job" onPress={remove} variant="danger" />
      </Card>
    </Screen>
  );
}
