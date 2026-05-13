import React from 'react';
import {ConvertedScreen} from './converted/ConvertedScreen';

export function PersonSearchScreen(props: any) {
  return <ConvertedScreen title="Person Search" source="person_search_screen.dart" kind="static" subtype="" {...props} />;
}

export default PersonSearchScreen;
