import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';

export default function RejectJobScreen() {
  const params = useLocalSearchParams<{ backHref?: string | string[]; id?: string | string[] }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || '/repair-computer/foreman-new-job';

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER}
        backHref={backHref as Parameters<typeof NavTopBar>[0]['backHref']}
        showBackButton
      />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">Reject Job</ThemedText>
          <ThemedText style={styles.text}>Job ID: {jobId || '-'}</ThemedText>
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
    gap: 10,
  },
  text: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
  },
});
