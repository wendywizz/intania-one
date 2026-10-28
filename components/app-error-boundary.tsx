/**
 * What the root `ErrorBoundary` (app/_layout.tsx) draws when a render throws
 * (scooba-insight T10). Before this the app had no boundary at all — a render
 * error was a white screen in release.
 *
 * expo-router mounts it *in place of* the root layout, i.e. outside every
 * provider (theme, language, toast), so it uses only react-native primitives,
 * the system colour scheme and the module-level `TEXT`. It reports the error
 * once on mount; "retry" re-renders the tree.
 */
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { TEXT } from '@/constants/text';
import { reportError } from '@/services/errorReporting';
import { flushTelemetry } from '@/services/telemetryService';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const reported = useRef<Error | null>(null);
  const dark = useColorScheme() === 'dark';

  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    reportError(error, { source: 'boundary', fatal: false });
    void flushTelemetry();
  }, [error]);

  const fg = dark ? '#F2F2F7' : '#1C1C1E';
  return (
    <View
      testID="app-error-boundary"
      style={[styles.root, { backgroundColor: dark ? '#000000' : '#FFFFFF' }]}
    >
      <Text style={[styles.title, { color: fg }]}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</Text>
      <Text style={[styles.message, { color: dark ? '#AEAEB2' : '#636366' }]}>
        {TEXT.SHARED_UNABLE_TO_COMPLETE}
      </Text>
      <Pressable
        accessibilityRole="button"
        testID="app-error-boundary-retry"
        onPress={() => {
          void retry();
        }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{TEXT.SHARED_RETRY}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#B33939', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  pressed: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
