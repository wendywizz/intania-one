import React, {useState} from 'react';
import {Alert} from 'react-native';
import {AppButton, Card, Field, Screen} from '../components/ui';

export function ForgetTimestampScreen() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Screen>
      <Card>
        <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label="Time" value={time} onChangeText={setTime} placeholder="HH:mm" />
        <Field label="Reason" value={reason} onChangeText={setReason} multiline />
        <AppButton
          label="Prepare request"
          onPress={() => Alert.alert('Request ready', 'Connect this form to the missed timestamp API endpoint.')}
        />
      </Card>
    </Screen>
  );
}
