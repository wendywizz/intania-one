import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentScreen(props: any) {
  return <ConvertedScreen title="Absent" source="absent/absent_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentScreen;
