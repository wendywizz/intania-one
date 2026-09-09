import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

/** What to tell the user, and what button will actually fix it. */
type LocationNotice = {
  message: string;
  action: 'ask' | 'settings' | 'retry';
};

/**
 * The banner for a missing fix — or nothing at all when there is one.
 *
 * Each outcome gets the one button that can resolve it. A "เปิดการตั้งค่า"
 * button shown to someone who has simply not been asked yet sends them on a
 * pointless trip through the Settings app, and an "อนุญาต" button shown to
 * someone the OS will never prompt again does nothing at all when tapped —
 * which is the specific failure that makes permission walls feel broken.
 */
function locationNotice(reading: LocationReading | null): LocationNotice | null {
  if (!reading || reading.outcome === 'ok') return null;

  switch (reading.outcome) {
    case 'denied':
      return reading.canAskAgain
        ? { message: TEXT.LECT_TIMESTAMP_LOCATION_DENIED, action: 'ask' }
        : { message: TEXT.LECT_TIMESTAMP_LOCATION_BLOCKED, action: 'settings' };
    case 'services_off':
      return { message: TEXT.LECT_TIMESTAMP_LOCATION_SERVICES_OFF, action: 'settings' };
    default:
      return { message: TEXT.LECT_TIMESTAMP_LOCATION_UNAVAILABLE, action: 'retry' };
  }
}

/**
 * Open the place the user can actually change the setting.
 *
 * Android can be sent straight to the location switch, which is where
 * `services_off` needs them; the app's own settings page has no such switch on
 * it and would be a dead end. iOS has no public deep link to Location
 * Services, so the app's settings page — which does carry this app's location
 * permission — is the closest thing there is.
 */
function openLocationSettings(action: 'ask' | 'settings' | 'retry') {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android' && action === 'settings') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
      void Linking.openSettings();
    });
    return;
  }

  void Linking.openSettings();
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

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);

      try {
        // Read the position first and send it with the status request, so the
        // card shows the same verdict the button would get. Asking afterwards
        // would mean a card that says "ลงเวลาได้" and then refuses on tap.
        const reading = await readDevicePosition();
        setLocation(reading);

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
      return <LoadingAnimate />;
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

    // Sits above the card rather than in place of it: the day's status is
    // still worth showing to somebody who has location switched off, and a
    // screen replaced wholesale by a permission wall hides whether they have
    // already stamped today.
    const notice = locationNotice(location);

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
        {notice ? (
          <View style={styles.notice}>
            <View style={styles.noticeHeader}>
              <IconSymbol size={20} name="mappin" color={c.warningOnSoft} />
              <ThemedText style={styles.noticeTitle}>
                {TEXT.LECT_TIMESTAMP_LOCATION_TITLE}
              </ThemedText>
            </View>

            <ThemedText style={styles.noticeMessage}>{notice.message}</ThemedText>

            <Button
              // 'retry' and 'ask' both come back through the same reload: the
              // permission prompt is raised by readDevicePosition() itself, so
              // asking again and trying again are one code path.
              title={
                notice.action === 'settings'
                  ? TEXT.SETTINGS_OPEN_OS_SETTINGS
                  : notice.action === 'ask'
                    ? TEXT.LECT_TIMESTAMP_LOCATION_ALLOW
                    : TEXT.LECT_TIMESTAMP_LOCATION_RETRY
              }
              icon={
                notice.action === 'settings'
                  ? 'gearshape.fill'
                  : notice.action === 'ask'
                    ? 'mappin'
                    : 'arrow.triangle.2.circlepath'
              }
              variant="primaryOutline"
              size="md"
              fullWidth
              loading={refreshing}
              onPress={() => {
                if (notice.action === 'settings') {
                  openLocationSettings(notice.action);
                  return;
                }
                void load('refresh');
              }}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <View
            style={[
              styles.medallion,
              { backgroundColor: stamped ? `${c.success}1A` : `${c.textMuted}1A` },
            ]}
          >
            <IconSymbol
              size={44}
              name={stamped ? 'checkmark.circle.fill' : 'clock.fill'}
              color={stamped ? c.success : c.textMuted}
            />
          </View>

          <ThemedText style={styles.headline}>{headline}</ThemedText>

          {/* The time they actually tapped. Not in_time, which is the constant
              08:00 every lecturer stamp carries. Absent on older rows, so it
              is allowed to be missing. */}
          {stamped && status?.stamp?.stampedAt ? (
            <ThemedText style={styles.stampedAt}>
              {`${TEXT.LECT_TIMESTAMP_STAMPED_AT} ${status.stamp.stampedAt.slice(0, 5)} น.`}
            </ThemedText>
          ) : null}

          <ThemedText style={styles.date}>{thaiDateLabel(status?.serverDate ?? '')}</ThemedText>

          {/* The server's own sentence, and the only thing that explains a dead
              button — "อยู่นอกเครือข่ายคณะ", "ยังไม่ถึง 06:00". Left out once
              stamped: the refusal is then just "you already did", which the
              headline and the tick above have already said twice over. */}
          {!canStamp && !stamped && status?.message ? (
            <ThemedText style={styles.reason}>{status.message}</ThemedText>
          ) : null}

          <View style={styles.divider} />

          <Button
            title={TEXT.LECT_TIMESTAMP_BUTTON}
            icon="log-in"
            size="lg"
            fullWidth
            loading={stamping}
            // Disabled on the server's verdict, not on a rule worked out here.
            // Two of those verdicts go stale in a pocket — `off_network` changes
            // as the lecturer walks into the building, `outside_hours` at six in
            // the morning — so the screen re-reads on every focus and offers
            // pull-to-refresh, and the reason above always says which it is.
            disabled={!canStamp}
            onPress={onStamp}
          />
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
    // Warning-tinted, not danger: nothing has gone wrong, a setting is simply
    // switched off — and it is the same soft/on-soft pair every other advisory
    // in the app uses, so it stays legible in both themes.
    notice: {
      alignSelf: 'stretch',
      backgroundColor: c.warningSoft,
      borderColor: c.border,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 10,
      padding: 16,
    },
    noticeHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
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
      paddingVertical: 32,
      boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
    },
    // Separates the day's status from the one thing to do about it, so the
    // button reads as an action rather than as another line of the summary.
    divider: {
      alignSelf: 'stretch',
      backgroundColor: c.border,
      height: StyleSheet.hairlineWidth,
      marginBottom: 8,
      marginTop: 16,
    },
    medallion: {
      alignItems: 'center',
      borderRadius: 44,
      height: 88,
      justifyContent: 'center',
      marginBottom: 8,
      width: 88,
    },
    headline: {
      color: c.text,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(20),
      textAlign: 'center',
    },
    stampedAt: {
      color: c.success,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(16),
      textAlign: 'center',
    },
    date: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      textAlign: 'center',
    },
    reason: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      marginTop: 8,
      paddingHorizontal: 8,
      textAlign: 'center',
    },
  });
