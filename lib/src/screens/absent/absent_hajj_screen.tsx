import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentHajjScreen(props: any) {
  return <ConvertedScreen title="Absent Hajj" source="absent/absent_hajj_screen.dart" kind="absent" subtype="6" {...props} />;
}

export default AbsentHajjScreen;
