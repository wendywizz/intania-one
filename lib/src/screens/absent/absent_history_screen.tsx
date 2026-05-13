import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentHistoryScreen(props: any) {
  return <ConvertedScreen title="Absent History" source="absent/absent_history_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentHistoryScreen;
