import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentVacationScreen(props: any) {
  return <ConvertedScreen title="Absent Vacation" source="absent/absent_vacation_screen.dart" kind="absent" subtype="4" {...props} />;
}

export default AbsentVacationScreen;
