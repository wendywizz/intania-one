import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import {
  MIN_PASSWORD_LENGTH,
  hasAppPassword,
  setAppPassword,
  setPasswordUnlockEnabled,
  verifyAppPassword,
} from '@/services/appPasswordService';

/**
 * Create or change the app's unlock password.
 *
 * Reached from Settings, and from the password toggle when no password exists
 * yet. Changing an existing password requires the current one, so a device left
 * unlocked cannot be used to silently take the app over.
 */
export default function CreatePasswordScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const { showToast } = useToast();
  // Settings passes `enable=1` when it wants the option switched on as soon as
  // a password exists.
  const { enable } = useLocalSearchParams<{ enable?: string }>();

  const [isExisting, setIsExisting] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void hasAppPassword().then(setIsExisting);
  }, []);

  async function handleSave() {
    setError('');

    if (isExisting && !(await verifyAppPassword(current))) {
      setError(TEXT.PASSWORD_CURRENT_WRONG);
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(TEXT.PASSWORD_TOO_SHORT);
      return;
    }
    if (next !== confirm) {
      setError(TEXT.PASSWORD_MISMATCH);
      return;
    }

    setIsSaving(true);
    const saved = await setAppPassword(next);
    setIsSaving(false);

    if (!saved) {
      setError(TEXT.PASSWORD_SAVE_FAILED);
      return;
    }

    if (enable === '1') await setPasswordUnlockEnabled(true);
    showToast(TEXT.PASSWORD_SAVED, 'success');
    router.back();
  }

  // Nothing is rendered until we know which form this is — showing the "current
  // password" field and then pulling it away would be worse than a blank beat.
  if (isExisting === null) {
    return <ThemedView style={styles.container} />;
  }

  const canSave = next.length > 0 && confirm.length > 0 && (!isExisting || current.length > 0);

  return (
    <ThemedView style={styles.container} lightColor={c.background} darkColor={c.background}>
      <NavTopBar
        title={isExisting ? TEXT.PASSWORD_CHANGE_TITLE : TEXT.PASSWORD_CREATE_TITLE}
        tone="primary"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SectionCard>
            <ThemedText style={styles.description}>{TEXT.PASSWORD_CREATE_DESCRIPTION}</ThemedText>

            {isExisting ? (
              <TextField
                label={TEXT.PASSWORD_CURRENT_LABEL}
                value={current}
                onChangeText={setCurrent}
                placeholder={TEXT.PASSWORD_PLACEHOLDER}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            <TextField
              label={TEXT.PASSWORD_NEW_LABEL}
              value={next}
              onChangeText={setNext}
              placeholder={TEXT.PASSWORD_PLACEHOLDER}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label={TEXT.PASSWORD_CONFIRM_LABEL}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={TEXT.PASSWORD_PLACEHOLDER}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
            />
          </SectionCard>

          <View style={styles.actions}>
            <Button
              title={TEXT.PASSWORD_SAVE}
              size="lg"
              fullWidth
              disabled={!canSave}
              loading={isSaving}
              onPress={() => void handleSave()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  description: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
  actions: { marginTop: 4 },
});
