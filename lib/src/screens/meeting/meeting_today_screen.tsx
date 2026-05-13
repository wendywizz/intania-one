import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function MeetingTodayScreen(props: any) {
  return <ConvertedScreen title="Meeting Today" source="meeting/meeting_today_screen.dart" kind="meeting" subtype="t" {...props} />;
}

export default MeetingTodayScreen;
