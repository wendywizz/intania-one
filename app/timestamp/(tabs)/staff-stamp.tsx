import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  FACE_SCAN_SUPPORTED,
  FaceScanCamera,
  useFaceScanPermission,
  type FaceScanCameraHandle,
} from '@/components/timestamp/face-scan-camera';
import { LocationNoticeBanner } from '@/components/timestamp/location-notice';
import { useToast } from '@/components/toast-provider';
import { Button, ConfirmDialog, IconSymbol, type IconSymbolName } from '@/components/ui';
import { TipAlert } from '@/components/ui/tip-alert';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { MESSAGE_CANNOT_CONNECT_TO_SERVER } from '@/services/api';
import { readDevicePosition, type LocationReading } from '@/services/deviceLocation';
import {
  getStaffTimestampStatus,
  submitStaffFaceStamp,
  type StaffTimestampStatus,
} from '@/services/timestampService';
import { formatFullDate, formatWeekday } from '@/utils/date-format';
import type { FramingVerdict } from '@/utils/face-framing';
import { scaleFont } from '@/utils/font-scale';

/** At most one scan sent per this many ms. The gateway has its own floor too. */
const MIN_SCAN_GAP_MS = 1500;

/** Scanning pauses after this long without a stamp, until the person asks again. */
const SCAN_WINDOW_MS = 30000;

/** A position older than this is read again before a scan is sent. */
const POSITION_MAX_AGE_MS = 60000;

/**
 * Refusals that are facts about the day. Shown as a modal when the screen opens
 * — "you already stamped in", "not a stamping window" — so opening the tab
 * answers the question straight away. The network and location refusals are
 * not here: they are fixed by doing something, and the card and the location
 * banner say what.
 */
const DAY_NOTICE_REASONS = new Set([
  'already_in',
  'already_complete',
  'outside_hours',
  'weekend',
  'on_travel',
  'irregular_record',
]);

const FRAMING_HINT: Record<FramingVerdict, string> = {
  ok: TEXT.STAFF_FACE_HINT_BLINK,
  none: TEXT.STAFF_FACE_HINT_NONE,
  many: TEXT.STAFF_FACE_HINT_MANY,
  off_center: TEXT.STAFF_FACE_HINT_OFF_CENTER,
  too_far: TEXT.STAFF_FACE_HINT_TOO_FAR,
  too_close: TEXT.STAFF_FACE_HINT_TOO_CLOSE,
};

/**
 *   idle      nothing to scan for (or the person declined to)
 *   confirm   an unusual stamp is waiting for a yes before the camera opens
 *   scanning  camera on, sending a picture on each blink
 *   paused    30 s without a stamp, or an error — camera off until asked again
 *   done      a matched face got its answer; the card shows it
 */
type Phase = 'idle' | 'confirm' | 'scanning' | 'paused' | 'done';

type Notice = { title: string; message: string; icon: IconSymbolName };

/** 'วันศุกร์ 04 กันยายน 2569' — the shared helpers, which put the year in B.E. */
function thaiDateLabel(date: string) {
  if (!date) return '';

  const weekday = formatWeekday(date);
  const full = formatFullDate(date);

  return weekday ? `วัน${weekday} ${full}` : full;
}

/** '07:01:12' -> '07:01'. Empty stays empty. */
function hhmm(time: string) {
  return time ? time.slice(0, 5) : '';
}

/**
 * ลงเวลาบุคลากรทั่วไป — today's arrival and departure, and a face scan to stamp.
 *
 * A different screen from the lecturers' because it is a different working day:
 * general staff arrive and leave as separate events at their real times, inside
 * windows the personnel system cuts the day into.
 *
 * Opening the tab reads where the phone is and today's status together. When a
 * stamp would be accepted the front camera starts on its own — after asking
 * first for the three unusual stamps — and every blink of a well-placed face
 * sends one picture. The gateway decides everything that matters: whose face it
 * is, whether it may stamp, and what the stamp records. This screen only frames
 * the face, waits for the blink, and shows the answer.
 */
