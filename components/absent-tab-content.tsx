import { StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type AbsentTabContentProps = {
  title: string;
  description: string;
  items: string[];
};

export function AbsentTabContent({ title, description, items }: AbsentTabContentProps) {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_TITLE} />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText style={styles.message}>{description}</ThemedText>

          <View style={styles.list}>
            {items.map((item) => (
              <View key={item} style={styles.listItem}>
                <View style={styles.dot} />
                <ThemedText>{item}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    borderRadius: 8,
    padding: 0,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
    marginTop: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A6E8A',
  },
});
