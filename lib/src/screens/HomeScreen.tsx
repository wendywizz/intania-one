import React, {useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/routes';
import type {News} from '../models/types';
import {useAuth} from '../context/AuthContext';
import {staffNewsFeed} from '../services/newsService';
import {AppButton, Card, EmptyState, LoadingState, Screen, Section} from '../components/ui';
import {colors} from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const shortcuts = [
  {label: 'Leave', route: 'Absent'},
  {label: 'Missed Timestamp', route: 'ForgetTimestamp'},
  {label: 'Repair Computer', route: 'RepairComputer'},
  {label: 'Executive Calendar', route: 'CalendarExecutive'},
  {label: 'Meetings', route: 'Meeting'},
  {label: 'Personnel Search', route: 'PersonSearch'},
] as const;

export function HomeScreen({navigation}: Props) {
  const auth = useAuth();
  const [news, setNews] = useState<News[] | null>(null);

  useEffect(() => {
    staffNewsFeed().then(setNews);
  }, []);

  async function handleAuthPress() {
    try {
      if (auth.signedIn) {
        await auth.signOut();
      } else {
        await auth.signIn();
      }
    } catch (error) {
      Alert.alert('Authentication failed', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.welcome}>Intania Staff Buddy</Text>
        <Text style={styles.subtitle}>
          {auth.user
            ? `${auth.user.first_name} ${auth.user.last_name}`
            : 'Sign in to open staff workflows'}
        </Text>
        <AppButton
          label={auth.signedIn ? 'Sign out' : 'Sign in'}
          onPress={handleAuthPress}
          variant={auth.signedIn ? 'secondary' : 'primary'}
        />
      </Card>

      <Section title="Applications">
        <View style={styles.grid}>
          {shortcuts.map(item => (
            <Pressable
              key={item.route}
              onPress={() => {
                switch (item.route) {
                  case 'Absent':
                    navigation.navigate('Absent');
                    break;
                  case 'ForgetTimestamp':
                    navigation.navigate('ForgetTimestamp');
                    break;
                  case 'RepairComputer':
                    navigation.navigate('RepairComputer');
                    break;
                  case 'CalendarExecutive':
                    navigation.navigate('CalendarExecutive');
                    break;
                  case 'Meeting':
                    navigation.navigate('Meeting');
                    break;
                  case 'PersonSearch':
                    navigation.navigate('PersonSearch');
                    break;
                }
              }}
              style={({pressed}) => [styles.shortcut, pressed && styles.pressed]}>
              <Text style={styles.shortcutIcon}>{item.label.slice(0, 1)}</Text>
              <Text style={styles.shortcutText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Staff News">
        {news === null ? (
          <LoadingState />
        ) : news.length === 0 ? (
          <EmptyState message="No news found" />
        ) : (
          news.slice(0, 3).map(item => (
            <Pressable
              key={`${item.title}-${item.pubDate}`}
              onPress={() => navigation.navigate('NewsDetail', {item})}>
              <Card>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.date}>{item.pubDate}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.mutedText,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 104,
    padding: 12,
    width: '31%',
  },
  pressed: {
    opacity: 0.72,
  },
  shortcutIcon: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    height: 40,
    lineHeight: 40,
    overflow: 'hidden',
    textAlign: 'center',
    width: 40,
  },
  shortcutText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  newsTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  date: {
    color: colors.mutedText,
    fontSize: 12,
  },
});
