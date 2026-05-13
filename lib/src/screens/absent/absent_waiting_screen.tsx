import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentWaitingScreen(props: any) {
  return <ConvertedScreen title="Absent Waiting" source="absent/absent_waiting_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentWaitingScreen;
