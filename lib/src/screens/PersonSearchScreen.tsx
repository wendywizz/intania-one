import React, {useState} from 'react';
import {Alert, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import type {Person} from '../models/types';
import {Card, EmptyState, Field, LoadingState, Screen} from '../components/ui';
import {getPersonPhoto, getPersonnelSuggestions} from '../services/personnelService';
import {colors} from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonSearch'>;

export function PersonSearchScreen({navigation}: Props) {
  const [keyword, setKeyword] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(value: string) {
    setKeyword(value);
    if (value.trim().length < 2) {
      setPeople([]);
      return;
    }
    setLoading(true);
    try {
      setPeople(await getPersonnelSuggestions(value));
    } catch (error) {
      Alert.alert('Search failed', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Field label="Search" value={keyword} onChangeText={search} placeholder="Name, email, or staff ID" />
      {loading ? (
        <LoadingState />
      ) : people.length === 0 ? (
        <EmptyState message="Type at least two characters" />
      ) : (
        people.map(person => (
          <Pressable
            key={person.staffId}
            onPress={() => navigation.navigate('PersonDetail', {person})}>
            <Card>
              <View style={styles.row}>
                <Image source={{uri: getPersonPhoto(person)}} style={styles.avatar} />
                <View style={styles.personText}>
                  <Text style={styles.name}>
                    {person.prefixNameTH ?? ''}
                    {person.firstNameTH} {person.lastNameTH}
                  </Text>
                  <Text style={styles.muted}>{person.positionName}</Text>
                  <Text style={styles.muted}>{person.deptName}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    backgroundColor: colors.border,
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  personText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
  },
  muted: {
    color: colors.mutedText,
  },
});
