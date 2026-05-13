import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import type {Meeting} from '../models/types';
import {MEETING_TYPES} from '../constants/domain';
import {useAuth} from '../context/AuthContext';
import {listMeeting} from '../services/meetingService';
import {Card, DetailRow, EmptyState, LoadingState, Screen} from '../components/ui';
import {colors} from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Meeting'>;
type TabKey = keyof typeof MEETING_TYPES;

const tabs: {key: TabKey; label: string}[] = [
  {key: 'today', label: 'Today'},
  {key: 'incoming', label: 'Incoming'},
  {key: 'history', label: 'History'},
];

export function MeetingScreen({route}: Props) {
  const initialType = route.params?.initialType;
  const initial = useMemo(
    () => tabs.find(tab => MEETING_TYPES[tab.key] === initialType)?.key ?? 'today',
    [initialType],
  );
  const [active, setActive] = useState<TabKey>(initial);
  const [items, setItems] = useState<Meeting[] | null>(null);
  const {user} = useAuth();

  useEffect(() => {
    setItems(null);
    listMeeting(user?.staff_id ?? '', MEETING_TYPES[active]).then(result =>
      setItems(result.data ?? []),
    );
  }, [active, user?.staff_id]);

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
      {items === null ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        items.map((item, index) => (
          <Card key={String(item.id ?? index)}>
            <Text style={styles.title}>
              {item.title ?? String(item.name ?? 'Meeting')}
            </Text>
            <DetailRow label="Room" value={item.room} />
            <DetailRow label="Start" value={item.startDateTime ?? item.dateTime} />
            <DetailRow label="End" value={item.endDateTime} />
            <DetailRow label="Detail" value={item.detail} />
          </Card>
        ))
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
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
