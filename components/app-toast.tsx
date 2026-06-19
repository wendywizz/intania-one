import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';

type AppToastProps = {
  message: string;
  type?: 'success' | 'error';
};

export function AppToast({ message, type = 'success' }: AppToastProps) {
  const [visibleMessage, setVisibleMessage] = useState(message);
  const isSuccess = type === 'success';
  const accentColor = isSuccess ? '#166534' : '#ba1a1a';
  const iconBg = isSuccess ? '#DCFCE7' : '#FEE2E2';
  const iconName = isSuccess ? 'checkmark.circle.fill' : 'cross.fill';
  const title = isSuccess ? TEXT.SHARED_SUCCESS : TEXT.SHARED_UNABLE_TO_COMPLETE;

  useEffect(() => {
    setVisibleMessage(message);
    if (!message) return undefined;
    const timeout = setTimeout(() => setVisibleMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  const dismiss = () => setVisibleMessage('');

  return (
    <Modal
      transparent
      visible={Boolean(visibleMessage)}
      animationType="fade"
      onRequestClose={dismiss}
    >
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable accessibilityRole="none" onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.dialog} lightColor="#FFFFFF" darkColor="#151718">
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <IconSymbol name={iconName} size={36} color={accentColor} />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText style={styles.message}>{visibleMessage}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={dismiss}
              style={[styles.okButton, { backgroundColor: isSuccess ? '#b33939' : '#ba1a1a' }]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {TEXT.SHARED_OK}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 28, 0.45)',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E2E6',
    boxShadow: '0 12px 32px rgba(17, 24, 28, 0.18)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
  },
  message: {
    color: '#584140',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 2,
  },
  okButton: {
    marginTop: 10,
    minHeight: 46,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
});