export default function StaffTimestampScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const isFocused = useIsFocused();
  const { hasPermission, canRequestPermission, requestPermission } = useFaceScanPermission();

  const [status, setStatus] = useState<StaffTimestampStatus | null>(null);
  const [location, setLocation] = useState<LocationReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [framing, setFraming] = useState<FramingVerdict>('none');
  const [checking, setChecking] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  const cameraRef = useRef<FaceScanCameraHandle>(null);
  // Read by the blink handler, which must stay stable so the camera pipeline is
  // not rebuilt — see face-scan-camera.native.tsx.
  const statusRef = useRef(status);
  statusRef.current = status;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const positionRef = useRef<{ reading: LocationReading | null; at: number }>({ reading: null, at: 0 });
  const busyRef = useRef(false);
  const lastSubmitAtRef = useRef(0);
  const scanStartedAtRef = useRef(0);
  const announcedRef = useRef(false);
  const permissionAskedRef = useRef(false);

  const startScanning = useCallback(() => {
    scanStartedAtRef.current = Date.now();
    lastSubmitAtRef.current = 0;
    setSimilarity(null);
    setScanMessage('');
    setFraming('none');
    setPhase('scanning');
  }, []);

  /** What the screen does with a fresh status. */
  const decide = useCallback(
    (next: StaffTimestampStatus, announce: boolean) => {
      if (!FACE_SCAN_SUPPORTED || !next.isStaff || next.faceRegistered === false) {
        setPhase('idle');
        return;
      }

      if (!next.canStamp) {
        setPhase('idle');
        if (announce && DAY_NOTICE_REASONS.has(next.reason)) {
          setNotice({
            title: TEXT.STAFF_TIMESTAMP_NOTICE_TITLE,
            message: next.message,
            icon: next.reason === 'already_complete' ? 'checkmark.circle.fill' : 'info.circle.fill',
          });
        }
        return;
      }

      if (next.needsConfirm) {
        setPhase('confirm');
        return;
      }

      startScanning();
    },
    [startScanning],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);

      try {
        // Position first and sent with the status, so the screen shows the same
        // verdict a scan would get.
        const reading = await readDevicePosition();
        positionRef.current = { reading, at: Date.now() };
        setLocation(reading);

        const next = await getStaffTimestampStatus(staffId, reading.position);
        setStatus(next);
        setError('');

        // The day's state is announced once per visit to the tab; a refresh
        // shows it in the card instead of raising the modal again.
        decide(next, !announcedRef.current);
        announcedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER);
        setPhase('idle');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staffId, decide],
  );

  useFocusEffect(
    useCallback(() => {
      announcedRef.current = false;
      void load('initial');

      // Returning from Settings (camera or location) is not a focus change, so
      // it is watched for here; leaving the app also turns the camera off.
      const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
        setAppActive(next === 'active');
        if (next === 'active') void load('refresh');
      });

      return () => {
        subscription.remove();
        setPhase('idle');
      };
    }, [load]),
  );

  // Ask for the camera once, when scanning first needs it. After a refusal the
  // OS will not ask again and the banner below points to Settings instead.
  useEffect(() => {
    if (phase !== 'scanning' || hasPermission || !canRequestPermission || permissionAskedRef.current) return;
    permissionAskedRef.current = true;
    void requestPermission();
  }, [phase, hasPermission, canRequestPermission, requestPermission]);

  // Pause after SCAN_WINDOW_MS without a stamp. A scan in flight at that moment
  // finishes first — see the end of onBlink.
  useEffect(() => {
    if (phase !== 'scanning') return;

    const remaining = Math.max(0, scanStartedAtRef.current + SCAN_WINDOW_MS - Date.now());
    const timer = setTimeout(() => {
      if (phaseRef.current === 'scanning' && !busyRef.current) setPhase('paused');
    }, remaining);

    return () => clearTimeout(timer);
  }, [phase]);

  const onFramingChange = useCallback((next: FramingVerdict) => setFraming(next), []);

  const onCameraError = useCallback(
    (message: string) => {
      showToast(message, 'error');
      setPhase('paused');
    },
    [showToast],
  );

  const onBlink = useCallback(() => {
    const current = statusRef.current;
    if (phaseRef.current !== 'scanning' || busyRef.current || !current?.stampKind) return;

    const startedAt = Date.now();
    if (startedAt - lastSubmitAtRef.current < MIN_SCAN_GAP_MS) return;

    busyRef.current = true;
    lastSubmitAtRef.current = startedAt;
    setChecking(true);

    void (async () => {
      let settled = false;

      try {
        let { reading } = positionRef.current;
        if (!reading || reading.outcome !== 'ok' || Date.now() - positionRef.current.at > POSITION_MAX_AGE_MS) {
          reading = await readDevicePosition();
          positionRef.current = { reading, at: Date.now() };
          setLocation(reading);
        }

        const photoUri = await cameraRef.current?.capture();
        if (!photoUri) return;

        const result = await submitStaffFaceStamp({
          staffId,
          photoUri,
          expectKind: current.stampKind,
          position: reading.position,
        });

        setSimilarity(result.similarity);

        if (!result.passed) {
          // Not this person's face, or no face at all: keep scanning.
          setScanMessage(result.message);
          return;
        }

        // The face matched. Whatever the attendance rules said next is this
        // scan's final answer, so the camera stops either way.
        settled = true;
        setPhase('done');
        if (result.status) {
          setStatus({ ...result.status, faceRegistered: current.faceRegistered });
        }

        if (result.created) {
          setNotice({ title: TEXT.STAFF_FACE_RESULT_STAMPED, message: result.message, icon: 'checkmark.circle.fill' });
        } else if (result.dryRun && result.status?.canStamp) {
          setNotice({ title: TEXT.STAFF_FACE_RESULT_DRY_RUN, message: result.message, icon: 'info.circle.fill' });
        } else {
          setNotice({ title: TEXT.STAFF_FACE_RESULT_REFUSED, message: result.message, icon: 'exclamationmark.triangle.fill' });
        }
      } catch (err) {
        settled = true;
        showToast(err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER, 'error');
        setPhase('paused');
      } finally {
        busyRef.current = false;
        setChecking(false);
        if (!settled && Date.now() - scanStartedAtRef.current > SCAN_WINDOW_MS) {
          setPhase('paused');
        }
      }
    })();
  }, [staffId, showToast]);

  const cameraActive = isFocused && appActive && phase === 'scanning' && hasPermission;

  const renderScanner = () => {
    if (!status?.isStaff) return null;

    if (!FACE_SCAN_SUPPORTED) {
      return <TipAlert message={TEXT.STAFF_FACE_WEB_ONLY} />;
    }

    if (status.faceRegistered === false) {
      return <TipAlert title={TEXT.STAFF_FACE_NOT_REGISTERED_TITLE} message={TEXT.STAFF_FACE_NOT_REGISTERED} />;
    }

    if (phase !== 'scanning' && phase !== 'paused') return null;

    if (!hasPermission) {
      return (
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
    }

    const hint = checking
      ? TEXT.STAFF_FACE_CHECKING
      : framing === 'ok' && scanMessage
        ? scanMessage
        : FRAMING_HINT[framing];

    const ringColor = checking ? c.primary : framing === 'ok' ? c.success : c.textOnPrimary;

    return (
      <View style={styles.scanner}>
        <FaceScanCamera
          ref={cameraRef}
          active={cameraActive}
          ringColor={ringColor}
          scrimColor={c.overlay}
          onFramingChange={onFramingChange}
          onBlink={onBlink}
          onError={onCameraError}
        />

        {/* Deliberately small and in a corner: a number to glance at, not the
            thing to watch while scanning. */}
        <View style={styles.similarityPill} pointerEvents="none">
          <ThemedText style={styles.similarityText}>
            {`${TEXT.STAFF_FACE_SIMILARITY} ${similarity == null ? '—' : `${similarity}%`}`}
          </ThemedText>
        </View>

        <View style={styles.hintBar} pointerEvents="none">
          <ThemedText style={styles.hintText}>{hint}</ThemedText>
        </View>

        {phase === 'paused' ? (
          <View style={styles.pausedCover}>
            <IconSymbol size={36} name="clock.fill" color={c.textOnPrimary} />
            <ThemedText style={styles.pausedText}>{TEXT.STAFF_FACE_PAUSED}</ThemedText>
            <Button
              title={TEXT.STAFF_FACE_SCAN_AGAIN}
              icon="arrow.triangle.2.circlepath"
              size="md"
              loading={refreshing}
              onPress={() => void load('refresh')}
            />
          </View>
        ) : null}
      </View>
    );
  };

  const renderBody = () => {
    if (loading) {
      return <LoadingAnimate />;
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.STAFF_TIMESTAMP_LOAD_ERROR}
          message={error}
          onRetry={() => {
            setLoading(true);
            void load('initial');
          }}
        />
      );
    }

    const stamp = status?.stamp ?? null;
    const inTime = hhmm(stamp?.inTime ?? '');
    const outTime = hhmm(stamp?.outTime ?? '');
    const isLate = stamp?.isLate === true;
    const complete = Boolean(inTime) && Boolean(outTime);

    // A stamp is possible but the camera is not running — the person declined
    // the confirmation, or the scan finished without stamping. Offer to start.
    const canStartScan =
      FACE_SCAN_SUPPORTED &&
      status?.canStamp === true &&
      status.faceRegistered !== false &&
      (phase === 'idle' || phase === 'done');

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} />
        }
      >
        <LocationNoticeBanner reading={location} retrying={refreshing} onRetry={() => void load('refresh')} />

        {renderScanner()}

        <View style={styles.card}>
          <View
            style={[
              styles.medallion,
              { backgroundColor: complete ? `${c.success}1A` : `${c.textMuted}1A` },
            ]}
          >
            <IconSymbol
              size={44}
              name={complete ? 'checkmark.circle.fill' : 'clock.fill'}
              color={complete ? c.success : c.textMuted}
            />
          </View>

          <ThemedText style={styles.date}>{thaiDateLabel(status?.serverDate ?? '')}</ThemedText>

          {/* Arrival and departure side by side: the pair is one fact — the
              shape of the day. A dash for a half that has not happened. */}
          <View style={styles.times}>
            <View style={styles.timeCol}>
              <ThemedText style={styles.timeLabel}>{TEXT.STAFF_TIMESTAMP_IN_LABEL}</ThemedText>
              <ThemedText style={[styles.timeValue, isLate ? styles.timeLate : null]}>
                {inTime || '—'}
              </ThemedText>
              {isLate ? <ThemedText style={styles.lateBadge}>{TEXT.STAFF_TIMESTAMP_LATE}</ThemedText> : null}
            </View>

            <View style={styles.timeDivider} />

            <View style={styles.timeCol}>
              <ThemedText style={styles.timeLabel}>{TEXT.STAFF_TIMESTAMP_OUT_LABEL}</ThemedText>
              <ThemedText style={styles.timeValue}>{outTime || '—'}</ThemedText>
            </View>
          </View>

          {/* The gateway's own sentence — what a scan would record, or why
              stamping is refused right now. */}
          {status?.message ? <ThemedText style={styles.reason}>{status.message}</ThemedText> : null}

          {canStartScan ? (
            <>
              <View style={styles.divider} />
              <Button
                title={TEXT.STAFF_FACE_START}
                icon="log-in"
                size="lg"
                fullWidth
                onPress={() => (status?.needsConfirm ? setPhase('confirm') : startScanning())}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.STAFF_TIMESTAMP_TAB} backHref="/" titleInNavBar showHomeButton={false} />
      <View style={styles.content}>{renderBody()}</View>

      <ConfirmDialog
        visible={phase === 'confirm' && isFocused}
        title={TEXT.STAFF_FACE_CONFIRM_TITLE}
        message={status?.confirmMessage}
        confirmLabel={TEXT.STAFF_FACE_CONFIRM_SCAN}
        icon="clock.fill"
        onConfirm={startScanning}
        onCancel={() => setPhase('idle')}
      />

      <ConfirmDialog
        visible={notice !== null && isFocused}
        title={notice?.title ?? ''}
        message={notice?.message}
        confirmLabel={TEXT.SHARED_OK}
        icon={notice?.icon}
        hideCancel
        onConfirm={() => setNotice(null)}
        onCancel={() => setNotice(null)}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      gap: 12,
      justifyContent: 'center',
      padding: 16,
    },
    scanner: {
      alignSelf: 'stretch',
      aspectRatio: 3 / 4,
      backgroundColor: c.inverse,
      borderRadius: 16,
      overflow: 'hidden',
    },
    similarityPill: {
      backgroundColor: c.overlay,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      position: 'absolute',
      right: 10,
      top: 10,
    },
    similarityText: {
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(12),
    },
    hintBar: {
      alignItems: 'center',
      bottom: 16,
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
      overflow: 'hidden',
      paddingHorizontal: 14,
      paddingVertical: 6,
      textAlign: 'center',
    },
    pausedCover: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      backgroundColor: c.overlay,
      gap: 12,
      justifyContent: 'center',
      padding: 24,
    },
    pausedText: {
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(17),
      textAlign: 'center',
    },
    // Same advisory look as the location banner, for the camera permission.
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
    },
    noticeMessage: {
      color: c.text,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
    },
    card: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: c.surface,
      borderRadius: 16,
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 28,
      boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
    },
    medallion: {
      alignItems: 'center',
      borderRadius: 44,
      height: 88,
      justifyContent: 'center',
      marginBottom: 8,
      width: 88,
    },
    date: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      textAlign: 'center',
    },
    times: {
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
    },
    timeCol: { alignItems: 'center', flex: 1, gap: 2 },
    timeDivider: {
      alignSelf: 'stretch',
      backgroundColor: c.border,
      width: StyleSheet.hairlineWidth,
    },
    timeLabel: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(13),
    },
    timeValue: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(26),
    },
    // Late is the readers' own verdict (flag_in = 2), shown as a fact.
    timeLate: { color: c.warning ?? c.danger },
    lateBadge: {
      color: c.warning ?? c.danger,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(12),
    },
    reason: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      marginTop: 8,
      paddingHorizontal: 8,
      textAlign: 'center',
    },
    divider: {
      alignSelf: 'stretch',
      backgroundColor: c.border,
      height: StyleSheet.hairlineWidth,
      marginBottom: 8,
      marginTop: 16,
    },
  });
