import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentBirthScreen(props: any) {
  return <ConvertedScreen title="Absent Birth" source="absent/absent_birth_screen.dart" kind="absent" subtype="3" {...props} />;
}

export default AbsentBirthScreen;
