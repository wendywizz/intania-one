import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentStatScreen(props: any) {
  return <ConvertedScreen title="Absent Stat" source="absent/absent_stat_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentStatScreen;
