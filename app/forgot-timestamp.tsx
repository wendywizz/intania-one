import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ForgotTimestampScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{TEXT.TEXT_22}</ThemedText>
      <ThemedText style={styles.message}>{TEXT.TEXT_23}</ThemedText>
      <Link href="/">
        <ThemedText type="link" style={styles.link}>
          {TEXT.TEXT_21}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    marginTop: 24,
  },
});
