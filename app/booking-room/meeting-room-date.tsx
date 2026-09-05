/**
 * Meeting Room form → add/edit one วันและเวลาที่ใช้ห้อง slot.
 *
 * Reached from step 1's "เพิ่มวันและเวลา" button (add mode, no `id`) or by
 * tapping an already-added row in that section (edit mode, `id` set). Saves
 * into stores/draftMeetingRoomDates.ts and returns — the form screen stays
 * mounted underneath this one (a plain stack push) and picks up the change
 * reactively via `useDraftMeetingRoomDates`, so nothing needs to travel back
 * through navigation params.
 */
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { TimePickerField } from '@/components/time-picker-field';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { checkMeetingRoomAvailability } from '@/services/meetingRoomService';
import {
  addDraftMeetingRoomDate,
  getDraftMeetingRoomDate,
  removeDraftMeetingRoomDate,
  updateDraftMeetingRoomDate,
} from '@/stores/draftMeetingRoomDates';

function toISODate(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function toHHMM(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}

function todayISO() {
  return toISODate(new Date());
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function parseHHMM(hhmm: string): Date {
  const [h, mi] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, mi ?? 0, 0, 0);
  return d;
}

function goBackToForm() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/booking-room/meeting-room-form');
  }
}

export default function MeetingRoomDateScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { room_id, id } = useLocalSearchParams<{ room_id?: string; id?: string }>();
  const isEdit = Boolean(id);

  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ date?: string; time?: string }>({});

  // Prefill from the store in edit mode. Only ever runs once — `id` does not
  // change under this screen (a different row means a different navigation).
  useEffect(() => {
    if (!id) return;
    const existing = getDraftMeetingRoomDate(id);
    if (!existing) return;
    setDate(parseISODate(existing.date));
    setStartTime(parseHHMM(existing.startTime));
    setEndTime(parseHHMM(existing.endTime));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side pre-check only, same as the old inline row used — the real
  // enforcement is create_action()'s own conflict check on submit.
  useEffect(() => {
    if (!room_id || !date || !startTime || !endTime) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    checkMeetingRoomAvailability({
      roomId: room_id,
      date: toISODate(date),
      startTime: toHHMM(startTime),
      endTime: toHHMM(endTime),
    })
      .then((result) => {
        if (!cancelled) setAvailable(result.available);
      })
      .catch(() => {
        if (!cancelled) setAvailable(null);
      });
    return () => {
      cancelled = true;
    };
  }, [room_id, date, startTime, endTime]);

  const validate = (): { date?: string; time?: string } => {
    const next: { date?: string; time?: string } = {};

    if (!date) {
      next.date = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    } else if (toISODate(date) < todayISO()) {
      next.date = TEXT.MEETING_ROOM_FORM_PAST_DATE_ERROR;
    }

    if (!startTime || !endTime) {
      next.time = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    } else if (toHHMM(endTime) <= toHHMM(startTime)) {
      next.time = TEXT.MEETING_ROOM_FORM_TIME_ORDER_ERROR;
    }

    return next;
  };

  const handleSave = () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const row = { date: toISODate(date!), startTime: toHHMM(startTime!), endTime: toHHMM(endTime!) };
    if (id) {
      updateDraftMeetingRoomDate(id, row);
    } else {
      addDraftMeetingRoomDate(row);
    }
    goBackToForm();
  };

  const handleDelete = () => {
    if (id) removeDraftMeetingRoomDate(id);
    goBackToForm();
  };

  // End time must always be after start time — rather than only flagging it
  // at save, moving the start past an already-picked end time drops that end
  // time too, so a stale invalid pair is never left sitting on screen.
  const handleStartTimeChange = (next: Date) => {
    setStartTime(next);
    if (endTime && toHHMM(endTime) <= toHHMM(next)) {
      setEndTime(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={isEdit ? TEXT.MEETING_ROOM_DATE_NAV_TITLE_EDIT : TEXT.MEETING_ROOM_DATE_NAV_TITLE_ADD}
        backHref="/booking-room/meeting-room-form"
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />

      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionCard style={styles.card}>
          <View style={styles.field}>
            <DatePickerField
              label={TEXT.MEETING_ROOM_FORM_DATE_LABEL}
              value={date}
              minimumDate={new Date()}
              allowWeekends
              hasError={Boolean(errors.date)}
              onChange={setDate}
            />
            {errors.date ? <ThemedText style={styles.fieldError}>{errors.date}</ThemedText> : null}
          </View>

          <View style={styles.timeRow}>
            <TimePickerField
              label={TEXT.MEETING_ROOM_FORM_START_TIME_LABEL}
              value={startTime}
              onChange={handleStartTimeChange}
            />
            <TimePickerField
              label={TEXT.MEETING_ROOM_FORM_END_TIME_LABEL}
              value={endTime}
              minExclusive={startTime}
              onChange={setEndTime}
            />
          </View>
          {errors.time ? <ThemedText style={styles.fieldError}>{errors.time}</ThemedText> : null}

          {available === false ? (
            <View style={styles.warningRow}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
              <ThemedText style={[styles.warningText, { color: c.danger }]}>
                {TEXT.MEETING_ROOM_FORM_ROOM_UNAVAILABLE}
              </ThemedText>
            </View>
          ) : null}
        </SectionCard>

        {isEdit ? (
          <Button
            title={TEXT.MEETING_ROOM_FORM_REMOVE_DATE}
            variant="ghost"
            icon="trash.fill"
            onPress={handleDelete}
          />
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button title={TEXT.SHARED_BACK_THAI} variant="secondary" onPress={goBackToForm} />
        <Button title={TEXT.MEETING_ROOM_DATE_SAVE_ACTION} onPress={handleSave} style={styles.ctaButton} />
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    // The ScrollView itself needs flex:1 (not just its content) so it fills
    // the space between the header and the bottom bar — otherwise the bar
    // trails right under the card instead of sitting pinned to the bottom.
    scrollFlex: { flex: 1 },
    scroll: { padding: 16, gap: 12 },
    card: { gap: 14 },
    field: { gap: 8 },
    fieldError: { fontSize: 12, lineHeight: 17, color: c.danger, fontFamily: AppFonts.psuRegular },
    timeRow: { flexDirection: 'row', gap: 16 },
    warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    warningText: { fontSize: 12, fontFamily: AppFonts.psuRegular },
    bottomBar: {
      flexDirection: 'row',
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    ctaButton: { flex: 1 },
  });
