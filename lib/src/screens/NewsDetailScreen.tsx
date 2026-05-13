import React from 'react';
import {Linking, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import {AppButton, Card, DetailRow, Screen} from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'NewsDetail'>;

export function NewsDetailScreen({route}: Props) {
  const {item} = route.params;
  return (
    <Screen>
      <Card>
        <Text style={{fontSize: 20, fontWeight: '800'}}>{item.title}</Text>
        <DetailRow label="Published" value={item.pubDate} />
        <DetailRow label="Category" value={item.category} />
        <Text>{item.description?.replace(/<[^>]+>/g, '')}</Text>
        {!!item.link && <AppButton label="Open original" onPress={() => Linking.openURL(item.link)} />}
      </Card>
    </Screen>
  );
}
