import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';

type AppToastProps = {
  message: string;
  type?: 'success' | 'error';
};

export function AppToast({ message, type = 'success' }: AppToastProps) {
  const [visibleMessage, setVisibleMessage] = useState(message);
  const isSuccess = type === 'success';
  const accentColor = isSuccess ? '#0A6E8A' : '#C44D58';
  const title = isSuccess ? TEXT.SHARED_SUCCESS : TEXT.SHARED_UNABLE_TO_COMPLETE;

  useEffect(() => {
    setVisibleMessage(message);

    if (!message) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setVisibleMessage('');
    }, 3000);

    return () => {
      clearTimeout(timeout);
    };
  }, [message]);

  if (!visibleMessage) {
    return null;
  }

  return (
    <ThemedView style={styles.toast} lightColor="#FFFFFF" darkColor="#151718">
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.message}>{visibleMessage}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    minHeight: 64,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    boxShadow: '0 12px 28px rgba(17, 24, 28, 0.18)',
  },
  accent: {
    width: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  message: {
    color: '#687076',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
});
