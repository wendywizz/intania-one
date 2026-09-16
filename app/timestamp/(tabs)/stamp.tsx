import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SitePill } from '@/components/timestamp/site-pill';
import { LocationNoticeBanner, locationNotice } from '@/components/timestamp/location-notice';
import { useToast } from '@/components/toast-provider';
import { Button, IconSymbol } from '@/components/ui';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { useHolidays } from '@/hooks/use-holidays';
import { MESSAGE_CANNOT_CONNECT_TO_SERVER } from '@/services/api';
import { readDevicePosition, type LocationReading } from '@/services/deviceLocation';
import {
  getLectTimestampStatus,
  stampToday,
  type LectTimestampStatus,
} from '@/services/timestampService';
import { formatFullDate, formatWeekday } from '@/utils/date-format';
import { scaleFont } from '@/utils/font-scale';

/**
 * 'วันศุกร์ 04 กันยายน 2569'.
 *
 * Built from the shared helpers rather than a moment format string, because
 * those are the ones that put the year in the Buddhist era — the app shows B.E.
 * everywhere, and a bare `format('YYYY')` here would quietly print 2026.
 */
function thaiDateLabel(date: string) {
  if (!date) return '';

  const weekday = formatWeekday(date);
  const full = formatFullDate(date);

  return weekday ? `วัน${weekday} ${full}` : full;
}

/**
 * ลงเวลาปฏิบัติราชการของอาจารย์ — one button and today's answer.
 *
 * Everything decided here is decided by the server: whether this person may
 * stamp, whether they already have, and why not if not. The screen holds one
 * `LectTimestampStatus` and draws it; it never works out the rules for itself,
 * so it cannot drift from the API that enforces them.
 *
 * The button is disabled on `canStamp`, and the reason line above it is what
 * makes that legible — a dead button with nothing saying why is the thing to
 * avoid here. Two of those refusals go stale in a pocket (`off_network` changes
 * as the lecturer walks into the building, `outside_hours` at six in the
 * morning), so the status is re-read on every focus and pull-to-refresh is
 * always available.
 */
