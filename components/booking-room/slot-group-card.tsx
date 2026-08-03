/**
 * The booking-room slot card, and the grouping that feeds it.
 *
 * A booking is stored as one row per date — a term booking is thirty-two of
 * them — but it was *made* as a handful of rules: "ทุกวันพุธ 09:00-10:20 ห้อง
 * CE109". `groupSlots` folds the rows back into those rules and this card draws
 * one, with the individual dates behind a tap.
 *
 * Shared rather than screen-local because more than one screen in the module
 * shows the same thing and they must not drift: the typography, the spacing and
 * the wording of a slot card are decided here, once.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import type { MyBookingSlot } from '@/services/bookingRoomService';
import {
  formatDateRange,
  formatFullDate,
  formatShortDate,
  formatWeekday,
} from '@/utils/date-format';

/** One repeating rule recovered from the slots that came out of it. */
export type SlotGroup = {
  key: string;
  weekday: string;
  startTime: string;
  endTime: string;
  roomName: string;
  dates: string[];
  /**
   * Which slot row each date came from, so a single date can be cancelled.
   * Kept beside `dates` rather than folded into it: everything else reads the
   * dates as dates, and only the cancel action needs the id.
   */
  idByDate: Record<string, number>;
  /** Every date exactly a week apart — "ทุกวันพุธ" rather than "วันพุธ". */
  weekly: boolean;
  /** The first date still to come, or '' when the booking is over. */
  next: string;
  remaining: number;
};

/** Today as 'YYYY-MM-DD' in local time — ISO dates compare as strings. */
export function todayISO() {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function fill(template: string, values: Record<string, string | number>) {
  return Object.keys(values).reduce(
    (text, key) => text.replace(`{${key}}`, String(values[key])),
    template,
  );
}

/**
 * Fold slots back into the rules that produced them.
 *
 * The booking forms write one row per date; grouping on weekday + time + room
 * recovers what was typed. A จองทั่วไป booking has one slot and so yields one
 * group of one date, which the card renders as a plain dated row — no special
 * case needed.
 */
export function groupSlots(slots: MyBookingSlot[]): SlotGroup[] {
  const today = todayISO();
  const byRule = new Map<string, SlotGroup>();

  slots.forEach((slot) => {
    const key = `${formatWeekday(slot.date)}|${slot.start_time}|${slot.end_time}|${slot.room_id}`;
    const existing = byRule.get(key);

    if (existing) {
      existing.dates.push(slot.date);
      existing.idByDate[slot.date] = slot.detail_id;
      return;
    }

    byRule.set(key, {
      key,
      weekday: formatWeekday(slot.date),
      startTime: slot.start_time,
      endTime: slot.end_time,
      roomName: slot.room_name || slot.room_id,
      dates: [slot.date],
      idByDate: { [slot.date]: slot.detail_id },
      weekly: false,
      next: '',
      remaining: 0,
    });
  });

  return Array.from(byRule.values()).map((group) => {
    const dates = group.dates.slice().sort();
    const upcoming = dates.filter((d) => d >= today);

    return {
      ...group,
      dates,
      // Claimed only when it is true. A term with a skipped week is "วันพุธ
      // 15 ครั้ง", not "ทุกวันพุธ" — the difference is a week someone might
      // otherwise turn up for.
      weekly: dates.length > 1 && isWeekly(dates),
      next: upcoming[0] ?? '',
      remaining: upcoming.length,
    };
  });
}

/** Every consecutive pair exactly seven days apart. */
function isWeekly(dates: string[]) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  return dates.every((date, index) => {
    if (index === 0) return true;
    const previous = new Date(`${dates[index - 1]}T00:00:00`).getTime();
    const current = new Date(`${date}T00:00:00`).getTime();
    return current - previous === WEEK_MS;
  });
}

export type SlotGroupCardProps = {
  group: SlotGroup;
  /**
   * Whether single dates may be cancelled — the booking's own permission, as
   * the server reported it. Off by default, so a screen that only displays
   * bookings cannot accidentally offer to change one.
   */
  canDelete?: boolean;
  /**
   * Whether the booking has other dates besides this rule's.
   *
   * A one-date rule inside a one-date booking needs no cancel of its own —
   * cancelling that date is cancelling the booking, which the detail screen's
   * own button does, and offering both would be two buttons for one outcome.
   */
  multiSlot?: boolean;
  onDeleteDate?: (detailId: number, date: string) => void;
};

/**
 * One rule, with its dates behind a tap.
 *
 * The dates are a wrapping grid of chips rather than rows: sixty chips is a
 * paragraph, sixty rows is a screen and a half of scrolling.
 */
