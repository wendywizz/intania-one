import { useFocusEffect, useIsFocused, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { timestampTabBarStyle } from '@/app/timestamp/(tabs)/_layout';
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
import { guideOval, type FramingVerdict } from '@/utils/face-framing';
import { scaleFont } from '@/utils/font-scale';

/** At most one scan sent per this many ms. The gateway has its own floor too. */
const MIN_SCAN_GAP_MS = 1500;

/** Scanning pauses after this long without a stamp, until the person asks again. */
const SCAN_WINDOW_MS = 30000;

/** A position older than this is read again before a scan is sent. */
const POSITION_MAX_AGE_MS = 60000;

/**
 * Above this radius of uncertainty the fix cannot answer a 200 m fence at all.
 * The usual cause is "Precise Location" being off for the app, which hands out
 * a position fuzzed by kilometres — the distance then looks absurd and the
 * person has no way to know why.
 */
const COARSE_FIX_M = 150;

/**
 * Refusals that are facts about the day. Shown as a modal when the screen opens
 * — "not a stamping window", "today is a holiday" — so opening the tab answers
 * the question straight away.
 *
 * Already stamped is deliberately not here: the times on the card say it plainly
 * and a modal over them only adds a tap. The network and location refusals are
 * out for a different reason — they are fixed by doing something, and the card
 * and the location banner say what.
 */
const DAY_NOTICE_REASONS = new Set([
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

/** 'วันศุกร์' — the shared helper, which returns the bare weekday name. */
function thaiWeekdayLabel(date: string) {
  const weekday = date ? formatWeekday(date) : '';

  return weekday ? `วัน${weekday}` : '';
}

/** '07:01:12' -> '07:01'. Empty stays empty. */
function hhmm(time: string) {
  return time ? time.slice(0, 5) : '';
}

/**
 * How far away, in the unit that suits the number: metres while it is small
 * enough to mean something on foot, kilometres past 100 m, to two decimals at
 * most (4864 m -> '4.86 กม.'). Empty when the gateway sent no distance.
 */
function distanceLabel(metres: number | null | undefined) {
  if (metres == null) return '';

  if (metres < 100) {
    return TEXT.STAFF_TIMESTAMP_METRES.replace('{m}', String(Math.round(metres)));
  }

  // Rounded to the nearest 10 m before the divide, so the two decimals are all
  // the precision there is — String() then drops a trailing zero by itself.
  return TEXT.STAFF_TIMESTAMP_KILOMETRES.replace('{km}', String(Math.round(metres / 10) / 100));
}

/** 7 -> '07'. The clock and the worked-time label both want two digits. */
function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/** A full working day, for the progress bar. The readers' windows are wider. */
const SHIFT_MINUTES = 8 * 60;

/** 'HH:MM:SS' -> minutes since midnight. -1 when there is no time. */
function minutesOfDay(time: string) {
  if (!time) return -1;

  const [h, m] = time.split(':').map(Number);

  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1;
}

/**
 * How long the person has been at work: from the arrival stamp to the departure
 * one, or to now while the day is still open. Null until there is an arrival.
 */
function workedMinutes(inTime: string, outTime: string, now: Date) {
  const start = minutesOfDay(inTime);
  if (start < 0) return null;

  const end = outTime ? minutesOfDay(outTime) : now.getHours() * 60 + now.getMinutes();

  return Math.max(0, end - start);
}

/**
 * The day in two or three words, for the badge on the card.
 *
 * This is what used to be a modal on opening the tab. The card already carries
 * the times and the gateway's own sentence; the badge is there to be read at a
 * glance, not to be dismissed.
 */
function dayBadge(
  status: StaffTimestampStatus | null,
  locating: boolean,
): { label: string; icon: IconSymbolName; tone: 'success' | 'warning' | 'primary' | 'muted' } {
  if (locating) {
    return { label: TEXT.STAFF_TIMESTAMP_BADGE_LOCATING, icon: 'mappin', tone: 'muted' };
  }

  const stamp = status?.stamp;
  if (stamp?.inTime && stamp?.outTime) {
    return { label: TEXT.STAFF_TIMESTAMP_DAY_COMPLETE, icon: 'checkmark.circle.fill', tone: 'success' };
  }

  switch (status?.reason) {
    case 'already_in':
      return { label: TEXT.STAFF_TIMESTAMP_BADGE_IN_DONE, icon: 'checkmark.circle.fill', tone: 'success' };
    case 'already_complete':
      return { label: TEXT.STAFF_TIMESTAMP_DAY_COMPLETE, icon: 'checkmark.circle.fill', tone: 'success' };
    case 'weekend':
      return { label: TEXT.STAFF_TIMESTAMP_BADGE_WEEKEND, icon: 'calendar', tone: 'muted' };
    case 'on_travel':
      return { label: TEXT.STAFF_TIMESTAMP_BADGE_TRAVEL, icon: 'info.circle.fill', tone: 'muted' };
    case 'outside_hours':
      return { label: TEXT.STAFF_TIMESTAMP_BADGE_OUTSIDE, icon: 'clock.fill', tone: 'muted' };
    case 'irregular_record':
      return { label: TEXT.STAFF_TIMESTAMP_BADGE_IRREGULAR, icon: 'exclamationmark.triangle.fill', tone: 'warning' };
    default:
      break;
  }

  if (status?.canStamp) {
    return { label: TEXT.STAFF_TIMESTAMP_BADGE_READY, icon: 'log-in', tone: 'primary' };
  }

  return { label: TEXT.STAFF_TIMESTAMP_DAY_OPEN, icon: 'clock.fill', tone: 'muted' };
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  // True while the first fix is still coming. The card is already on screen by
  // then, so it says so rather than showing the server's "no location yet".
  const [locating, setLocating] = useState(true);
  // The camera surface's size, so the hint can sit right under the oval rather
  // than at the foot of the screen, where eyes on their own face never go.
  const [scanSize, setScanSize] = useState({ width: 0, height: 0 });
  // The clock on the card ticks; the phone's own time is close enough to the
  // server's, and a stopped clock on a stamping screen reads as a frozen app.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isFocused) return;

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(timer);
  }, [isFocused]);

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

      setLocating(true);
      // Started here, waited for below: a first GPS fix indoors takes seconds,
      // and the day's times do not depend on it. Where the phone is only
      // decides whether the camera may open.
      const positionPromise = readDevicePosition();

      try {
        try {
          const early = await getStaffTimestampStatus(staffId);
          setStatus(early);
          setError('');
          setLoading(false);

          // Nothing here can start the camera: without coordinates the gateway
          // always refuses. Announcing now means "you already stamped in" shows
          // at once instead of after the fix.
          decide(early, !announcedRef.current);
          announcedRef.current = true;
        } catch {
          // Left to the position-aware read below, which reports the failure.
        }

        const reading = await positionPromise;
        positionRef.current = { reading, at: Date.now() };
        setLocation(reading);
        setLocating(false);

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
        setLocating(false);
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

  // While the camera is on it has the screen to itself: a face fills a whole
  // phone the way it fills the kiosk at the door, and nothing else on this
  // screen is worth reading mid-scan. The header, the tab bar and the day's
  // card come back the moment scanning ends — for a face that matched, that is
  // the stamp's own answer.
  const fullScreenScan =
    FACE_SCAN_SUPPORTED &&
    hasPermission &&
    status?.isStaff === true &&
    status.faceRegistered !== false &&
    (phase === 'scanning' || phase === 'paused');

  useEffect(() => {
    navigation.setOptions({
      // Not `undefined` when the camera closes: clearing the option would leave
      // the navigator's plain default bar instead of this tab bar's own look.
      tabBarStyle: fullScreenScan ? { display: 'none' } : timestampTabBarStyle(c),
    });
  }, [navigation, fullScreenScan, c]);

  // Android's back gesture closes the camera rather than the whole tab.
  useEffect(() => {
    if (!fullScreenScan) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setPhase('idle');
      return true;
    });

    return () => subscription.remove();
  }, [fullScreenScan]);

  /**
   * What stands in for the camera when it cannot run — the web notice, "register
   * your face first", and the camera permission. These belong in the day's card,
   * where there is a page to read them on.
   */
  const renderScanNotice = () => {
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

    return null;
  };

  /** The camera, filling the screen, with the scan's own controls over it. */
  const renderFullScreenScanner = () => {
    const hint = checking
      ? TEXT.STAFF_FACE_CHECKING
      : framing === 'ok' && scanMessage
        ? scanMessage
        : FRAMING_HINT[framing];

    const ringColor = checking ? c.primary : framing === 'ok' ? c.success : c.textOnPrimary;

    // Just under the oval — the same oval the mask draws, so the two can never
    // drift apart. Until the surface has been measured the hint waits at the
    // foot of the screen, which is one frame.
    const oval = scanSize.height > 0 ? guideOval(scanSize) : null;
    const hintPlacement = oval
      ? { top: Math.min(oval.cy + oval.ry + 20, scanSize.height - 96) }
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
          active={cameraActive}
          ringColor={ringColor}
          scrimColor={c.overlay}
          onFramingChange={onFramingChange}
          onBlink={onBlink}
          onError={onCameraError}
        />

        <View style={[styles.hintBar, hintPlacement]} pointerEvents="none">
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

        <View style={[styles.scanTopBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityLabel={TEXT.STAFF_FACE_CLOSE}
            accessibilityRole="button"
            hitSlop={12}
            style={styles.scanClose}
            onPress={() => setPhase('idle')}
          >
            <IconSymbol size={22} name="xmark" color={c.textOnPrimary} />
          </Pressable>

          {/* Deliberately small and off to one side: a number to glance at, not
              the thing to watch while scanning. */}
          <View style={styles.similarityPill} pointerEvents="none">
            <ThemedText style={styles.similarityText}>
              {`${TEXT.STAFF_FACE_SIMILARITY} ${similarity == null ? '—' : `${similarity}%`}`}
            </ThemedText>
          </View>
        </View>
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

    const worked = workedMinutes(stamp?.inTime ?? '', stamp?.outTime ?? '', now);

    // The pill is about the phone's position only, and it follows the
    // gateway's own measurement: `reason` reports the first thing that stops a
    // stamp, so somebody who already stamped in is never fence-checked and
    // their reason says nothing at all about where they are.
    const offSite = status?.atSite === false || status?.reason === 'off_site';
    const noFix = (location != null && location.outcome !== 'ok') || status?.distanceM == null;
    const accuracyM = location?.position?.accuracyM ?? 0;
    const coarseFix = !locating && accuracyM > COARSE_FIX_M;
    const siteColor = locating || noFix ? c.textMuted : offSite ? c.warning ?? c.danger : c.success;
    const siteState = locating
      ? TEXT.STAFF_TIMESTAMP_BADGE_LOCATING
      : noFix
        ? TEXT.STAFF_TIMESTAMP_NO_POSITION
        : offSite
          ? TEXT.STAFF_TIMESTAMP_OFF_SITE
          : TEXT.STAFF_TIMESTAMP_IN_AREA;

    // The distance comes from the gateway, which owns the faculty's centre; the
    // phone is never told where that is. Absent until a position has been sent.
    const siteDistance = locating ? '' : distanceLabel(status?.distanceM);

    const badge = dayBadge(status, locating);
    const badgeColor =
      badge.tone === 'success'
        ? c.success
        : badge.tone === 'warning'
          ? c.warning ?? c.danger
          : badge.tone === 'primary'
            ? c.primary
            : c.textMuted;

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

        {renderScanNotice()}

        <View style={styles.card}>
          <View style={styles.cardHeadText}>
            {/* The weekday shares its line with the pill, which can be long
                once it carries a distance; the date then has the full width to
                itself and never has to shrink to fit beside it. */}
            <View style={styles.cardHead}>
              <ThemedText style={styles.weekday}>{thaiWeekdayLabel(status?.serverDate ?? '')}</ThemedText>

              {/* Where the phone is, live: the one precondition a person can do
                  something about while standing there. */}
              <View style={[styles.sitePill, { backgroundColor: `${siteColor}1A` }]}>
                <View style={[styles.siteDot, { backgroundColor: siteColor }]} />
                <ThemedText style={[styles.sitePillText, { color: siteColor }]}>{siteState}</ThemedText>
                {siteDistance ? (
                  <ThemedText style={[styles.sitePillText, { color: siteColor }]}>{siteDistance}</ThemedText>
                ) : null}
              </View>
            </View>

            <ThemedText style={styles.date} numberOfLines={1}>
              {formatFullDate(status?.serverDate ?? '')}
            </ThemedText>
          </View>

          {/* The clock is the anchor of the screen: what a stamp made now would
              record. Seconds are there to show it is live, not to be read. */}
          <View style={styles.clock}>
            <ThemedText style={styles.clockTime}>
              {`${pad2(now.getHours())}:${pad2(now.getMinutes())}`}
            </ThemedText>
            <ThemedText style={styles.clockSeconds}>{pad2(now.getSeconds())}</ThemedText>
          </View>

          {/* The day so far, against a full one. Empty track until the arrival
              stamp exists — there is nothing to measure from before that. */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: c.primary, width: `${Math.min(100, Math.round(((worked ?? 0) / SHIFT_MINUTES) * 100))}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.progressLabel}>
              {worked == null
                ? TEXT.STAFF_TIMESTAMP_NOT_IN_YET
                : TEXT.STAFF_TIMESTAMP_WORKED.replace('{h}', String(Math.floor(worked / 60))).replace('{m}', pad2(worked % 60))}
            </ThemedText>
          </View>

          {/* Arrival and departure side by side: the pair is one fact — the
              shape of the day. A dash for a half that has not happened. */}
          <View style={styles.times}>
            <View style={styles.timeTile}>
              <View style={styles.tileHead}>
                <IconSymbol
                  size={13}
                  name={inTime ? 'checkmark.circle.fill' : 'clock.fill'}
                  color={inTime ? c.success : c.textMuted}
                />
                <ThemedText style={styles.timeLabel}>{TEXT.STAFF_TIMESTAMP_IN_LABEL}</ThemedText>
                {isLate ? (
                  <View style={styles.lateChip}>
                    <ThemedText style={styles.lateChipText}>{TEXT.STAFF_TIMESTAMP_LATE}</ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText
                style={[styles.timeValue, inTime ? null : styles.timeEmpty, isLate ? styles.timeLate : null]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {inTime || '—'}
              </ThemedText>
            </View>

            <View style={styles.timeTile}>
              <View style={styles.tileHead}>
                <IconSymbol
                  size={13}
                  name={outTime ? 'checkmark.circle.fill' : 'clock.fill'}
                  color={outTime ? c.success : c.textMuted}
                />
                <ThemedText style={styles.timeLabel}>{TEXT.STAFF_TIMESTAMP_OUT_LABEL}</ThemedText>
              </View>
              <ThemedText
                style={[styles.timeValue, outTime ? null : styles.timeEmpty]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {outTime || '—'}
              </ThemedText>
            </View>
          </View>

          {/* One action, always in the same place. When a stamp is not on
              offer it stays as a flat plate carrying the day's state, so the
              card never changes shape under the reader. */}
          {canStartScan ? (
            <Button
              title={TEXT.STAFF_FACE_START}
              icon="log-in"
              size="lg"
              fullWidth
              onPress={() => (status?.needsConfirm ? setPhase('confirm') : startScanning())}
            />
          ) : (
            <View style={styles.actionPlate}>
              <IconSymbol size={18} name={badge.icon} color={badgeColor} />
              <ThemedText style={[styles.actionPlateText, { color: badgeColor }]}>{badge.label}</ThemedText>
            </View>
          )}

          {/* A fix too coarse to place anyone inside a 200 m fence. Said here
              rather than left to be puzzled over: the distance above is then
              wrong by kilometres and nothing else on screen explains it. */}
          {coarseFix ? (
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <IconSymbol size={15} name="exclamationmark.triangle.fill" color={c.warning ?? c.danger} />
              </View>
              <ThemedText style={[styles.statusText, { color: c.warning ?? c.danger }]}>
                {TEXT.STAFF_TIMESTAMP_COARSE_FIX.replace('{r}', distanceLabel(accuracyM))}
              </ThemedText>
            </View>
          ) : null}

          {/* The gateway's own sentence — what a scan would record, or why
              stamping is refused right now. While the first fix is still
              coming, that wait is the more honest thing to say. */}
          {locating || status?.message ? (
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <IconSymbol size={15} name={locating ? 'mappin' : 'info.circle.fill'} color={c.textMuted} />
              </View>
              <ThemedText style={styles.statusText}>
                {locating ? TEXT.STAFF_TIMESTAMP_LOCATING : status?.message}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {fullScreenScan ? (
        renderFullScreenScanner()
      ) : (
        <>
          <ScreenHeader title={TEXT.STAFF_TIMESTAMP_TAB} backHref="/" titleInNavBar showHomeButton={false} />
          <View style={styles.content}>{renderBody()}</View>
        </>
      )}

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
    similarityPill: {
      backgroundColor: c.overlay,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    similarityText: {
      color: c.textOnPrimary,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(12),
    },
    hintBar: {
      alignItems: 'center',
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
      alignSelf: 'stretch',
      backgroundColor: c.surface,
      borderRadius: 26,
      gap: 14,
      padding: 20,
      boxShadow: boxShadow(c.shadow, { y: 10, blur: 24, opacity: 0.1 }),
    },
    cardHead: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    cardHeadText: { alignSelf: 'stretch', gap: 2 },
    // The weekday sets the scene; the date is the fact, so it carries the weight.
    weekday: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(19),
    },
    date: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(20),
      lineHeight: scaleFont(28),
    },
    sitePill: {
      alignItems: 'center',
      borderRadius: 999,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    siteDot: { borderRadius: 999, height: 7, width: 7 },
    sitePillText: {
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(12),
      lineHeight: scaleFont(18),
    },
    // The clock: the biggest thing on the screen, and the only one that moves.
    clock: {
      alignItems: 'flex-end',
      alignSelf: 'center',
      flexDirection: 'row',
      gap: 4,
      paddingTop: 6,
    },
    clockTime: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(56),
      fontVariant: ['tabular-nums'],
      letterSpacing: -1,
      lineHeight: scaleFont(64),
    },
    clockSeconds: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(20),
      fontVariant: ['tabular-nums'],
      lineHeight: scaleFont(34),
    },
    progressRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    progressTrack: {
      backgroundColor: c.background,
      borderRadius: 999,
      flex: 1,
      height: 6,
      overflow: 'hidden',
    },
    progressFill: { borderRadius: 999, height: '100%' },
    progressLabel: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(12),
      fontVariant: ['tabular-nums'],
      lineHeight: scaleFont(18),
    },
    actionPlate: {
      alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: 18,
      flexDirection: 'row',
      gap: 8,
      height: 54,
      justifyContent: 'center',
    },
    actionPlateText: {
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(22),
    },
    times: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      gap: 10,
    },
    tileHead: { alignItems: 'center', flexDirection: 'row', gap: 6 },
    // A tile per half of the day. Every line carries its own lineHeight: the
    // PSU faces are taller than the default box, and a big numeral inside a
    // default line box loses its top and bottom.
    timeTile: {
      backgroundColor: c.background,
      borderRadius: 18,
      flex: 1,
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    timeLabel: {
      color: c.textMuted,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(12),
      lineHeight: scaleFont(18),
    },
    timeValue: {
      alignSelf: 'stretch',
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(26),
      fontVariant: ['tabular-nums'],
      lineHeight: scaleFont(36),
    },
    // A half of the day that has not happened is a placeholder, not a value.
    timeEmpty: { color: c.borderStrong, paddingLeft: 6 },
    // Late is the readers' own verdict (flag_in = 2), shown as a fact.
    timeLate: { color: c.warning ?? c.danger },
    lateChip: {
      backgroundColor: `${c.warning ?? c.danger}1F`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 2,
    },
    lateChipText: {
      color: c.warning ?? c.danger,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(12),
      lineHeight: scaleFont(18),
    },
    statusRow: {
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 7,
      paddingTop: 14,
    },
    statusIcon: { paddingTop: scaleFont(5) },
    statusText: {
      color: c.textMuted,
      flex: 1,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(21),
    },
  });
