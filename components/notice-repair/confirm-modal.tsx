import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for irreversible actions (e.g. ยกเลิก / ไม่เห็นชอบ). */
  destructive?: boolean;
  /** Disables the buttons and shows a spinner on confirm while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible, title, message, confirmLabel, cancelLabel,
  destructive, loading, onConfirm, onCancel,
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.card} lightColor="#fff" darkColor="#151718">
          <ThemedText style={styles.title}>{title}</ThemedText>
          {!!message && <ThemedText style={styles.message}>{message}</ThemedText>}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={[styles.btn, styles.cancelBtn, loading && styles.btnDisabled]}>
              <ThemedText style={styles.cancelText}>{cancelLabel ?? TEXT.CLOSE}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onConfirm}
              style={[styles.btn, destructive ? styles.destructiveBtn : styles.confirmBtn, loading && styles.btnDisabled]}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <ThemedText style={styles.confirmText}>{confirmLabel ?? TEXT.PR_ACTION_CONFIRM}</ThemedText>}
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,28,.45)', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderRadius: 10, padding: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  message: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  btn: { minHeight: 44, minWidth: 96, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { backgroundColor: '#15803D' },
  destructiveBtn: { backgroundColor: '#DC2626' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
