import React from 'react';
import {ConvertedScreen} from './converted/ConvertedScreen';

export function NewsDetailScreen(props: any) {
  return <ConvertedScreen title="News Detail" source="news_detail_screen.dart" kind="static" subtype="" {...props} />;
}

export default NewsDetailScreen;
