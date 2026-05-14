import { StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type MeetingTabContentProps = {
  title: string;
  emptyMessage: string;
};

export function MeetingTabContent({ title, emptyMessage }: MeetingTabContentProps) {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.MEETING_MENU_TITLE} backHref="/" />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
            <ThemedText style={styles.emptyMessage}>{emptyMessage}</ThemedText>
          </ThemedView>
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
  emptyCard: {
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    marginTop: 16,
    padding: 16,
  },
  emptyMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
