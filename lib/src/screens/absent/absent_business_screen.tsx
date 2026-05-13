import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentBusinessScreen(props: any) {
  return <ConvertedScreen title="Absent Business" source="absent/absent_business_screen.dart" kind="absent" subtype="2" {...props} />;
}

export default AbsentBusinessScreen;
