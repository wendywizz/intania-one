import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function MeetingContentScreen(props: any) {
  return <ConvertedScreen title="Meeting Content" source="meeting/meeting_content_screen.dart" kind="meeting" subtype="t" {...props} />;
}

export default MeetingContentScreen;
