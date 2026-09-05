import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

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
        const next = await getLectTimestampStatus(staffId);
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
    }, [load]),
  );

  const onStamp = useCallback(async () => {
    if (stamping) return;
    setStamping(true);

    try {
      const next = await stampToday(staffId);
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
      justifyContent: 'center',
      padding: 16,
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
