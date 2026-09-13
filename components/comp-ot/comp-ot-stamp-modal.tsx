import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import type { CompOtStampFlag } from '@/services/compOtService';

type CompOtStampModalProps = {
  visible: boolean;
  flag: CompOtStampFlag;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (amount: string) => void;
};

/**
 * ลงเวลาเข้า/ออกเวร — mirrors the legacy web form's fields exactly (time is
 * stamped server-side; the only thing to collect here is "จำนวนเงิน", kept for
 * parity with the paper trail admins already read).
 *
 * Same visual shape as ConfirmDialog (centered card over a scrim), with a
 * TextField slotted in for the amount — ConfirmDialog itself has no input slot.
 */
export function CompOtStampModal({ visible, flag, loading = false, onCancel, onSubmit }: CompOtStampModalProps) {
  const c = useColors();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  // Fresh field every time the modal opens, so a previous stamp's leftover
  // value (or error) never bleeds into the next one.
  useEffect(() => {
    if (visible) {
      setAmount('');
      setError('');
    }
  }, [visible]);

  const title = flag === 'in' ? TEXT.COMP_OT_STAMP_MODAL_TITLE_IN : TEXT.COMP_OT_STAMP_MODAL_TITLE_OUT;

  function handleSubmit() {
    const trimmed = amount.trim();
    if (!trimmed || Number.isNaN(Number(trimmed))) {
      setError(TEXT.COMP_OT_STAMP_AMOUNT_REQUIRED);
      return;
    }
    setError('');
    onSubmit(trimmed);
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={loading ? undefined : onCancel}>
        <Pressable style={[styles.card, { backgroundColor: c.surface }]}>
          <ThemedText style={[styles.title, { color: c.text }]}>{title}</ThemedText>

          <TextField
            label={TEXT.COMP_OT_STAMP_AMOUNT_LABEL}
            placeholder={TEXT.COMP_OT_STAMP_AMOUNT_PLACEHOLDER}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            error={error}
            editable={!loading}
          />

          <View style={styles.actions}>
            <Button
              title={TEXT.COMP_OT_STAMP_CANCEL}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={styles.action}
            />
            <Button
              title={TEXT.COMP_OT_STAMP_SUBMIT}
              variant="primary"
              onPress={handleSubmit}
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
  card: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 17, lineHeight: 24, fontFamily: AppFonts.psuBold, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  action: { flex: 1 },
});
