import { StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type AbsentRequestScreenProps = {
  title: string;
  description: string;
  fields: string[];
};

export function AbsentRequestScreen({ title, description, fields }: AbsentRequestScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={title} />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>

          <View style={styles.fieldList}>
            {fields.map((field) => (
              <ThemedView key={field} style={styles.field} lightColor="#FFFFFF" darkColor="#151718">
                <ThemedText type="defaultSemiBold">{field}</ThemedText>
                <ThemedText style={styles.fieldHint}>{TEXT.TEXT_31}</ThemedText>
              </ThemedView>
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
    padding: 24,
  },
  panel: {
    borderRadius: 8,
    padding: 20,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldList: {
    gap: 12,
    marginTop: 20,
  },
  field: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 14,
  },
  fieldHint: {
    marginTop: 4,
    color: '#687076',
    fontSize: 12,
    lineHeight: 18,
  },
});