export default function LectTimestampScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  const [status, setStatus] = useState<LectTimestampStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stamping, setStamping] = useState(false);
  const [error, setError] = useState('');
  // Why the phone did or didn't give us a fix. The server decides whether the
  // fix is close enough; only this knows why there wasn't one.
  const [location, setLocation] = useState<LocationReading | null>(null);
  // What the screen is waiting on, named under the loader: a bare spinner and
  // a hung screen look the same, and the fix is the slow part here.
  const [loadStep, setLoadStep] = useState<'location' | 'status'>('location');

  // The upstream only refuses a stamp for a weekend (reason === 'weekend'); a
  // public holiday is not one of its refusal codes at all, so canStamp stays
  // true and reason stays '' on one — the "not stamped yet" headline would
  // otherwise read as a lapse on a day nobody was expected to stamp. Same
  // holiday source the calendar tab and absence forms use.
  const holidays = useHolidays(staffId);
  useEffect(() => {
    const serverDate = status?.serverDate ?? '';
    const [year, month] = serverDate.split('-').map(Number);
    if (year && month) void holidays.ensureMonth(year, month);
    // holidays.ensureMonth is stable per staffId (see useHolidays) — only the
    // server date should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.serverDate]);

  // The medallion settles into place when the answer arrives. One short spring,
  // not a loop: it marks the moment the card became true and then stops asking
  // for attention. Reset first, so a pull-to-refresh plays it again.
  const medallionScale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    if (loading) return;

    medallionScale.setValue(0.85);
    Animated.spring(medallionScale, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [loading, status?.stamped, medallionScale]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      setLoadStep('location');

      try {
        // Read the position first and send it with the status request, so the
        // card shows the same verdict the button would get. Asking afterwards
        // would mean a card that says "ลงเวลาได้" and then refuses on tap.
        const reading = await readDevicePosition();
        setLocation(reading);

        // The gateway reads the IP this call arrives on, so the network checks
        // are settled here alongside the day's times.
        setLoadStep('status');
        const next = await getLectTimestampStatus(staffId, reading.position);
        setStatus(next);
        setError('');
      } catch (err) {
        // Only a failure to *reach* the answer lands here — a refusal is a
        // successful answer with a reason, and is rendered as one.
        setError(err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staffId],
  );

  // On focus, not just on mount: this screen is one tab of five, and a status
  // read while the user was on the calendar tab is exactly the stale one the
  // button has to avoid.
  useFocusEffect(
    useCallback(() => {
      void load('initial');

      // Granting the permission happens in another app, and returning from it
      // is not a focus change as far as the navigator is concerned — without
      // this, the user does exactly what the banner told them to and comes
      // back to the same banner. Only while this tab is the focused one.
      const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') void load('refresh');
      });

      return () => subscription.remove();
    }, [load]),
  );

  const onStamp = useCallback(async () => {
    if (stamping) return;
    setStamping(true);

    try {
      // Read again rather than reuse the fix from the status call: minutes can
      // pass between the screen loading and the tap, and the position that
      // matters is the one at the moment the row is written.
      const reading = await readDevicePosition();
      setLocation(reading);

      if (reading.outcome !== 'ok') {
        // Nothing to gain from a round trip that can only come back
        // `no_location` — and the server's wording for it cannot say which of
        // the four reasons this was, or what to do about it. The banner that
        // just appeared says both.
        const notice = locationNotice(reading);
        showToast(notice?.message ?? TEXT.LECT_TIMESTAMP_LOCATION_UNAVAILABLE, 'error');
        return;
      }

      const next = await stampToday(staffId, reading.position);
      setStatus(next);
      setError('');
      // `message` is the server's wording for what actually happened —
      // "บันทึกแล้ว" on a write, the reason on a refusal — so success and
      // refusal differ only in the colour of the toast.
      showToast(next.message, next.created || next.stamped ? 'success' : 'error');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER,
        'error',
      );
    } finally {
      setStamping(false);
    }
  }, [staffId, stamping, showToast]);

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.loadingBlock}>
          <LoadingAnimate fill={false} />
          <ThemedText style={styles.loadingStep}>
            {loadStep === 'location' ? TEXT.TIMESTAMP_STEP_LOCATION : TEXT.TIMESTAMP_STEP_STATUS}
          </ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.LECT_TIMESTAMP_LOAD_ERROR}
          message={error}
          onRetry={() => {
            setLoading(true);
            void load('initial');
          }}
        />
      );
    }

    const stamped = status?.stamped === true;
    const canStamp = status?.canStamp === true;

    // The upstream only flags 'weekend'; a public holiday has to be checked
    // against the same calendar the timestamp tab and absence forms use.
    const serverDate = status?.serverDate ?? '';
    const isWeekend = status?.reason === 'weekend';
    const isPublicHoliday = Boolean(serverDate) && holidays.holidaySet.has(serverDate);
    const holidayName = serverDate ? holidays.holidayNames.get(serverDate) : undefined;
    const isDayOff = isWeekend || isPublicHoliday;

    // A named holiday wins over the generic weekend label when a holiday
    // lands on one — it says more. Falls back to the plain prefix on the
    // rare day flagged a holiday with no name attached.
    const dayOffHeadline = [
      TEXT.LECT_TIMESTAMP_HOLIDAY_HEADLINE_PREFIX,
      holidayName || (isWeekend ? TEXT.LECT_TIMESTAMP_WEEKEND_LABEL : ''),
    ].filter(Boolean).join(' ');

    const headline = stamped
      ? TEXT.LECT_TIMESTAMP_STAMPED_HEADLINE
      : isDayOff
        ? dayOffHeadline
        : TEXT.LECT_TIMESTAMP_NOT_STAMPED_HEADLINE;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={c.primary}
          />
        }
      >
        <LocationNoticeBanner
          reading={location}
          retrying={refreshing}
          onRetry={() => void load('refresh')}
        />

        <View style={styles.card}>
          <Animated.View
            style={[
              styles.medallion,
              {
                backgroundColor: stamped ? `${c.success}1A` : `${c.textMuted}14`,
                transform: [{ scale: medallionScale }],
              },
            ]}
          >
            <IconSymbol
              size={34}
              name={stamped ? 'checkmark.circle.fill' : 'clock.fill'}
              color={stamped ? c.success : c.textMuted}
            />
          </Animated.View>

          <View style={styles.headBlock}>
            <ThemedText style={styles.headline}>{headline}</ThemedText>
            <ThemedText style={styles.date}>{thaiDateLabel(status?.serverDate ?? '')}</ThemedText>
          </View>

          {/* The time they actually tapped, at the size of the fact it is. Not
              in_time, which is the constant 08:00 every lecturer stamp carries.
              Absent on older rows, so it is allowed to be missing. */}
          {stamped && status?.stamp?.stampedAt ? (
            <View style={styles.clockBlock}>
              <ThemedText style={styles.clockLabel}>{TEXT.LECT_TIMESTAMP_STAMPED_AT}</ThemedText>
              <View style={styles.clockRow}>
                <ThemedText style={styles.clock}>{status.stamp.stampedAt.slice(0, 5)}</ThemedText>
                <ThemedText style={styles.clockUnit}>{TEXT.LECT_TIMESTAMP_HOUR_SUFFIX}</ThemedText>
              </View>
            </View>
          ) : null}

          {/* Where the phone is now, and how far from the fence centre — the
              same badge as the staff card. Shown whether or not today is
              stamped: before, it says whether the button can work; after, it
              is simply where the phone is. */}
          <View style={styles.sitePillSlot}>
            <SitePill
              atSite={status?.atSite}
              distanceM={status?.distanceM}
              reason={status?.reason}
              location={location}
            />
          </View>

          <View style={styles.divider} />

          {/* One place for the action, whatever the day's answer is. Once the
              stamp is in, the red button would be a lie in a colour that asks
              to be pressed — the plate says the same thing and stays quiet. */}
          {stamped ? (
            <View style={styles.donePlate}>
              <IconSymbol size={18} name="checkmark.circle.fill" color={c.success} />
              <ThemedText style={styles.donePlateText}>{TEXT.LECT_TIMESTAMP_DONE}</ThemedText>
            </View>
          ) : (
            <Button
              title={TEXT.LECT_TIMESTAMP_BUTTON}
              icon="log-in"
              size="lg"
              fullWidth
              style={styles.action}
              loading={stamping}
              // Disabled on the server's verdict, not on a rule worked out here.
              // Two of those verdicts go stale in a pocket — `off_network`
              // changes as the lecturer walks into the building,
              // `outside_hours` at six in the morning — so the screen re-reads
              // on every focus and offers pull-to-refresh, and the note below
              // always says which it is.
              disabled={!canStamp}
              onPress={onStamp}
            />
          )}

          {/* The server's own sentence, directly under the button it explains —
              "อยู่นอกเครือข่ายคณะ", "ยังไม่ถึง 06:00". A dead button with
              nothing saying why is the thing this screen exists to avoid. */}
          {!canStamp && !stamped && status?.message ? (
            <ThemedText style={styles.footNote}>{status.message}</ThemedText>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.LECT_TIMESTAMP_TAB}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
      />
      <View style={styles.content}>{renderBody()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      gap: 12,
      justifyContent: 'center',
      padding: 16,
    },
    // The wait, with its reason under it.
    loadingBlock: {
      alignItems: 'center',
      alignSelf: 'stretch',
      flex: 1,
      justifyContent: 'center',
    },
    loadingStep: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
      textAlign: 'center',
    },
    // One column down the middle. The spacing is set per block rather than by
    // a single `gap`, because the rhythm is deliberately uneven: the date sits
    // close under its headline, the divider stands well clear of both.
    card: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: c.surface,
      borderRadius: 26,
      paddingHorizontal: 20,
      paddingTop: 26,
      paddingBottom: 20,
      boxShadow: boxShadow(c.shadow, { y: 12, blur: 28, opacity: 0.12 }),
    },
    medallion: {
      alignItems: 'center',
      borderRadius: 999,
      height: 76,
      justifyContent: 'center',
      width: 76,
    },
    headBlock: { alignItems: 'center', gap: 5, marginTop: 18 },
    headline: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(20),
      lineHeight: scaleFont(28),
      textAlign: 'center',
    },
    date: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(19),
      textAlign: 'center',
    },
    // The time, at the size of the thing the whole card is about. Tabular
    // figures so it cannot jitter, and a lineHeight of its own: the PSU faces
    // are taller than the default box and a numeral this big loses its top.
    clockBlock: { alignItems: 'center', marginTop: 16 },
    clockLabel: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(19),
    },
    clockRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 7 },
    clock: {
      color: c.success,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(52),
      fontVariant: ['tabular-nums'],
      letterSpacing: -1.5,
      // 1.35x the size, not 1.12x - see the same note on the staff card's
      // clock. Tall PSU numerals need the headroom, and what is a hairline
      // crop at the default text size is a visible one at large type.
      lineHeight: scaleFont(70),
    },
    clockUnit: {
      color: c.textMuted,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
      paddingBottom: scaleFont(9),
    },
    sitePillSlot: { marginTop: 14 },
    // Separates the day's status from the one thing to do about it, so the
    // button reads as an action rather than as another line of the summary.
    divider: {
      alignSelf: 'stretch',
      backgroundColor: c.border,
      height: StyleSheet.hairlineWidth,
      marginBottom: 16,
      marginTop: 20,
    },
    // A rounded plate rather than the pill the shared button draws by default:
    // the same shape the staff card's action carries, so the two screens' one
    // button looks like one button.
    action: { borderRadius: 18, minHeight: 54 },
    donePlate: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: c.background,
      borderRadius: 18,
      flexDirection: 'row',
      gap: 8,
      // minHeight, not height: the label grows with the phone's text size.
      minHeight: 54,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    donePlateText: {
      color: c.success,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(16),
      lineHeight: scaleFont(22),
    },
    footNote: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(12.5),
      lineHeight: scaleFont(18),
      marginTop: 12,
      paddingHorizontal: 8,
      textAlign: 'center',
    },
  });
