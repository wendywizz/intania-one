import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { PasscodePad } from '@/components/passcode-pad';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import {
  PASSCODE_LENGTH,
  hasAppPassword,
  setAppPassword,
  setPasswordUnlockEnabled,
  verifyAppPassword,
} from '@/services/appPasswordService';

/** 'current' only appears when replacing an existing passcode. */
type Step = 'current' | 'create' | 'confirm';

/**
 * Set or change the app's unlock passcode, in the shape iOS uses: a run of dots
 * over a keypad, one step per screenful, advancing the moment the last digit
 * lands. No text fields and no save button.
 */
export default function CreatePasscodeScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const { showToast } = useToast();
  // Settings passes `enable=1` when it wants the option switched on as soon as
  // a passcode exists.
  const { enable } = useLocalSearchParams<{ enable?: string }>();

  const [isExisting, setIsExisting] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('create');
  const [entry, setEntry] = useState('');
  // Held between the 'create' and 'confirm' steps to compare against.
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void hasAppPassword().then((exists) => {
      setIsExisting(exists);
      setStep(exists ? 'current' : 'create');
    });
  }, []);

  // Each step completes on its own last digit, so the flow is driven by length
  // rather than by a button the user has to find.
  useEffect(() => {
    if (entry.length !== PASSCODE_LENGTH) return;

    async function complete() {
      if (step === 'current') {
        if (!(await verifyAppPassword(entry))) {
          setError(TEXT.PASSCODE_CURRENT_WRONG);
          setEntry('');
          return;
        }
        setError('');
        setEntry('');
        setStep('create');
        return;
      }

      if (step === 'create') {
        setError('');
        setFirstEntry(entry);
        setEntry('');
        setStep('confirm');
        return;
      }

      if (entry !== firstEntry) {
        // Start the pair over rather than letting them retry the confirm blind.
        setError(TEXT.PASSCODE_MISMATCH);
        setFirstEntry('');
        setEntry('');
        setStep('create');
        return;
      }

      const saved = await setAppPassword(entry);
      if (!saved) {
        setError(TEXT.PASSCODE_SAVE_FAILED);
        setEntry('');
        return;
      }

      if (enable === '1') await setPasswordUnlockEnabled(true);
      showToast(TEXT.PASSCODE_SAVED, 'success');
      router.back();
    }

    void complete();
  }, [entry, step, firstEntry, enable, showToast]);

  // Nothing until we know whether this is a set or a change — showing "enter
  // your current passcode" and then pulling it away would be worse than a beat.
  if (isExisting === null) {
    return <ThemedView style={styles.container} />;
  }

  const heading =
    step === 'current'
      ? TEXT.PASSCODE_CURRENT_HEADING
      : step === 'create'
        ? TEXT.PASSCODE_CREATE_HEADING
        : TEXT.PASSCODE_CONFIRM_HEADING;

  return (
    <ThemedView style={styles.container} lightColor={c.background} darkColor={c.background}>
      <NavTopBar
        title={isExisting ? TEXT.PASSCODE_CHANGE_TITLE : TEXT.PASSCODE_CREATE_TITLE}
        tone="primary"
        showHomeButton={false}
      />
      <View style={styles.content}>
        <View style={styles.copy}>
          <ThemedText style={styles.heading}>{heading}</ThemedText>
          <ThemedText style={[styles.hint, error ? styles.hintError : null]}>
            {error || TEXT.PASSCODE_CREATE_DESCRIPTION}
          </ThemedText>
        </View>

        <PasscodePad value={entry} onChange={setEntry} />
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 40,
  },
  copy: { alignItems: 'center', gap: 8 },
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: AppFonts.psuBold,
    color: c.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
    textAlign: 'center',
  },
  hintError: { color: c.danger },
});
