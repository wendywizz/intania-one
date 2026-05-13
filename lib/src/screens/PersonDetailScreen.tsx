import React from 'react';
import {Image, Linking, StyleSheet, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import {AppButton, Card, DetailRow, Screen} from '../components/ui';
import {getPersonPhoto} from '../services/personnelService';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonDetail'>;

export function PersonDetailScreen({route}: Props) {
  const {person} = route.params;
  const fullName = `${person.prefixNameTH ?? ''}${person.firstNameTH} ${person.lastNameTH}`;
  return (
    <Screen>
      <Card style={styles.header}>
        <Image source={{uri: getPersonPhoto(person)}} style={styles.photo} />
        <Text style={styles.name}>{fullName}</Text>
        <Text>{person.positionName}</Text>
      </Card>
      <Card>
        <DetailRow label="Department" value={person.deptName} />
        <DetailRow label="Email" value={person.email} />
        <DetailRow label="Office phone" value={person.officeTel} />
        <DetailRow label="Website" value={person.website} />
        {!!person.email && <AppButton label="Email" onPress={() => Linking.openURL(`mailto:${person.email}`)} />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  photo: {
    borderRadius: 56,
    height: 112,
    width: 112,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
  },
});
