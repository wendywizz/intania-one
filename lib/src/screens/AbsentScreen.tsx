import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import type {Absent} from '../models/types';
import {ABSENT_TYPES} from '../constants/domain';
import {useAuth} from '../context/AuthContext';
import {historyAbsentData} from '../services/absentService';
import {Card, DetailRow, EmptyState, LoadingState, Screen, Section} from '../components/ui';
import {colors} from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Absent'>;

const leaveTypes = [
  {title: 'Sick Leave', type: ABSENT_TYPES.leave},
  {title: 'Business Leave', type: ABSENT_TYPES.business},
  {title: 'Vacation Leave', type: ABSENT_TYPES.relax},
  {title: 'Birth Leave', type: ABSENT_TYPES.birth},
  {title: 'Hajj Leave', type: ABSENT_TYPES.hajj},
];

export function AbsentScreen({navigation}: Props) {
  const {user} = useAuth();
  const [history, setHistory] = useState<Absent[] | null>(null);

  useEffect(() => {
    if (!user?.staff_id) {
      setHistory([]);
      return;
    }
    historyAbsentData(user.staff_id).then(result => setHistory(result.data ?? []));
  }, [user?.staff_id]);

  return (
    <Screen>
      <Section title="New Request">
        <View style={styles.grid}>
          {leaveTypes.map(item => (
            <Pressable
              key={item.type}
              onPress={() => navigation.navigate('AbsentForm', item)}
              style={({pressed}) => [styles.tile, pressed && styles.pressed]}>
              <Text style={styles.tileText}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="History">
        {history === null ? (
          <LoadingState />
        ) : history.length === 0 ? (
          <EmptyState message={user ? 'No leave history' : 'Sign in to view leave history'} />
        ) : (
          history.map((item, index) => (
            <Card key={String(item.id ?? index)}>
              <Text style={styles.title}>{item.statusName ?? item.absentType ?? 'Leave request'}</Text>
              <DetailRow label="Start" value={item.startDate} />
              <DetailRow label="End" value={item.endDate} />
              <DetailRow label="Days" value={item.totalDay} />
              <DetailRow label="Reason" value={item.reason} />
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
    justifyContent: 'center',
    padding: 12,
    width: '48%',
  },
  tileText: {
    color: colors.text,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    fontWeight: '800',
  },
});
