import { CalendarDays, Clock } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { getCompOtStampWindow, type CompOtEvent, type CompOtStampFlag } from '@/services/compOtService';

type CompOtBadgeKind = 'mine' | 'today' | 'past';

function formatClock(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** One badge slot, priority-picked in the component: owning the shift beats
 * it merely being today, which beats it merely being in the past — the
 * staff name already in the title makes ownership the one fact worth a badge. */
function getBadge(event: CompOtEvent, isToday: boolean, isPast: boolean): { kind: CompOtBadgeKind; text: string } | null {
  if (event.is_mine) return { kind: 'mine', text: TEXT.COMP_OT_MINE_BADGE };
  if (isToday) return { kind: 'today', text: TEXT.COMP_OT_TODAY_CHIP };
  if (isPast) return { kind: 'past', text: TEXT.COMP_OT_STATUS_PAST };
  return null;
}

type CompOtDutyCardProps = {
  event: CompOtEvent;
  isToday: boolean;
  isPast: boolean;
  /** Pre-formatted date/weekday label — the card doesn't own date formatting. */
  dateLabel: string;
  /** config.login_period for this event's shift type (cid) — minutes on each
   * side of start_time/end_time the shift may be stamped within. */
  loginPeriodMinutes: number;
  onStampPress?: (flag: CompOtStampFlag) => void;
};

// Same row shape as the exam-invigilation schedule's ExamCard (examinar/index.tsx):
// a leading circle, a title + icon/text meta rows, and one status badge on the
// right — reused here with the person's photo as the leading circle and their
// name as the title, since a duty roster row is "who", not "where".
export function CompOtDutyCard({ event, isToday, isPast, dateLabel, loginPeriodMinutes, onStampPress }: CompOtDutyCardProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const badge = getBadge(event, isToday, isPast);
  const iconColor = isPast ? c.textFaint : c.textMuted;
  const timeRange = `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`;

  // Stamping is only ever possible on the shift's own day (the server rejects
  // anything else outright — Ot_Controller::stamp()). Three outcomes for
  // whichever of in/out is still outstanding:
  //   - still today and inside the window: the stamp button
  //   - still today, window not open yet: a plain "opens at HH:MM" hint
  //   - the window has passed (today, past its end) or the day itself is
  //     already over: "missed" — flag_in/out never got set and now never can,
  //     so this reads the same for both rather than pretending "later today"
  //     is still possible once the day has actually gone.
  const relevantFlag: CompOtStampFlag | null = !event.flag_in ? 'in' : !event.flag_out ? 'out' : null;
  let stampHint = '';
  let missedFlag: CompOtStampFlag | null = null;
  let canStampNow = false;
  if (relevantFlag && isToday) {
    const window = getCompOtStampWindow(event, loginPeriodMinutes, relevantFlag);
    const now = new Date();
    canStampNow = now >= window.start && now <= window.end;
    if (!canStampNow) {
      if (now < window.start) {
        stampHint = `${relevantFlag === 'in' ? TEXT.COMP_OT_STAMP_IN_OPENS_AT : TEXT.COMP_OT_STAMP_OUT_OPENS_AT} ${formatClock(window.start)} น.`;
      } else {
        missedFlag = relevantFlag;
      }
    }
  } else if (relevantFlag && isPast) {
    missedFlag = relevantFlag;
  }
  const missedText = missedFlag === 'in' ? TEXT.COMP_OT_STAMP_MISSED_IN : TEXT.COMP_OT_STAMP_MISSED_OUT;

  return (
    <View style={[styles.card, isPast && styles.cardPast]}>
      <UserAvatar staffId={event.staff_id} size={40} />

      <View style={styles.body}>
        <ThemedText style={[styles.name, isPast && styles.textPast]} numberOfLines={1}>
          {event.staff_name || TEXT.COMP_OT_UNKNOWN_STAFF}
        </ThemedText>
        <View style={styles.metaRow}>
          <CalendarDays size={13} color={iconColor} />
          <ThemedText style={[styles.metaText, isPast && styles.textPast]} numberOfLines={1}>
            {dateLabel}
          </ThemedText>
        </View>
        <View style={styles.metaRow}>
          <Clock size={13} color={iconColor} />
          <ThemedText style={[styles.metaText, isPast && styles.textPast]} numberOfLines={1}>
            {timeRange}
          </ThemedText>
        </View>

        {event.is_mine ? (
          <View style={styles.stampRow}>
            {relevantFlag === null ? (
              <View style={[styles.stampDoneBadge, { backgroundColor: c.successSoft }]}>
                <ThemedText style={[styles.stampDoneText, { color: c.successOnSoft }]}>
                  {TEXT.COMP_OT_STAMP_COMPLETE}
                </ThemedText>
              </View>
            ) : canStampNow ? (
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.stampButton,
                  { backgroundColor: relevantFlag === 'in' ? c.pomegranate : c.belizeHole },
                ]}
                onPress={() => onStampPress?.(relevantFlag)}>
                <ThemedText style={styles.stampButtonText}>
                  {relevantFlag === 'in' ? TEXT.COMP_OT_STAMP_IN_BUTTON : TEXT.COMP_OT_STAMP_OUT_BUTTON}
                </ThemedText>
              </Pressable>
            ) : missedFlag ? (
              <View style={[styles.stampClosedBadge, { backgroundColor: c.dangerSoft }]}>
                <ThemedText style={[styles.stampClosedText, { color: c.dangerOnSoft }]}>{missedText}</ThemedText>
              </View>
            ) : stampHint ? (
              <ThemedText style={styles.stampHint}>{stampHint}</ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      {badge ? (
        <View style={styles.right}>
          <View
            style={[
              styles.statusBadge,
              badge.kind === 'mine' && { backgroundColor: c.primary },
              badge.kind === 'today' && { backgroundColor: c.success },
              badge.kind === 'past' && { backgroundColor: c.surfaceMuted },
            ]}>
            <ThemedText
              style={[
                styles.statusBadgeText,
                { color: badge.kind === 'past' ? c.textMuted : c.textOnPrimary },
              ]}>
              {badge.text}
            </ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  cardPast: { opacity: 0.7 },
  body: { flex: 1, gap: 3 },
  name: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  textPast: { color: c.textFaint },

  right: { flexShrink: 0 },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 11,
  },

  stampRow: { marginTop: 6 },
  stampHint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: AppFonts.psuRegular,
    color: c.textFaint,
  },
  stampButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stampButtonText: {
    fontSize: 13,
    fontFamily: AppFonts.psuBold,
    color: c.textOnPrimary,
  },
  stampDoneBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stampDoneText: {
    fontSize: 12,
    fontFamily: AppFonts.psuBold,
  },
  // "พ้นเวลาลงเวลาแล้ว" — same pill shape as stampDoneBadge, danger-toned
  // rather than primary so a missed window doesn't read the same as an
  // ownership/brand accent elsewhere on the card.
  stampClosedBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stampClosedText: {
    fontSize: 12,
    fontFamily: AppFonts.psuBold,
  },
});
