import React from 'react';
import {ConvertedScreen} from './converted/ConvertedScreen';

export function PersonDetailScreen(props: any) {
  return <ConvertedScreen title="Person Detail" source="person_detail_screen.dart" kind="static" subtype="" {...props} />;
}

export default PersonDetailScreen;
