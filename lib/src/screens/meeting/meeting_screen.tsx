import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function MeetingScreen(props: any) {
  return <ConvertedScreen title="Meeting" source="meeting/meeting_screen.dart" kind="meeting" subtype="t" {...props} />;
}

export default MeetingScreen;
