import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentApprovingScreen(props: any) {
  return <ConvertedScreen title="Absent Approving" source="absent/absent_approving_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentApprovingScreen;
