import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  FACE_SCAN_SUPPORTED,
  FaceScanCamera,
  useFaceScanPermission,
  type FaceScanCameraHandle,
} from '@/components/timestamp/face-scan-camera';
import { SavingDots } from '@/components/timestamp/saving-dots';
import { FRAMING_HINT } from '@/components/timestamp/face-framing-hint';
import { useToast } from '@/components/toast-provider';
import { Button, IconSymbol } from '@/components/ui';
import { TipAlert } from '@/components/ui/tip-alert';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { MESSAGE_CANNOT_CONNECT_TO_SERVER } from '@/services/api';
import {
  getStaffTimestampStatus,
  STAFF_ENROLL_RETRY_REASONS,
  submitStaffFaceEnroll,
  type StaffFaceEnrollMode,
  type StaffTimestampStatus,
} from '@/services/timestampService';
import { guideOval, type FramingVerdict } from '@/utils/face-framing';
import { scaleFont } from '@/utils/font-scale';

/** At most one picture taken per this many ms; the gateway has its own floor too. */
const MIN_SHOT_GAP_MS = 1500;

/**
 *   intro    what is about to happen, and the button that starts it
 *   camera   front camera on: one frontal picture per blink, two in all
 *   done     both pictures are registered
 */
type Step = 'intro' | 'camera' | 'done';

/**
 * Register the person's own face for the stamping scan - the first time, or
 * again to replace a face that never matches. Reached from Settings, and from
 * the stamp screen's "ลงทะเบียนใบหน้า" button.
 *
 * Deliberately knows nothing of where the phone is or which network it is on:
 * those rules belong to stamping, and a registration is a different act. It
 * reads only the face-registry state and the quota, takes two pictures, and
 * hands them to the gateway, which decides everything else.
 */
