import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
                : <ThemedText style={styles.confirmText}>{confirmLabel ?? TEXT.NOTICE_REPAIR_ACTION_CONFIRM}</ThemedText>}
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,28,.45)', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderRadius: 10, padding: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: c.text },
  message: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  btn: { minHeight: 44, minWidth: 96, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { backgroundColor: c.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  confirmBtn: { backgroundColor: c.success },
  destructiveBtn: { backgroundColor: c.danger },
  confirmText: { fontSize: 14, fontWeight: '700', color: c.textOnPrimary },
});
