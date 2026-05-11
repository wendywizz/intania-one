import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function RepairComputerScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">แจ้งซ่อมคอมพิวเตอร์</ThemedText>
      <ThemedText style={styles.message}>หน้านี้คือหน้าแจ้งซ่อมคอมพิวเตอร์</ThemedText>
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
