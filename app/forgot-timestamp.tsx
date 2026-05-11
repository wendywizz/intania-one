import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ForgotTimestampScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">ลืมลงเวลา</ThemedText>
      <ThemedText style={styles.message}>หน้านี้คือหน้าลืมลงเวลา</ThemedText>
      <Link href="/">
        <ThemedText type="link" style={styles.link}>
          กลับหน้าหลัก
        </ThemedText>
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
