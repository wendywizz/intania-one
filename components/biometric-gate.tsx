import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { AppFonts } from '@/constants/fonts';
import { PasscodePad } from '@/components/passcode-pad';
import { APP_ICON } from '@/constants/images';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { PASSCODE_LENGTH, verifyAppPassword } from '@/services/appPasswordService';
import {
  authenticateWithBiometrics,
  getLockPlan,
  isBiometricUnusable,
  isCancelledAttempt,
  isRejectedScan,
  type LockPlan,
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
// Side of the icon tile, and therefore the diameter of the success circle.
const LOCK_TILE_SIZE = 96;

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
  const { user, loading: isAuthLoading } = useAuth();
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
  // What can open the lock currently up. Read inside callbacks, so it lives in a
  // ref; `hasBiometrics` mirrors it for rendering.
  const planRef = useRef<LockPlan>({ locked: false, biometrics: false, password: false });
  const [hasBiometrics, setHasBiometrics] = useState(false);
  // Set only when scanning has failed and there is no app passcode to fall back
  // on. The device passcode is then the last way in, so the next prompt offers
  // it rather than asking for a face that has already been refused.
  const needsDeviceFallbackRef = useRef(false);
  // The lock applies once per launch; see the cold-start effect below.
  const didInitialCheckRef = useRef(false);

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
      // The app passcode is the fallback, so the phone's own passcode stays out
      // of it — unless there is no app passcode, in which case it is all that's
      // left and refusing it would lock the user out of their own app.
      const { success, error } = await authenticateWithBiometrics(
        TEXT.BIOMETRIC_LOCK_PROMPT,
        TEXT.BIOMETRIC_LOCK_CANCEL,
        { allowDeviceFallback: needsDeviceFallbackRef.current },
      );
      if (success) {
        revealApp();
      } else if (!isCancelledAttempt(error)) {
        // Only a scan the sensor actually rejected counts against the user.
        // Codes like 'not_available' or 'unknown' mean the OS never showed the
        // prompt — counting those would burn through the attempts without the
        // user ever being asked for a face or finger.
        if (isRejectedScan(error)) failedScansRef.current += 1;

        // Out of scans, or biometrics are unusable: hand over to the app's own
        // passcode, or — when there isn't one — let the next prompt offer the
        // device passcode.
        if (isBiometricUnusable(error) || failedScansRef.current >= SCANS_BEFORE_PASSCODE) {
          if (planRef.current.password) setIsEnteringPassword(true);
          else needsDeviceFallbackRef.current = true;
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

  // The keypad has no submit button: the passcode is checked the moment its
  // last digit lands, the way the OS does it.
  useEffect(() => {
    if (!isEnteringPassword || password.length !== PASSCODE_LENGTH) return;

    let cancelled = false;
    void verifyAppPassword(password).then((ok) => {
      if (cancelled) return;
      setPassword('');
      if (ok) {
        setPasswordError('');
        revealApp();
        return;
      }
      setPasswordError(TEXT.PASSCODE_UNLOCK_WRONG);
    });

    return () => {
      cancelled = true;
    };
  }, [password, isEnteringPassword, revealApp]);

  /**
   * Puts a fresh lock up. Nothing is asked for yet: both routes begin at the
   * unlock button, and pressing it is what starts the check.
   */
  const startLock = useCallback((plan: LockPlan) => {
    planRef.current = plan;
    failedScansRef.current = 0;
    needsDeviceFallbackRef.current = false;
    setPassword('');
    setPasswordError('');
    setHasBiometrics(plan.biometrics);
    setIsEnteringPassword(false);
    setStatus('locked');
  }, []);

  /**
   * The unlock button. Biometrics on: scan first, and the keypad only appears
   * once SCANS_BEFORE_PASSCODE scans have been rejected. Biometrics off: the
   * keypad straight away.
   */
  const handleUnlockPress = useCallback(() => {
    if (planRef.current.biometrics) void promptUnlock();
    else setIsEnteringPassword(true);
  }, [promptUnlock]);

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
    // Auth is still resolving: the plain cover stays up rather than guessing.
    if (isAuthLoading) return;
    // Only ever decided once per launch. Without this guard, signing in would
    // change `user` and re-run the check, throwing the lock screen up over the
    // app the moment the user finished authenticating.
    if (didInitialCheckRef.current) return;
    didInitialCheckRef.current = true;

    // Nobody signed in: there is nothing behind the lock to protect, and the
    // passcode belongs to an account rather than to the device.
    if (!user) {
      setStatus('unlocked');
      return;
    }

    let cancelled = false;

    void getLockPlan().then((plan) => {
      if (cancelled) return;
      if (!plan.locked) {
        setStatus('unlocked');
        return;
      }
      startLock(plan);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user, startLock]);

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
      // Signed out while away — including by logging out — leaves nothing to
      // lock, so coming back must not put the lock screen up.
      if (!user) return;

      // Re-read the plan rather than reusing the last one: the user may have
      // just come back from changing these very settings.
      void getLockPlan().then((plan) => {
        if (!plan.locked) return;
        // Each lock starts over: biometrics first, password only after failures.
        resetOverlay();
        startLock(plan);
      });
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [resetOverlay, startLock, user]);

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
          {/* The whole lock UI fades out as one, so the tick that replaces it can
              sit dead centre instead of wherever the icon happened to be — the
              passcode keypad makes this column tall and pushes it well above
              the middle of the screen. */}
          <Animated.View style={[styles.lockContent, { opacity: promptOpacity }]}>
          <View style={styles.iconTile}>
            <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
          </View>
          <View style={styles.prompt}>
            <ThemedText style={styles.title}>{TEXT.BIOMETRIC_LOCK_TITLE}</ThemedText>
            <ThemedText style={styles.description}>
              {isEnteringPassword ? TEXT.PASSCODE_UNLOCK_PROMPT : TEXT.BIOMETRIC_LOCK_DESCRIPTION}
            </ThemedText>
            {isEnteringPassword ? (
              <View style={styles.passcodeForm}>
                {passwordError ? (
                  <ThemedText style={styles.passcodeError}>{passwordError}</ThemedText>
                ) : null}
                <PasscodePad value={password} onChange={setPassword} onPrimary />
                {/* A scan that won't read shouldn't strand anyone on the keypad —
                    the scanner is one tap away again. Hidden when biometrics is
                    off or unavailable: there would be nothing to go back to. Not
                    the shared Button: its ghost variant paints text in
                    `primary`, which is the colour of this very overlay. */}
                {hasBiometrics ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setIsEnteringPassword(false);
                      setPassword('');
                      setPasswordError('');
                      void promptUnlock();
                    }}
                    style={({ pressed }) => [styles.biometricLink, pressed && { opacity: 0.6 }]}
                  >
                    <ThemedText style={styles.biometricLinkText}>
                      {TEXT.PASSCODE_USE_BIOMETRIC}
                    </ThemedText>
                  </Pressable>
                ) : null}
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
                  onPress={handleUnlockPress}
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
          </View>
          </Animated.View>

          {/* Springs in at the centre of the screen, independent of the column
              above, which is already on its way out. */}
          {status === 'unlocking' ? (
            <View pointerEvents="none" style={styles.successCenter}>
              <Animated.View
                style={[
                  styles.iconTile,
                  styles.iconTileSuccess,
                  { transform: [{ scale: tickScale }] },
                ]}
              >
                {/* Pomegranate, not `primary`: the latter is a pale pink in dark
                    mode and would barely read on the white tile. */}
                <Check size={48} color={c.pomegranate} strokeWidth={3} />
              </Animated.View>
            </View>
          ) : null}
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
  lockContent: { alignItems: 'center', gap: 12 },
  // Ignores the column's layout entirely so the tick lands mid-screen whether
  // the lock showed a button or a full keypad.
  successCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The app icon as a rounded tile. The artwork is red and so is the overlay,
  // so a white ring is what separates the two.
  iconTile: {
    width: LOCK_TILE_SIZE,
    height: LOCK_TILE_SIZE,
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
  // Fills in solid on success so the tick reads as a confirmation, and rounds
  // all the way to a circle — the icon's squircle belongs to the app's artwork,
  // the confirmation is its own mark.
  iconTileSuccess: {
    backgroundColor: c.textOnPrimary,
    borderRadius: LOCK_TILE_SIZE / 2,
  },
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
  passcodeForm: { marginTop: 16, alignItems: 'center', gap: 20 },
  passcodeError: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textOnPrimary,
    textAlign: 'center',
  },
  biometricLink: { paddingVertical: 8, paddingHorizontal: 16 },
  biometricLinkText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
    color: c.textOnPrimary,
  },
});
