import React, {useState} from 'react';
import {Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import {useAuth} from '../context/AuthContext';
import {addAbsentData} from '../services/absentService';
import {AppButton, Card, Field, Screen} from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'AbsentForm'>;

export function AbsentFormScreen({route, navigation}: Props) {
  const {user} = useAuth();
  const {type, title} = route.params;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('');

  async function submit() {
    if (!user?.staff_id) {
      Alert.alert('Sign in required', 'Please sign in before submitting a request.');
      return;
    }
    const result = await addAbsentData(
      {
        staff_id: user.staff_id,
        start_date: startDate,
        end_date: endDate,
        contact,
        reason,
      },
      type,
    );
    Alert.alert(result.success === false ? 'Request failed' : 'Request sent', result.message);
    if (result.success !== false) {
      navigation.goBack();
    }
  }

  return (
    <Screen>
      <Card>
        <Field label="Type" value={title} onChangeText={() => undefined} editable={false} />
        <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Field label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
        <Field label="Contact during leave" value={contact} onChangeText={setContact} multiline />
        <Field label="Reason" value={reason} onChangeText={setReason} multiline />
        <AppButton label="Submit" onPress={submit} />
      </Card>
    </Screen>
  );
}