export default function FaceEnrollScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const isFocused = useIsFocused();
  const { hasPermission, canRequestPermission, requestPermission } = useFaceScanPermission();

  const [status, setStatus] = useState<StaffTimestampStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('intro');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [framing, setFraming] = useState<FramingVerdict>('none');
  const [shots, setShots] = useState(0);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  // What the last attempt came to, said on the intro when it ended the attempt.
  const [outcome, setOutcome] = useState('');
  const [doneMessage, setDoneMessage] = useState('');
  const [scanSize, setScanSize] = useState({ width: 0, height: 0 });

  const cameraRef = useRef<FaceScanCameraHandle>(null);
  const modeRef = useRef<StaffFaceEnrollMode>('first');
  const shotsRef = useRef<string[]>([]);
  const busyRef = useRef(false);
  const lastShotAtRef = useRef(0);
  const stepRef = useRef(step);
  stepRef.current = step;
  const permissionAskedRef = useRef(false);

  const mode: StaffFaceEnrollMode = status?.faceRegistered ? 'renew' : 'first';
  modeRef.current = mode;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setStatus(await getStaffTimestampStatus(staffId));
    } catch (err) {
      setError(err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));

    return () => subscription.remove();
  }, []);

  // Ask for the camera once, when the camera is first wanted. After a refusal
  // the OS will not ask again, and the notice below points to Settings instead.
  useEffect(() => {
    if (step !== 'camera' || hasPermission || !canRequestPermission || permissionAskedRef.current) return;
    permissionAskedRef.current = true;
    void requestPermission();
  }, [step, hasPermission, canRequestPermission, requestPermission]);

  // Android's back gesture closes the camera rather than the whole screen.
  useEffect(() => {
    if (step !== 'camera') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep('intro');
      return true;
    });

    return () => subscription.remove();
  }, [step]);

  const startCamera = useCallback(() => {
    shotsRef.current = [];
    lastShotAtRef.current = 0;
    setShots(0);
    setMessage('');
    setOutcome('');
    setFraming('none');
    setStep('camera');
  }, []);

  /**
   * One blink: one picture. The second sends both. A refusal the person can fix
   * by trying again (no face, the two did not match) keeps the camera on for a
   * fresh pair; any other ends the attempt.
   */
  const onBlink = useCallback(() => {
    const startedAt = Date.now();
    if (stepRef.current !== 'camera' || busyRef.current || startedAt - lastShotAtRef.current < MIN_SHOT_GAP_MS) {
      return;
    }

    busyRef.current = true;
    lastShotAtRef.current = startedAt;

    void (async () => {
      try {
        const photoUri = await cameraRef.current?.capture();
        if (!photoUri) return;

        const taken = [...shotsRef.current, photoUri];
        shotsRef.current = taken;
        setShots(taken.length);
        if (taken.length === 1) setMessage('');
        if (taken.length < 2) return;

        setChecking(true);
        const result = await submitStaffFaceEnroll({
          staffId,
          mode: modeRef.current,
          photoUris: [taken[0], taken[1]],
        });

        shotsRef.current = [];
        setShots(0);
        setStatus((previous) =>
          previous && result.remaining != null
            ? { ...previous, faceEnroll: { ...previous.faceEnroll, remaining: result.remaining } }
            : previous,
        );

        if (result.enrolled) {
          setDoneMessage(result.message);
          setStep('done');
          showToast(result.message, 'success');
          return;
        }

        if (STAFF_ENROLL_RETRY_REASONS.includes(result.reason)) {
          setMessage(result.message);
          return;
        }

        setOutcome(result.message);
        setStep('intro');
        showToast(result.message, 'error');
      } catch (err) {
        const text = err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER;
        shotsRef.current = [];
        setShots(0);
        setOutcome(text);
        setStep('intro');
        showToast(text, 'error');
      } finally {
        busyRef.current = false;
        setChecking(false);
      }
    })();
  }, [staffId, showToast]);

  const onFramingChange = useCallback((next: FramingVerdict) => setFraming(next), []);

  const onCameraError = useCallback(
    (text: string) => {
      showToast(text, 'error');
      setOutcome(text);
      setStep('intro');
    },
    [showToast],
  );

  const renderCamera = () => {
    const okHint = TEXT.STAFF_FACE_ENROLL_HINT_BLINK.replace('{i}', String(Math.min(shots + 1, 2)));
    const hint = checking
      ? TEXT.STAFF_FACE_ENROLL_SAVING
      : framing === 'ok'
        ? message || okHint
        : FRAMING_HINT[framing];
    const ringColor = checking ? c.primary : framing === 'ok' ? c.success : c.textOnPrimary;

    // Just under the oval - the same oval the mask draws - once the surface has
    // been measured; until then at the foot of the screen, which is one frame.
    const oval = scanSize.height > 0 ? guideOval(scanSize) : null;
    const hintPlacement = oval
      ? { top: Math.min(oval.cy + oval.ry + 20, scanSize.height - 136) }
      : { bottom: insets.bottom + 28 };

    return (
      <View
        style={styles.scanner}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setScanSize((size) => (size.width === width && size.height === height ? size : { width, height }));
        }}
      >
        <FaceScanCamera
          ref={cameraRef}
          active={isFocused && appActive}
          requireFrontal
          ringColor={ringColor}
          scrimColor={c.overlay}
          onFramingChange={onFramingChange}
          onBlink={onBlink}
          onError={onCameraError}
        />

        <View style={[styles.hintBar, hintPlacement]} pointerEvents="none">
          <ThemedText style={styles.hintText}>{hint}</ThemedText>
          {checking ? (
            <View style={styles.dotsPlate}>
              <SavingDots color={c.textOnPrimary} />
            </View>
          ) : (
            <ThemedText style={styles.bareText}>{TEXT.STAFF_FACE_BARE_FACE}</ThemedText>
          )}
        </View>

        <View style={[styles.scanTopBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityLabel={TEXT.STAFF_FACE_CLOSE}
            accessibilityRole="button"
            hitSlop={12}
            style={styles.scanClose}
            onPress={() => setStep('intro')}
          >
            <IconSymbol size={22} name="xmark" color={c.textOnPrimary} />
          </Pressable>

          <View style={styles.pill} pointerEvents="none">
            <ThemedText style={styles.pillText}>{`${Math.min(shots + 1, 2)}/2`}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  /** The camera is wanted but the OS has not allowed it. */
  const renderPermissionNotice = () => (
    <View style={styles.notice}>
      <View style={styles.noticeHeader}>
        <IconSymbol size={20} name="eye" color={c.warningOnSoft} />
        <ThemedText style={styles.noticeTitle}>{TEXT.STAFF_FACE_CAMERA_TITLE}</ThemedText>
      </View>
      <ThemedText style={styles.noticeMessage}>
        {canRequestPermission ? TEXT.STAFF_FACE_CAMERA_DENIED : TEXT.STAFF_FACE_CAMERA_BLOCKED}
      </ThemedText>
      <Button
        title={canRequestPermission ? TEXT.STAFF_FACE_CAMERA_ALLOW : TEXT.SETTINGS_OPEN_OS_SETTINGS}
        icon={canRequestPermission ? 'eye' : 'gearshape.fill'}
        variant="primaryOutline"
        size="md"
        fullWidth
        onPress={() => {
          if (canRequestPermission) {
            void requestPermission();
          } else {
            void Linking.openSettings();
          }
        }}
      />
    </View>
  );

  const renderBody = () => {
    if (!FACE_SCAN_SUPPORTED) {
      return <TipAlert message={TEXT.STAFF_FACE_WEB_ONLY} />;
    }

    if (loading) {
      return (
        <View style={styles.centered}>
          <LoadingAnimate fill={false} />
        </View>
      );
    }

    if (error) {
      return (
        <ErrorState
          variant="error"
          title={TEXT.STAFF_TIMESTAMP_LOAD_ERROR}
          message={error}
          onRetry={() => void load()}
          onBack={() => router.back()}
        />
      );
    }

    if (!status?.isStaff) {
      return <TipAlert message={TEXT.FACE_ENROLL_NOT_STAFF} />;
    }

    if (step === 'done') {
      return (
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: c.successSoft }]}>
            <IconSymbol size={32} name="checkmark.circle.fill" color={c.success} />
          </View>
          <ThemedText style={styles.cardTitle}>{TEXT.FACE_ENROLL_DONE_TITLE}</ThemedText>
          <ThemedText style={styles.cardMessage}>{doneMessage}</ThemedText>
          <Button title={TEXT.FACE_ENROLL_DONE_BUTTON} size="lg" fullWidth onPress={() => router.back()} />
        </View>
      );
    }

    // The registry could not be read, so first or renew is unknown: say so
    // rather than guess - the wrong one is refused by the gateway anyway.
    if (status.faceRegistered === null) {
      return (
        <ErrorState
          variant="error"
          title={TEXT.STAFF_TIMESTAMP_LOAD_ERROR}
          message={TEXT.FACE_ENROLL_REGISTRY_UNREADABLE}
          onRetry={() => void load()}
          onBack={() => router.back()}
        />
      );
    }

    const exhausted = status.faceEnroll.remaining === 0;

    return (
      <View style={styles.card}>
        <View style={[styles.badge, { backgroundColor: c.infoSoft }]}>
          <IconSymbol size={32} name="faceid" color={c.info} />
        </View>
        <ThemedText style={styles.cardTitle}>
          {mode === 'renew' ? TEXT.STAFF_FACE_RENEW_START : TEXT.STAFF_FACE_ENROLL_START}
        </ThemedText>
        <ThemedText style={styles.cardMessage}>
          {mode === 'renew' ? TEXT.STAFF_FACE_RENEW_CONFIRM : TEXT.STAFF_FACE_ENROLL_CONFIRM}
        </ThemedText>

        <View style={styles.tips}>
          <ThemedText style={styles.tipsTitle}>{TEXT.STAFF_FACE_ENROLL_TIPS_TITLE}</ThemedText>
          {TEXT.STAFF_FACE_ENROLL_TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </View>

        {outcome ? <TipAlert message={outcome} /> : null}
        {exhausted ? <TipAlert message={TEXT.STAFF_FACE_ENROLL_NO_QUOTA} /> : null}

        <Button
          title={TEXT.STAFF_FACE_ENROLL_BEGIN}
          icon="faceid"
          size="lg"
          fullWidth
          disabled={exhausted}
          onPress={startCamera}
        />
      </View>
    );
  };

  const showCamera = FACE_SCAN_SUPPORTED && step === 'camera' && hasPermission;

  return (
    <ThemedView style={styles.container} lightColor={c.background} darkColor={c.background}>
      <StatusBar style="light" />
      {showCamera ? (
        renderCamera()
      ) : (
        <>
          <NavTopBar title={TEXT.SETTINGS_FACE_TITLE} tone="primary" showHomeButton={false} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {FACE_SCAN_SUPPORTED && step === 'camera' && !hasPermission ? renderPermissionNotice() : renderBody()}
          </ScrollView>
        </>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { flexGrow: 1, gap: 12, justifyContent: 'center', padding: 16 },
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    card: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      boxShadow: boxShadow(c.shadow, { y: 1, blur: 6, opacity: 0.04 }),
      gap: 14,
      padding: 20,
    },
    badge: {
      alignItems: 'center',
      borderRadius: 32,
      height: 64,
      justifyContent: 'center',
      width: 64,
    },
    cardTitle: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(20),
      lineHeight: scaleFont(28),
      textAlign: 'center',
    },
    cardMessage: {
      alignSelf: 'stretch',
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(22),
      textAlign: 'center',
    },
    tips: {
      alignSelf: 'stretch',
      backgroundColor: c.infoSoft,
      borderRadius: 12,
      gap: 6,
      padding: 14,
    },
    tipsTitle: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
    },
    tipRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    tipDot: { backgroundColor: c.info, borderRadius: 3, height: 6, width: 6 },
    tipText: {
      color: c.text,
      flex: 1,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
    },
    notice: {
      alignSelf: 'stretch',
      backgroundColor: c.warningSoft,
      borderColor: c.border,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 10,
      padding: 16,
    },
    noticeHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    noticeTitle: {
      color: c.warningOnSoft,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
    },
    noticeMessage: {
      color: c.text,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
    },
    scanner: { backgroundColor: c.inverse, flex: 1 },
    scanTopBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      left: 0,
      paddingHorizontal: 16,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    scanClose: {
      alignItems: 'center',
      backgroundColor: c.overlay,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    pill: {
      backgroundColor: c.overlay,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(12),
      lineHeight: scaleFont(17),
    },
    hintBar: {
      alignItems: 'center',
      gap: 8,
      left: 16,
      position: 'absolute',
      right: 16,
    },
    hintText: {
      backgroundColor: c.overlay,
      borderRadius: 999,
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
      overflow: 'hidden',
      paddingHorizontal: 14,
      paddingVertical: 6,
      textAlign: 'center',
    },
    dotsPlate: {
      backgroundColor: c.overlay,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    bareText: {
      backgroundColor: c.overlay,
      borderRadius: 999,
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(19),
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 4,
      textAlign: 'center',
    },
  });
