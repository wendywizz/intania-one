import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function MeetingIncomingScreen(props: any) {
  return <ConvertedScreen title="Meeting Incoming" source="meeting/meeting_incoming_screen.dart" kind="meeting" subtype="c" {...props} />;
}

export default MeetingIncomingScreen;
