import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  type AppStateStatus,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { AppFonts } from '@/constants/fonts';
import { APP_ICON } from '@/constants/images';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { verifyAppPassword } from '@/services/appPasswordService';
import {
  authenticateWithBiometrics,
  isBiometricUnusable,
  isCancelledAttempt,
  isRejectedScan,
  shouldLockApp,
} from '@/services/biometricService';

// react-native-web has no native animation driver.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
// How long the app may sit in the background before it locks again. Short trips
// out — a message, a share sheet, the OS prompt itself — come straight back in.
const RELOCK_AFTER_MS = 60_000;
// How long the success tick stays on screen before the overlay lifts away.
const SUCCESS_HOLD_MS = 320;
const REVEAL_MS = 340;
// Failed scans tolerated before the device passcode is offered as the way in.
// Opening the app should ask for a face or finger, never a PIN.
const SCANS_BEFORE_PASSCODE = 2;
// The progress bar that runs before the unlock button appears.
const ACTION_REVEAL_MS = 500;

type Status = 'checking' | 'locked' | 'unlocking' | 'unlocked';

/**
 * Wraps the app in a Face ID / fingerprint lock when "Biometric Login" is on in
 * Settings. The screen behind stays mounted (so navigation state survives) but is
 * fully covered by an opaque overlay until the scan succeeds.
 *
 * A cold start always prompts; returning from the background only prompts after
 * RELOCK_AFTER_MS away, so ducking out to another app and back doesn't re-scan.
 *
 * The prompt is biometrics-only to begin with — the device passcode is offered
 * after SCANS_BEFORE_PASSCODE failed scans, or immediately if the OS locks
 * biometrics out, so a face that won't scan can never bar the way in.
 *
 * No-ops on web and on devices without enrolled biometrics.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  // Starts as 'checking' so the app content is never briefly visible before we
  // know whether the lock applies — the cover is up from the very first frame.
  // Web has no biometrics at all, so it skips straight past the cover.
  const [status, setStatus] = useState<Status>(Platform.OS === 'web' ? 'unlocked' : 'checking');
  const [isPrompting, setIsPrompting] = useState(false);
  // Flips once scanning has failed enough times to hand over to the app's own
  // password (never the device passcode).
  const [isEnteringPassword, setIsEnteringPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // The unlock button is held back behind a short progress bar, so the scan the
  // app fires automatically gets a moment before a second way in appears.
  const [isActionReady, setIsActionReady] = useState(false);
  // Set while the OS prompt is up, so backgrounding for the prompt itself does
  // not count as leaving the app.
  const isAuthenticatingRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const failedScansRef = useRef(0);

  // Success choreography: the scan icon gives way to a tick, then the whole
  // overlay fades and eases back to hand the app over.
  const tickScale = useRef(new Animated.Value(0)).current;
  const promptOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const overlayScale = useRef(new Animated.Value(1)).current;
  const actionProgress = useRef(new Animated.Value(0)).current;

  const resetOverlay = useCallback(() => {
    tickScale.setValue(0);
    promptOpacity.setValue(1);
    overlayOpacity.setValue(1);
    overlayScale.setValue(1);
  }, [tickScale, promptOpacity, overlayOpacity, overlayScale]);

  /** Plays the unlock animation, then reveals the app underneath. */
  const revealApp = useCallback(() => {
    setStatus('unlocking');
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    Animated.parallel([
      // The tick springs in as the prompt copy drops away.
      Animated.spring(tickScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(promptOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.delay(SUCCESS_HOLD_MS),
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: REVEAL_MS,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          // Easing outward reads as the cover lifting off the app.
          Animated.timing(overlayScale, {
            toValue: 1.08,
            duration: REVEAL_MS,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]),
    ]).start(({ finished }) => {
      if (finished) setStatus('unlocked');
    });
  }, [tickScale, promptOpacity, overlayOpacity, overlayScale]);

  const promptUnlock = useCallback(async () => {
    if (isAuthenticatingRef.current) return;

    isAuthenticatingRef.current = true;
    setIsPrompting(true);
    try {
      // Never `allowDeviceFallback`: the app password is the fallback now, and
      // asking for the phone's own passcode is exactly what this lock avoids.
      const { success, error } = await authenticateWithBiometrics(
        TEXT.BIOMETRIC_LOCK_PROMPT,
        TEXT.BIOMETRIC_LOCK_CANCEL,
      );
      if (success) {
        revealApp();
      } else if (!isCancelledAttempt(error)) {
        // Only a scan the sensor actually rejected counts against the user.
        // Codes like 'not_available' or 'unknown' mean the OS never showed the
        // prompt — counting those would burn through the attempts without the
        // user ever being asked for a face or finger.
        if (isRejectedScan(error)) failedScansRef.current += 1;

        // Out of scans, or biometrics are unusable — hand over to the app's own
        // password. `shouldLockApp` guarantees one exists, which is why the
        // device passcode never enters into it.
        if (isBiometricUnusable(error) || failedScansRef.current >= SCANS_BEFORE_PASSCODE) {
          setIsEnteringPassword(true);
        }
      }
    } finally {
      isAuthenticatingRef.current = false;
      setIsPrompting(false);
      // The prompt backgrounds the app on its way up; clear the timestamp it set
      // so dismissing it is not mistaken for a return from the background.
      backgroundedAtRef.current = null;
    }
  }, [revealApp]);

  /** Check a typed app password and, if it matches, hand the app over. */
  const submitPassword = useCallback(async () => {
    if (!password) return;

    setIsPrompting(true);
    const ok = await verifyAppPassword(password);
    setIsPrompting(false);

    if (!ok) {
      setPasswordError(TEXT.PASSWORD_UNLOCK_WRONG);
      return;
    }
    setPassword('');
    setPasswordError('');
    revealApp();
  }, [password, revealApp]);

  /** Everything a fresh lock has to forget. */
  const resetAttempts = useCallback(() => {
    failedScansRef.current = 0;
    setIsEnteringPassword(false);
    setPassword('');
    setPasswordError('');
  }, []);

  // Every time the screen locks, run the bar and only then offer the button.
  useEffect(() => {
    if (status !== 'locked') return;

    setIsActionReady(false);
    actionProgress.setValue(0);
    const run = Animated.timing(actionProgress, {
      toValue: 1,
      duration: ACTION_REVEAL_MS,
      // The fill animates `width`, which the native driver cannot handle.
      useNativeDriver: false,
    });
    run.start(({ finished }) => {
      if (finished) setIsActionReady(true);
    });

    return () => run.stop();
  }, [status, actionProgress]);

  // Decide on cold start, before anything of the app is shown.
  useEffect(() => {
    let cancelled = false;

    void shouldLockApp().then((locked) => {
      if (cancelled) return;
      if (!locked) {
        setStatus('unlocked');
        return;
      }
      resetAttempts();
      setStatus('locked');
      void promptUnlock();
    });

    return () => {
      cancelled = true;
    };
  }, [promptUnlock, resetAttempts]);

  // Re-lock when the app returns after more than RELOCK_AFTER_MS away; a quick
  // trip out (checking a message, a share sheet) comes straight back in. Only a
  // real `background` starts the clock — `inactive` also fires for transients
  // like the notification shade and the app switcher preview.
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'background') {
        if (!isAuthenticatingRef.current) backgroundedAtRef.current = Date.now();
        return;
      }

      if (next !== 'active') return;

      const since = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (since === null || Date.now() - since < RELOCK_AFTER_MS) return;

      void shouldLockApp().then((locked) => {
        if (!locked) return;
        // Each lock starts over: biometrics first, password only after failures.
        resetAttempts();
        resetOverlay();
        setStatus('locked');
        void promptUnlock();
      });
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [promptUnlock, resetOverlay, resetAttempts]);

  return (
    <View style={styles.root}>
      {children}

      {/* While the check runs, a plain cover — showing the lock UI here would
          flash it at everyone, including users who never turned the lock on. */}
      {status === 'checking' ? <View style={styles.cover} /> : null}

      {status === 'locked' || status === 'unlocking' ? (
        <Animated.View
          // Once the reveal starts the app below is taking over, so stop
          // swallowing touches even while the overlay fades.
          pointerEvents={status === 'unlocking' ? 'none' : 'auto'}
          style={[
            styles.overlay,
            { opacity: overlayOpacity, transform: [{ scale: overlayScale }] },
          ]}
        >
          {/* The primary fill is dark in both themes, so status-bar content
              must be light. */}
          <StatusBar style="light" />
          <View style={[styles.iconTile, status === 'unlocking' && styles.iconTileSuccess]}>
            {status === 'unlocking' ? (
              <Animated.View style={{ transform: [{ scale: tickScale }] }}>
                {/* Pomegranate, not `primary`: the latter is a pale pink in
                    dark mode and would barely read on the white tile. */}
                <Check size={48} color={c.pomegranate} strokeWidth={3} />
              </Animated.View>
            ) : (
              <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
            )}
          </View>
          <Animated.View style={[styles.prompt, { opacity: promptOpacity }]}>
            <ThemedText style={styles.title}>{TEXT.BIOMETRIC_LOCK_TITLE}</ThemedText>
            <ThemedText style={styles.description}>
              {isEnteringPassword ? TEXT.PASSWORD_UNLOCK_PROMPT : TEXT.BIOMETRIC_LOCK_DESCRIPTION}
            </ThemedText>
            {isEnteringPassword ? (
              <View style={styles.passwordForm}>
                <TextInput
                  value={password}
                  onChangeText={(next) => {
                    setPassword(next);
                    setPasswordError('');
                  }}
                  placeholder={TEXT.PASSWORD_PLACEHOLDER}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  secureTextEntry
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={() => void submitPassword()}
                  style={styles.passwordInput}
                />
                {passwordError ? (
                  <ThemedText style={styles.passwordError}>{passwordError}</ThemedText>
                ) : null}
                <Button
                  title={TEXT.PASSWORD_UNLOCK_SUBMIT}
                  variant="secondary"
                  size="lg"
                  icon="lock.open"
                  loading={isPrompting}
                  disabled={!password}
                  onPress={() => void submitPassword()}
                  style={styles.unlockButton}
                />
                {/* A wrong-fingered scan shouldn't strand anyone on the password
                    form — the scanner is one tap away again. */}
                <Button
                  title={TEXT.PASSWORD_USE_BIOMETRIC}
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setIsEnteringPassword(false);
                    setPasswordError('');
                    void promptUnlock();
                  }}
                />
              </View>
            ) : (
            /* Fixed-height slot so swapping the bar for the button doesn't
               shift the layout under it. */
            <View style={styles.actionSlot}>
              {isActionReady ? (
                <Button
                  title={TEXT.BIOMETRIC_LOCK_UNLOCK}
                  variant="secondary"
                  size="lg"
                  icon="lock.open"
                  loading={isPrompting}
                  onPress={() => void promptUnlock()}
                  style={styles.unlockButton}
                />
              ) : (
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: actionProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              )}
            </View>
            )}
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  root: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  // The app icon as a rounded tile. The artwork is red and so is the overlay,
  // so a white ring is what separates the two.
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appIcon: { width: '100%', height: '100%' },
  // Fills in solid on success so the tick reads as a confirmation.
  iconTileSuccess: { backgroundColor: c.textOnPrimary },
  prompt: { alignItems: 'center', gap: 12 },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: AppFonts.psuBold,
    color: c.textOnPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: AppFonts.psuRegular,
    color: c.textOnPrimary,
    opacity: 0.85,
    textAlign: 'center',
  },
  // Sized to the lg Button it makes way for, so neither swap moves the layout.
  actionSlot: {
    marginTop: 12,
    height: 52,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButton: { minWidth: 200 },
  progressTrack: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: c.textOnPrimary },
  passwordForm: { marginTop: 12, width: 260, alignItems: 'center', gap: 10 },
  // Sits on the primary fill, so it is styled against that rather than the
  // usual surface tokens the shared TextField assumes.
  passwordInput: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    color: c.textOnPrimary,
    fontSize: 16,
    fontFamily: AppFonts.psuRegular,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null),
  },
  passwordError: {
    alignSelf: 'stretch',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: c.textOnPrimary,
  },
});
