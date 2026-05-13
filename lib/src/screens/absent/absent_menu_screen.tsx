import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function AbsentMenuScreen(props: any) {
  return <ConvertedScreen title="Absent Menu" source="absent/absent_menu_screen.dart" kind="absent" subtype="1" {...props} />;
}

export default AbsentMenuScreen;
