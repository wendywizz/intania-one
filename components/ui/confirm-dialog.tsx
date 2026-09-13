/**
 * ConfirmDialog — the standard themed confirmation modal.
 *
 * Replaces hand-rolled confirm <Modal>s and native Alert.alert() confirmations
 * (which are unstyled and ignore dark mode). Centered card over a scrim, a
 * cancel (secondary) + confirm (primary/danger) action pair. Themed via
 * useColors().
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/app-text';

import { Button } from '@/components/ui/button';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Renders the confirm button in the danger color for destructive actions. */
  destructive?: boolean;
  /** Disables buttons and spins the confirm action. */
  loading?: boolean;
  icon?: IconSymbolName;
  /** One button only — for a notice to acknowledge rather than a choice to make. */
  hideCancel?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
  icon,
  hideCancel = false,
}: ConfirmDialogProps) {
  const c = useColors();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={loading ? undefined : onCancel}>
        {/* Inner Pressable swallows taps so pressing the card doesn't dismiss. */}
        <Pressable style={[styles.card, { backgroundColor: c.surface }]}>
          {icon ? (
            <View style={[styles.iconCircle, { backgroundColor: destructive ? c.dangerSoft : c.primarySoft }]}>
              <IconSymbol name={icon} size={24} color={destructive ? c.danger : c.primary} />
            </View>
          ) : null}
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: c.textMuted }]}>{message}</Text> : null}

          <View style={styles.actions}>
            {hideCancel ? null : (
              <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} style={styles.action} />
            )}
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 20, gap: 10, alignItems: 'center' },
  iconCircle: { height: 48, width: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  title: { fontSize: 17, lineHeight: 24, fontFamily: AppFonts.psuBold, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, fontFamily: AppFonts.psuRegular, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12, alignSelf: 'stretch' },
  action: { flex: 1 },
});
