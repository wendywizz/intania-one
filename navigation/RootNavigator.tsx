import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../constants/colors';
import type {RootStackParamList} from './routes';
import {HomeScreen} from '../screens/HomeScreen';
import {NewsDetailScreen} from '../screens/NewsDetailScreen';
import {absenceScreen} from '../screens/absenceScreen';
import {absenceFormScreen} from '../screens/absenceFormScreen';
import {ForgetTimestampScreen} from '../screens/ForgetTimestampScreen';
import {RepairComputerScreen} from '../screens/RepairComputerScreen';
import {RepairComputerDetailScreen} from '../screens/RepairComputerDetailScreen';
import {PersonSearchScreen} from '../screens/PersonSearchScreen';
import {PersonDetailScreen} from '../screens/PersonDetailScreen';
import {CalendarExecutiveScreen} from '../screens/CalendarExecutiveScreen';
import {MeetingScreen} from '../screens/MeetingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.primary},
        headerTintColor: '#fff',
        contentStyle: {backgroundColor: colors.background},
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Staff Buddy'}} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{title: 'News'}} />
      <Stack.Screen name="absence" component={absenceScreen} options={{title: 'Leave'}} />
      <Stack.Screen name="absenceForm" component={absenceFormScreen} options={{title: 'Leave Request'}} />
      <Stack.Screen name="ForgetTimestamp" component={ForgetTimestampScreen} options={{title: 'Missed Timestamp'}} />
      <Stack.Screen name="RepairComputer" component={RepairComputerScreen} options={{title: 'Repair Computer'}} />
      <Stack.Screen name="RepairComputerDetail" component={RepairComputerDetailScreen} options={{title: 'Repair Detail'}} />
      <Stack.Screen name="PersonSearch" component={PersonSearchScreen} options={{title: 'Personnel Search'}} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} options={{title: 'Personnel Detail'}} />
      <Stack.Screen name="CalendarExecutive" component={CalendarExecutiveScreen} options={{title: 'Executive Calendar'}} />
      <Stack.Screen name="Meeting" component={MeetingScreen} options={{title: 'Meetings'}} />
    </Stack.Navigator>
  );
}
