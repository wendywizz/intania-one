import React from 'react';
import {Linking, Text} from 'react-native';
import {AppButton, Card, Screen} from '../components/ui';

export function CalendarExecutiveScreen() {
  return (
    <Screen>
      <Card>
        <Text style={{fontSize: 18, fontWeight: '800'}}>Executive Calendar</Text>
        <Text>
          The Flutter screen used a web content wrapper. Open the faculty calendar source here,
          or replace this with the exact web URL used by your production environment.
        </Text>
        <AppButton
          label="Open faculty website"
          onPress={() => Linking.openURL('https://www.eng.psu.ac.th/')}
        />
      </Card>
    </Screen>
  );
}
