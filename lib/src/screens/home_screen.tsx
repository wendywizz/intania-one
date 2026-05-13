import React from 'react';
import {ConvertedScreen} from './converted/ConvertedScreen';

export function HomeScreen(props: any) {
  return <ConvertedScreen title="Home" source="home_screen.dart" kind="static" subtype="" {...props} />;
}

export default HomeScreen;
