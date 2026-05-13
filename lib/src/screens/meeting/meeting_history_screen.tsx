import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function MeetingHistoryScreen(props: any) {
  return <ConvertedScreen title="Meeting History" source="meeting/meeting_history_screen.dart" kind="meeting" subtype="p" {...props} />;
}

export default MeetingHistoryScreen;
