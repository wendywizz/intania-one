import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentLeaveScreen(props: any) {
  return <ConvertedScreen title="Absent Leave" source="absent/absent_leave_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentLeaveScreen;
