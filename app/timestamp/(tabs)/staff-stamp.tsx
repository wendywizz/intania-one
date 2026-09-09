import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, IconSymbol } from '@/components/ui';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { MESSAGE_CANNOT_CONNECT_TO_SERVER } from '@/services/api';
import {
  getStaffTimestampStatus,
  type StaffTimestampStatus,
} from '@/services/timestampService';
import { formatFullDate, formatWeekday } from '@/utils/date-format';
import { scaleFont } from '@/utils/font-scale';

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
 * ลงเวลาบุคลากรทั่วไป — today's arrival and departure, and whether a stamp
 * would be accepted right now.
 *
 * A different screen from the lecturers' because it is a different working day.
 * A lecturer records one row with constant times and is done; general staff
 * arrive and leave as separate events at their real times, inside windows the
 * personnel system cuts the day into — two of which forbid stamping outright
 * and one of which marks the arrival late.
 *
 * **Read-only in this phase.** The stamp itself still belongs to the face and
 * card readers at the doors, so the button is present but disabled, saying so.
 * A button that looked live and did nothing would be worse than no button: it
 * would leave people believing they had stamped.
 *
 * Nothing here decides anything. Whether stamping is possible, why not, and
 * whether the next stamp would be an arrival or a departure all arrive already
 * decided from the gateway, so this screen cannot drift from the rules the
 * readers enforce.
 */
export default function StaffTimestampScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;

  const [status, setStatus] = useState<StaffTimestampStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);

      try {
        setStatus(await getStaffTimestampStatus(staffId));
        setError('');
      } catch (err) {
        // Only a failure to reach the answer lands here — a refusal is a
        // successful answer carrying a reason, and is rendered as one.
        setError(err instanceof Error ? err.message : MESSAGE_CANNOT_CONNECT_TO_SERVER);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staffId],
  );

  // On focus, not just on mount: this is one tab of several, and both the
  // stamping window and the network can change while the user is on another.
  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

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
    // Both stamped is the only "finished" state; anything else still has
    // something outstanding, which is what the medallion reflects.
    const complete = Boolean(inTime) && Boolean(outTime);

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
              { backgroundColor: complete ? `${c.success}1A` : `${c.textMuted}1A` },
            ]}
          >
            <IconSymbol
              size={44}
              name={complete ? 'checkmark.circle.fill' : 'clock.fill'}
              color={complete ? c.success : c.textMuted}
            />
          </View>

          <ThemedText style={styles.date}>
            {thaiDateLabel(status?.serverDate ?? '')}
          </ThemedText>

          {/* Arrival and departure side by side. Two columns rather than a list
              because the pair is one fact — the shape of the day — and reading
              them together is the whole point. */}
          <View style={styles.times}>
            <View style={styles.timeCol}>
              <ThemedText style={styles.timeLabel}>
                {TEXT.STAFF_TIMESTAMP_IN_LABEL}
              </ThemedText>
              <ThemedText
                style={[styles.timeValue, isLate ? styles.timeLate : null]}
              >
                {inTime || '—'}
              </ThemedText>
              {isLate ? (
                <ThemedText style={styles.lateBadge}>
                  {TEXT.STAFF_TIMESTAMP_LATE}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.timeDivider} />

            <View style={styles.timeCol}>
              <ThemedText style={styles.timeLabel}>
                {TEXT.STAFF_TIMESTAMP_OUT_LABEL}
              </ThemedText>
              <ThemedText style={styles.timeValue}>{outTime || '—'}</ThemedText>
            </View>
          </View>

          {/* The server's own sentence — what is outstanding, or why stamping is
              refused right now. Always present, so this line is never empty. */}
          {status?.message ? (
            <ThemedText style={styles.reason}>{status.message}</ThemedText>
          ) : null}

          <View style={styles.divider} />

          <Button
            title={
              status?.nextStamp === 'out'
                ? TEXT.STAFF_TIMESTAMP_BUTTON_OUT
                : TEXT.STAFF_TIMESTAMP_BUTTON_IN
            }
            icon="log-in"
            size="lg"
            fullWidth
            // Always disabled in this phase: the write belongs to the readers.
            // The line below says so, so the button is honest rather than inert.
            disabled
          />
          <ThemedText style={styles.comingSoon}>
            {TEXT.STAFF_TIMESTAMP_COMING_SOON}
          </ThemedText>
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.STAFF_TIMESTAMP_TAB}
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
    container: { flex: 1, backgroundColor: c.background },
    content: { flex: 1 },
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
    // Late is the readers' own verdict (flag_in = 2), not something worked out
    // here, so it is shown as a fact rather than a warning.
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
    comingSoon: {
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(12),
      marginTop: 4,
      paddingHorizontal: 8,
      textAlign: 'center',
    },
  });