export function SlotGroupCard({
  group,
  canDelete = false,
  multiSlot = false,
  onDeleteDate,
}: SlotGroupCardProps) {
  const color = useColors();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const single = group.dates.length === 1;
  const done = group.remaining === 0;
  // Only dates still ahead can go: the server refuses a past one, and the
  // website hides its button for the same reason.
  const canDeleteDates = canDelete && Boolean(onDeleteDate) && group.remaining > 0;

  const deleteDate = (detailId: number, date: string) => onDeleteDate?.(detailId, date);

  return (
    <View style={[styles.groupCard, done && styles.groupCardDone]}>
      <View style={styles.groupHead}>
        <View style={[styles.groupIcon, done && styles.groupIconDone]}>
          <IconSymbol
            name={single ? 'calendar' : 'arrow.triangle.2.circlepath'}
            size={20}
            color={done ? color.textMuted : color.primary}
          />
        </View>

        <View style={styles.groupHeadText}>
          <ThemedText style={styles.groupTitle}>
            {single
              ? formatFullDate(group.dates[0])
              : fill(group.weekly ? TEXT.BOOKING_ROOM_SLOT_EVERY : TEXT.BOOKING_ROOM_SLOT_SOME, {
                  day: group.weekday,
                })}
          </ThemedText>
          <ThemedText style={styles.groupTime}>
            {group.startTime} - {group.endTime}
          </ThemedText>
        </View>

        {single ? null : (
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>
              {fill(TEXT.BOOKING_ROOM_TERM_DAY_COUNT, { count: group.dates.length })}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.groupFacts}>
        <View style={styles.groupFact}>
          <IconSymbol name="door.open" size={16} color={color.textMuted} />
          <ThemedText style={styles.groupFactText}>{group.roomName}</ThemedText>
        </View>

        {single ? null : (
          <View style={styles.groupFact}>
            <IconSymbol name="calendar-range" size={16} color={color.textMuted} />
            <ThemedText style={styles.groupFactText}>
              {formatDateRange(group.dates[0], group.dates[group.dates.length - 1])}
            </ThemedText>
          </View>
        )}
      </View>

      {/* What the person actually wants to know mid-term: is there another one,
          and when. */}
      <View style={styles.groupStatus}>
        {done ? (
          <ThemedText style={styles.statusDone}>{TEXT.BOOKING_ROOM_SLOT_FINISHED}</ThemedText>
        ) : (
          <>
            <ThemedText style={styles.statusNext}>
              {fill(TEXT.BOOKING_ROOM_SLOT_NEXT, { date: formatFullDate(group.next) })}
            </ThemedText>
            {single ? null : (
              <ThemedText style={styles.statusRemaining}>
                {fill(TEXT.BOOKING_ROOM_SLOT_REMAINING, { count: group.remaining })}
              </ThemedText>
            )}
          </>
        )}
      </View>

      {/* A rule of one date has no chip grid to hold its cancel, so it gets a
          plain action instead. */}
      {single && canDeleteDates && multiSlot ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => deleteDate(group.idByDate[group.dates[0]], group.dates[0])}
          style={({ pressed }) => [styles.singleDelete, pressed && styles.togglePressed]}>
          <IconSymbol name="xmark" size={15} color={color.danger} />
          <ThemedText style={styles.singleDeleteText}>
            {TEXT.BOOKING_ROOM_SLOT_DELETE_ONE_ACTION}
          </ThemedText>
        </Pressable>
      ) : null}

      {single ? null : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((current) => !current)}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
            <ThemedText style={styles.toggleText}>
              {open
                ? TEXT.BOOKING_ROOM_SLOT_HIDE_DATES
                : fill(TEXT.BOOKING_ROOM_SLOT_SHOW_DATES, { count: group.dates.length })}
            </ThemedText>
            <IconSymbol
              name={open ? 'chevron.down' : 'chevron.right'}
              size={18}
              color={color.primary}
            />
          </Pressable>

          {open ? (
            <>
              {canDeleteDates ? (
                <ThemedText style={styles.chipHint}>
                  {TEXT.BOOKING_ROOM_SLOT_DELETE_HINT}
                </ThemedText>
              ) : null}

              <View style={styles.chipGrid}>
                {group.dates.map((date) => {
                  const past = date < today;
                  const isNext = date === group.next;
                  // A past date stays listed as part of the record but is not a
                  // target: there is nothing left to free.
                  const removable = canDeleteDates && !past;
                  const detailId = group.idByDate[date];

                  const content = (
                    <>
                      <ThemedText
                        style={[
                          styles.chipText,
                          past && styles.chipTextPast,
                          isNext && styles.chipTextNext,
                        ]}>
                        {formatShortDate(date)}
                      </ThemedText>
                      {removable ? (
                        <IconSymbol
                          name="xmark"
                          size={11}
                          color={isNext ? color.textOnPrimary : color.textMuted}
                        />
                      ) : null}
                    </>
                  );

                  return (
                    <View key={date} style={styles.chipCell}>
                      {removable ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${TEXT.BOOKING_ROOM_SLOT_DELETE_TITLE} ${formatShortDate(date)}`}
                          onPress={() => deleteDate(detailId, date)}
                          style={({ pressed }) => [
                            styles.chip,
                            isNext && styles.chipNext,
                            pressed && styles.chipPressed,
                          ]}>
                          {content}
                        </Pressable>
                      ) : (
                        <View
                          style={[styles.chip, past && styles.chipPast, isNext && styles.chipNext]}>
                          {content}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

/** Gap between date chips, horizontally and vertically — one number, one grid. */
const CHIP_GUTTER = 8;

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // A card in its own right: `surface` and a shadow, since it stands on the
    // page rather than inside a bigger card.
    groupCard: {
      gap: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.05 }),
    },
    // A finished rule stays listed — it is part of the record — but stops
    // competing with the ones that still have dates left. The muted icon and
    // the "สิ้นสุดแล้ว" line say the same thing; this only steps it back.
    groupCardDone: { opacity: 0.75 },

    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    groupIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    groupIconDone: { backgroundColor: c.surfaceMuted },
    groupHeadText: { flex: 1, gap: 3 },
    groupTitle: { fontSize: 16, lineHeight: 23, color: c.text, fontFamily: AppFonts.psuBold },
    groupTime: { fontSize: 14, lineHeight: 20, color: c.textMuted },

    countBadge: {
      borderRadius: 9999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: c.primarySoft,
    },
    countText: { fontSize: 12, lineHeight: 17, color: c.primary, fontFamily: AppFonts.psuBold },

    groupFacts: { gap: 10 },
    groupFact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    groupFactText: { flex: 1, fontSize: 14, lineHeight: 21, color: c.text },

    groupStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    statusNext: { fontSize: 14, lineHeight: 21, color: c.primary, fontFamily: AppFonts.psuBold },
    statusRemaining: { fontSize: 13, lineHeight: 19, color: c.textMuted },
    statusDone: { fontSize: 14, lineHeight: 21, color: c.textMuted },

    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    togglePressed: { opacity: 0.6 },
    // An explicit line height, so the label and the chevron beside it share one
    // centre line — Thai glyphs otherwise carry extra leading and the text sits
    // a point or two below the icon.
    toggleText: {
      fontSize: 14,
      lineHeight: 19,
      color: c.primary,
      fontFamily: AppFonts.psuBold,
      textAlignVertical: 'center',
    },

    // The cancel on a rule that holds a single date — same divided-footer shape
    // as the toggle above, since it sits in the same place.
    singleDelete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    singleDeleteText: {
      fontSize: 14,
      lineHeight: 19,
      color: c.danger,
      fontFamily: AppFonts.psuBold,
    },

    // A real grid, not a wrapping row: the chips carry dates of different
    // widths ('1 ก.ย. 69' vs '24 ธ.ค. 69'), and left to flex-wrap those made
    // every row a different rhythm. Three fixed columns with a half-gutter on
    // each cell puts the same gap everywhere and lines the dates up in
    // columns. The negative margins cancel the outer half-gutters.
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -CHIP_GUTTER / 2,
      marginBottom: -CHIP_GUTTER,
    },
    chipCell: {
      width: '33.333%',
      paddingHorizontal: CHIP_GUTTER / 2,
      paddingBottom: CHIP_GUTTER,
    },
    // Says which chips are targets before any are tapped.
    chipHint: { fontSize: 12, lineHeight: 18, color: c.textMuted, paddingBottom: 8 },
    chip: {
      // Tight side padding on purpose: the column is a third of the card and
      // '24 มิ.ย. 69' has to fit inside it on a narrow phone.
      paddingHorizontal: 4,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      gap: 3,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    // A date already gone is kept for the record but drained of everything
    // that draws the eye — no fill, no border, faint text.
    chipPast: { backgroundColor: 'transparent', borderColor: 'transparent' },
    chipPressed: { opacity: 0.6 },
    chipNext: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12, lineHeight: 17, color: c.text },
    chipTextPast: { color: c.textFaint },
    chipTextNext: { color: c.textOnPrimary, fontFamily: AppFonts.psuBold },
  });
