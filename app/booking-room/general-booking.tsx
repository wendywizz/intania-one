/**
 * Booking Room → จองทั่วไป.
 *
 * The phone's form for a single-day room booking — system/main/generalbook.php,
 * rebuilt with the app's own controls.
 *
 * Two things about that page shaped this one:
 *
 *  1. Its submit does not save anything. It fills a $_SESSION cart, and the
 *     rows are written three pages later. A phone has no such session, so this
 *     posts once and the booking exists.
 *  2. Its rules live in js/custom.js — no past dates, a Sunday needs two days'
 *     notice, a holiday needs one working day, the room must be free. All of
 *     them are enforced again on the server. The copies here exist only to say
 *     so before the person taps submit, never as the last word.
 *
 * The room picker deliberately opens only once a date and both times are set:
 * "which rooms are free" has no answer before then, and the website disables
 * its own picker for the same reason.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Toggle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { SelectSheet, type SelectSheetOption } from '@/components/ui/select-sheet';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import {
  type AppColors,
  useColors,
  useScreenGutter,
  useThemedStyles,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/toast-provider';
import { formatFullDate } from '@/utils/date-format';
import {
  checkBookDate,
  createBooking,
  getBookFormOptions,
  listBookableRooms,
  type BookableRoom,
  type BookFormOptions,
  type DateVerdict,
  type TeachingSubject,
} from '@/services/bookingRoomService';

/** The swatches generalbook.php's colour input is usually left on. */
const COLORS = ['#8080FF', '#FF8080', '#80C080', '#FFC080', '#C080FF', '#80D0D0'];

// Removes the browser focus outline on web so an active input shows only its
// bottom border — the same line the absence forms use.
const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

/** The fields that must be answered before the booking can be submitted. */
type FieldKey =
  | 'subject'
  | 'extraSubject'
  | 'extraObjective'
  | 'teacher'
  | 'date'
  | 'time'
  | 'room';

type FieldErrors = Partial<Record<FieldKey, string>>;

function toISODate(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export default function GeneralBookingScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const staffId = user?.staffId ?? '';

  const [options, setOptions] = useState<BookFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  //
  // The toggle starts off, the same state generalbook.php's checkbox loads in
  // and the same as the term form. Booking against a subject you teach is the
  // ordinary case; "อื่นๆ" is the exception, and an exception should be chosen
  // rather than arrived in.
  const [extra, setExtra] = useState(false);
  const [subject, setSubject] = useState<TeachingSubject | null>(null);
  const [extraSubject, setExtraSubject] = useState('');
  const [extraSection, setExtraSection] = useState('');
  const [extraObjective, setExtraObjective] = useState('');
  const [teacher, setTeacher] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [room, setRoom] = useState<BookableRoom | null>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState(false);

  const [verdict, setVerdict] = useState<DateVerdict | null>(null);
  const [rooms, setRooms] = useState<BookableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [picker, setPicker] = useState<'subject' | 'start' | 'end' | 'room' | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!staffId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getBookFormOptions(staffId);
        if (cancelled) return;

        setOptions(data);
        setTeacher(data.teacher);
        setColor(data.default_color || COLORS[0]);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_FORM_LOAD_ERROR);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staffId]);

  const isoDate = date ? toISODate(date) : '';

  // Ask the server about each date as it is picked, the way the web form's
  // onchange="checkHoliday(this)" does.
  useEffect(() => {
    if (!isoDate) {
      setVerdict(null);
      return;
    }

    let cancelled = false;

    checkBookDate(isoDate)
      .then((v) => {
        if (!cancelled) setVerdict(v);
      })
      .catch(() => {
        // A failed check must not block the form: the server checks again on
        // submit and that is the one that counts.
        if (!cancelled) setVerdict(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isoDate]);

  const timeOrderError = Boolean(startTime && endTime && startTime >= endTime);

  // Whenever the window changes, the room that was chosen for the old one may
  // no longer be free — so it is cleared rather than carried over.
  useEffect(() => {
    setRoom(null);
    setRooms([]);
  }, [isoDate, startTime, endTime]);

  // Only ever reached through `openStep`, which is the single place the order
  // is enforced — a second copy of the same condition here would be one more
  // thing to keep in step with it.
  const openRoomPicker = useCallback(async () => {
    setPicker('room');
    setRoomsLoading(true);

    try {
      setRooms(await listBookableRooms(isoDate, startTime, endTime));
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [isoDate, startTime, endTime]);

  /**
   * Why a step cannot be answered yet, or null when it can.
   *
   * The form is answered in order — day, then hours, then room — because each
   * answer narrows the next: there is no list of free rooms until the window is
   * known. Rather than silently doing nothing, a locked step says which answer
   * is missing.
   */
  const stepBlockedBy = useCallback(
    (step: 'start' | 'end' | 'room'): string | null => {
      if (!isoDate) return TEXT.BOOKING_ROOM_STEP_NEED_DATE;

      if (step === 'end' && !startTime) return TEXT.BOOKING_ROOM_STEP_NEED_START_TIME;

      if (step === 'room') {
        if (!startTime || !endTime) return TEXT.BOOKING_ROOM_STEP_NEED_TIME;
        if (startTime >= endTime) return TEXT.BOOKING_ROOM_TIME_ORDER_ERROR;
        // An unbookable day has no rooms worth listing — the server would
        // refuse the booking anyway.
        if (verdict && !verdict.bookable) return verdict.message;
      }

      return null;
    },
    [isoDate, startTime, endTime, verdict],
  );

  const openStep = useCallback(
    (step: 'start' | 'end' | 'room') => {
      const blocked = stepBlockedBy(step);

      if (blocked) {
        showToast(blocked, 'error');
        return;
      }

      if (step === 'room') {
        void openRoomPicker();
        return;
      }

      setPicker(step);
    },
    [stepBlockedBy, openRoomPicker, showToast],
  );

  const startBlocked = stepBlockedBy('start');
  const endBlocked = stepBlockedBy('end');
  const roomBlocked = stepBlockedBy('room');

  // A field shows whichever complaint is live: the one submit raised, or the
  // one the values themselves already prove — an unbookable date and a
  // backwards time range are wrong the moment they are picked, without waiting
  // for anyone to press submit.
  const dateError = errors.date ?? (verdict && !verdict.bookable ? verdict.message : undefined);
  const timeError = errors.time ?? (timeOrderError ? TEXT.BOOKING_ROOM_TIME_ORDER_ERROR : undefined);

  const subjectOptions: SelectSheetOption[] = useMemo(
    () =>
      (options?.subjects ?? []).map((s) => ({
        id: `${s.subject_id}_${s.section}`,
        label: `${s.subject_id} (${s.section})`,
        description: s.subject_name,
        searchText: s.subject_name,
      })),
    [options],
  );

  const timeOptions: SelectSheetOption[] = useMemo(
    () => (options?.times ?? []).map((t) => ({ id: t, label: t })),
    [options],
  );

  const roomOptions: SelectSheetOption[] = useMemo(
    () =>
      rooms.map((r) => ({
        id: r.id,
        label: r.name,
        description: r.available ? undefined : TEXT.BOOKING_ROOM_ROOM_UNAVAILABLE,
        // Taken rooms stay in the list — greyed and unchoosable — so it still
        // matches the room list on the schedule tab. A room that vanished
        // would read as a room that does not exist.
        disabled: !r.available,
        // Capacity rides along with the equipment rather than in `meta`, so the
        // seat count and the fittings are one group of icons instead of a
        // string and a group of icons that happen to sit next to each other.
        trailing: <RoomOptionFacts room={r} color={c} styles={styles} />,
      })),
    [rooms, c, styles],
  );

  const subjectLabel = subject
    ? `${subject.subject_id} (${subject.section}) ${subject.subject_name}`
    : '';

  /** What is about to be written, in one line, for the confirmation. */
  const confirmSummary = [
    extra ? extraSubject.trim() : subjectLabel,
    date ? formatFullDate(toISODate(date)) : '',
    startTime && endTime ? `${startTime} - ${endTime}` : '',
    room?.name ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  /** Clears one field's complaint the moment it is answered. */
  const clearError = useCallback((field: FieldKey) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  /**
   * Every unanswered field at once, keyed by field.
   *
   * All of them, not the first — being told about one missing answer, fixing
   * it, and being told about the next is a worse way to fill in a form than
   * seeing everything that is missing in one pass.
   */
  const validate = (): FieldErrors => {
    const found: FieldErrors = {};

    if (extra) {
      if (!extraSubject.trim()) found.extraSubject = TEXT.BOOKING_ROOM_FIELD_REQUIRED;
      if (!extraObjective.trim()) found.extraObjective = TEXT.BOOKING_ROOM_FIELD_REQUIRED;
    } else if (!subject) {
      found.subject = TEXT.BOOKING_ROOM_FIELD_SELECT_REQUIRED;
    }

    if (!teacher.trim()) found.teacher = TEXT.BOOKING_ROOM_FIELD_REQUIRED;

    if (!isoDate) {
      found.date = TEXT.BOOKING_ROOM_FIELD_SELECT_REQUIRED;
    } else if (verdict && !verdict.bookable) {
      found.date = verdict.message;
    }

    if (!startTime || !endTime) {
      found.time = TEXT.BOOKING_ROOM_FIELD_SELECT_REQUIRED;
    } else if (startTime >= endTime) {
      found.time = TEXT.BOOKING_ROOM_TIME_ORDER_ERROR;
    }

    if (!room) found.room = TEXT.BOOKING_ROOM_FIELD_SELECT_REQUIRED;

    return found;
  };

  /**
   * Whether a booking is possible at all yet — not whether the form is
   * complete.
   *
   * generalbook.php ships its submit button disabled when the person has no
   * subjects to pick, and showMe() enables it the moment the "อื่นๆ" toggle is
   * ticked. The same rule stated once: something has to say what is being
   * booked, and until the toggle is on that something can only be a subject
   * from the list.
   *
   * Everything else the form needs — date, times, room — is checked on submit
   * and reported per field, because those are omissions to fix rather than a
   * reason the screen cannot be used.
   */
  const canSubmit = extra || subject !== null;

  /** The submit button: check first, then ask. */
  const requestSubmit = () => {
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // The failures are marked on the fields themselves; this says so for
      // anyone whose first missing field is scrolled off the screen.
      setError(TEXT.BOOKING_ROOM_REQUIRED_ERROR);
      return;
    }

    setError(null);
    setConfirming(true);
  };

  const submit = async () => {
    // The dialog stays up, spinning, for the length of the request: closing it
    // first would leave the screen looking untouched while a booking is being
    // written, and nothing would stop a second tap.
    setSubmitting(true);
    setError(null);

    try {
      await createBooking({
        staff_id: staffId,
        date: isoDate,
        start_time: startTime,
        end_time: endTime,
        room_id: room!.id,
        teacher: teacher.trim(),
        bgcolor: color,
        extra,
        ...(extra
          ? {
              subject_id: extraSubject.trim(),
              // Section stays optional — the website's own form lets it be a
              // dash, and a one-off activity has no section to give.
              section: extraSection.trim() || '-',
              objective: extraObjective.trim(),
            }
          : {
              subject_id: subject!.subject_id,
              section: subject!.section,
              subj_key: subject!.subj_key,
              term: subject!.term,
              year: subject!.year,
              objective: subject!.subject_name,
            }),
      });

      showToast(TEXT.BOOKING_ROOM_SUBMIT_SUCCESS, 'success');
      // Back to the bookings tab, which refetches on focus and so shows the
      // booking that was just made.
      router.replace('/booking-room');
    } catch (err) {
      // Out of the way, so the reason is readable and the form is editable —
      // "ห้องนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว" is an instruction to pick another
      // room, which cannot be followed from behind a dialog.
      setConfirming(false);
      // The server's own words — a generic failure would say none of that.
      setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      </ThemedView>
    );
  }

  if (loadError || !options) {
    return (
      <ThemedView style={styles.container}>
        <Header />
        <ErrorState
          title={TEXT.BOOKING_ROOM_FORM_LOAD_ERROR}
          message={loadError ?? ''}
          onRetry={() => router.replace('/booking-room/general-booking')}
        />
      </ThemedView>
    );
  }

  const noSubjects = options.subjects.length === 0;

  return (
    <ThemedView style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <SectionCard>
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <ThemedText style={[styles.fieldLabel, styles.toggleLabel]}>
                {TEXT.BOOKING_ROOM_EXTRA_TOGGLE}
              </ThemedText>
              {/* Never disabled, even with no subjects to pick — starting off,
                  that is precisely when someone needs to turn it on. */}
              <Toggle
                value={extra}
                onValueChange={(next) => {
                  setExtra(next);
                  setErrors({});
                }}
              />
            </View>

            {noSubjects ? (
              <View style={styles.notice}>
                <IconSymbol name="info.circle.fill" size={16} color={c.warning} />
                <View style={styles.noticeText}>
                  <ThemedText style={styles.noticeTitle}>
                    {TEXT.BOOKING_ROOM_NO_SUBJECT}
                  </ThemedText>
                  <ThemedText style={styles.noticeBody}>
                    {TEXT.BOOKING_ROOM_NO_SUBJECT_HINT}
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard>
          {extra ? (
            <>
              <FormTextField
                label={TEXT.BOOKING_ROOM_EXTRA_SUBJECT_LABEL}
                required
                value={extraSubject}
                onChangeText={(next) => {
                  setExtraSubject(next);
                  clearError('extraSubject');
                }}
                placeholder={TEXT.BOOKING_ROOM_EXTRA_SUBJECT_LABEL}
                error={errors.extraSubject}
                styles={styles}
                color={c}
              />
              <FormTextField
                label={TEXT.BOOKING_ROOM_EXTRA_SECTION_LABEL}
                value={extraSection}
                onChangeText={setExtraSection}
                maxLength={2}
                placeholder="-"
                styles={styles}
                color={c}
              />
              <FormTextField
                label={TEXT.BOOKING_ROOM_EXTRA_OBJECTIVE_LABEL}
                required
                value={extraObjective}
                onChangeText={(next) => {
                  setExtraObjective(next);
                  clearError('extraObjective');
                }}
                placeholder={TEXT.BOOKING_ROOM_EXTRA_OBJECTIVE_LABEL}
                error={errors.extraObjective}
                styles={styles}
                color={c}
              />
            </>
          ) : (
            <PickerField
              label={TEXT.BOOKING_ROOM_SUBJECT_PICK}
              required
              value={subjectLabel}
              placeholder={TEXT.BOOKING_ROOM_SUBJECT_PICK}
              onPress={() => setPicker('subject')}
              error={errors.subject}
              styles={styles}
              color={c}
            />
          )}

          <FormTextField
            label={TEXT.BOOKING_ROOM_TEACHER_LABEL}
            required
            value={teacher}
            onChangeText={(next) => {
              setTeacher(next);
              clearError('teacher');
            }}
            placeholder={TEXT.BOOKING_ROOM_TEACHER_LABEL}
            error={errors.teacher}
            styles={styles}
            color={c}
          />
        </SectionCard>

        {/* The three ordered steps. Each is its own card so the sequence is
            visible before anything is tapped, rather than only being enforced
            once someone taps out of turn.

            Their headings are FieldLabels inside the card rather than the
            card's own `title`, which takes a plain string and so cannot carry
            a red asterisk. */}
        <SectionCard>
          <View style={styles.field}>
            <FieldLabel label={TEXT.BOOKING_ROOM_STEP_1_TITLE} required styles={styles} />
            {/* The row is what DatePickerField expects around it — its own
                container is flex:1, sized by a row the way the absence form
                sizes its start/end pair. */}
            <View style={styles.dateRow}>
              <DatePickerField
                label={TEXT.BOOKING_ROOM_DATE_LABEL}
                hideLabel
                value={date}
                onChange={(next) => {
                  setDate(next);
                  clearError('date');
                }}
                minimumDate={new Date()}
                // The building is open at the weekend and so is the booking
                // system — a Sunday needs two days' notice, a Saturday one,
                // and the server says so per date via `check-date`.
                allowWeekends
                hasError={Boolean(dateError)}
              />
            </View>

            {dateError ? (
              <ThemedText style={styles.fieldError}>{dateError}</ThemedText>
            ) : verdict?.holiday_name ? (
              <ThemedText style={styles.hint}>{verdict.holiday_name}</ThemedText>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard>
          <FieldLabel label={TEXT.BOOKING_ROOM_STEP_2_TITLE} required styles={styles} />
          {/* The start/end pair is drawn the way the absence forms draw their
              start/end dates: two triggers side by side under the one group
              heading, each led by its icon, with the placeholder — not a label
              above it — saying which end of the range it is. */}
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <PickerField
                value={startTime}
                placeholder={TEXT.BOOKING_ROOM_PICK_START_TIME}
                icon="clock.fill"
                onPress={() => openStep('start')}
                locked={Boolean(startBlocked)}
                hasError={Boolean(timeError)}
                styles={styles}
                color={c}
              />
            </View>
            <View style={styles.timeCol}>
              <PickerField
                value={endTime}
                placeholder={TEXT.BOOKING_ROOM_PICK_END_TIME}
                icon="clock.fill"
                onPress={() => openStep('end')}
                locked={Boolean(endBlocked)}
                hasError={Boolean(timeError)}
                styles={styles}
                color={c}
              />
            </View>
          </View>

          {timeError ? (
            <ThemedText style={styles.fieldError}>{timeError}</ThemedText>
          ) : startBlocked ? (
            <StepWarning message={startBlocked} styles={styles} color={c} />
          ) : null}
        </SectionCard>

        <SectionCard>
          <PickerField
            label={TEXT.BOOKING_ROOM_STEP_3_TITLE}
            required
            value={room?.name ?? ''}
            placeholder={TEXT.BOOKING_ROOM_ROOM_PLACEHOLDER}
            onPress={() => openStep('room')}
            locked={Boolean(roomBlocked)}
            hasError={Boolean(errors.room)}
            styles={styles}
            color={c}
          />

          {errors.room ? (
            <ThemedText style={styles.fieldError}>{errors.room}</ThemedText>
          ) : roomBlocked ? (
            <StepWarning message={roomBlocked} styles={styles} color={c} />
          ) : room ? (
            <RoomSummary room={room} styles={styles} color={c} />
          ) : null}
        </SectionCard>

        <SectionCard>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>{TEXT.BOOKING_ROOM_COLOR_LABEL}</ThemedText>
            <View style={styles.swatchRow}>
              {COLORS.map((swatch) => (
                <Pressable
                  key={swatch}
                  accessibilityRole="button"
                  accessibilityState={{ selected: color === swatch }}
                  onPress={() => setColor(swatch)}
                  style={[
                    styles.swatch,
                    { backgroundColor: swatch },
                    color === swatch && styles.swatchActive,
                  ]}>
                  {color === swatch ? (
                    <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </SectionCard>

        {/* Clears the floating bar so the last card can still be scrolled out
            from under it. */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* The submit bar is pinned rather than scrolled to, like every absence
          form: on a form this long the action would otherwise be several
          flicks away from wherever the person is looking. */}
      <View style={[styles.bottomBar, { paddingHorizontal: gutter }]}>
        {/* The reason a submit failed belongs next to the button that failed —
            up in the scroll it can be off-screen at the moment it appears. */}
        {error ? (
          <View style={styles.errorBox}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={c.danger} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        {/* A disabled button with no explanation is a dead end. This says what
            to do about it — the red "ไม่สามารถจองห้องได้" the web form prints
            beside its own disabled submit, turned into an instruction. */}
        {!canSubmit ? (
          <ThemedText style={styles.blockedHint}>
            {noSubjects
              ? TEXT.BOOKING_ROOM_BLOCKED_NO_SUBJECT
              : TEXT.BOOKING_ROOM_BLOCKED_PICK_SUBJECT}
          </ThemedText>
        ) : null}

        <Button
          // `loading` swaps the label for a spinner, so the "กำลังบันทึก…"
          // wording the label used to carry is redundant here.
          title={TEXT.BOOKING_ROOM_SUBMIT}
          onPress={requestSubmit}
          loading={submitting}
          disabled={!canSubmit}
          size="lg"
          fullWidth
        />
      </View>

      {/* Asked before the write, because this one cannot be undone from the
          phone: the app has no "cancel booking" and the room is held the
          moment the row lands. The summary is the point of the pause — it is
          the only place the four answers appear together. */}
      <ConfirmDialog
        visible={confirming}
        icon="door.open"
        title={TEXT.BOOKING_ROOM_CONFIRM_TITLE}
        message={confirmSummary}
        confirmLabel={TEXT.BOOKING_ROOM_CONFIRM_ACTION}
        cancelLabel={TEXT.BOOKING_ROOM_CONFIRM_CANCEL}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
        loading={submitting}
      />

      <SelectSheet
        visible={picker === 'subject'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_SUBJECT_PICK}
        searchPlaceholder={TEXT.BOOKING_ROOM_SUBJECT_SEARCH}
        options={subjectOptions}
        selectedId={subject ? `${subject.subject_id}_${subject.section}` : undefined}
        onSelect={(option) => {
          setSubject(
            options.subjects.find((s) => `${s.subject_id}_${s.section}` === option.id) ?? null,
          );
          clearError('subject');
        }}
      />

      <SelectSheet
        visible={picker === 'start'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_START_TIME_LABEL}
        options={timeOptions}
        // The half-hour grid is long enough that SelectSheet would offer search
        // on its own, but there is nothing to search: the list is every time in
        // order, and scrolling to one is faster than typing it.
        searchable={false}
        selectedId={startTime || undefined}
        onSelect={(option) => {
          setStartTime(option.id);
          clearError('time');
        }}
      />

      <SelectSheet
        visible={picker === 'end'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_END_TIME_LABEL}
        options={timeOptions}
        searchable={false}
        selectedId={endTime || undefined}
        onSelect={(option) => {
          setEndTime(option.id);
          clearError('time');
        }}
      />

      <SelectSheet
        visible={picker === 'room'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_ROOM_PICK}
        searchPlaceholder={TEXT.BOOKING_ROOM_SCHEDULE_SEARCH_ROOM}
        options={roomOptions}
        selectedId={room?.id}
        emptyMessage={
          roomsLoading ? TEXT.SHARED_LOADING_DATA_TITLE : TEXT.BOOKING_ROOM_ROOM_NONE_FREE
        }
        // A taken room is marked `disabled`, so the sheet never reports it as a
        // selection and there is nothing to re-check here.
        onSelect={(option) => {
          setRoom(rooms.find((r) => r.id === option.id) ?? null);
          clearError('room');
        }}
      />
    </ThemedView>
  );
}

function Header() {
  return (
    <ScreenHeader
      title={TEXT.BOOKING_ROOM_GENERAL_TITLE}
      // Back to the chooser this form was opened from, not to the tabs.
      backHref="/booking-room/select-booking"
      titleInNavBar
      showHomeButton={false}
      tone="primary"
    />
  );
}

/**
 * A room row's facts in the picker: how many it seats, what it comes with.
 *
 * Only what the room *has* is drawn. An icon per absent fitting would give
 * every row the same silhouette and make the row say nothing at a glance,
 * which is the one thing an icon is for.
 */
function RoomOptionFacts({
  room,
  color,
  styles,
}: {
  room: BookableRoom;
  color: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  if (room.capacity <= 0 && !room.projector && !room.mic) return null;

  return (
    <View style={styles.equipmentRow}>
      {/* Wrapped rather than labelled directly: IconSymbol takes no
          accessibility props, and a bare glyph is nothing to a screen reader. */}
      {room.capacity > 0 ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`${room.capacity} ${TEXT.BOOKING_ROOM_SCHEDULE_SEAT_UNIT}`}
          style={styles.equipmentCapacity}>
          <IconSymbol name="person.2.fill" size={20} color={color.textMuted} />
          {/* The bare number: the row is narrow, and "ที่นั่ง" next to a
              people icon repeats what the icon already said. */}
          <ThemedText style={styles.equipmentCapacityText}>{room.capacity}</ThemedText>
        </View>
      ) : null}
      {room.projector ? (
        <View accessibilityRole="image" accessibilityLabel={TEXT.BOOKING_ROOM_EQUIPMENT_PROJECTOR}>
          <IconSymbol name="projector" size={20} color={color.textMuted} />
        </View>
      ) : null}
      {room.mic ? (
        <View accessibilityRole="image" accessibilityLabel={TEXT.BOOKING_ROOM_EQUIPMENT_MIC}>
          <IconSymbol name="mic" size={20} color={color.textMuted} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * What the chosen room actually is: how many seats, what it comes with.
 *
 * The sheet closes over its own list, so without this the field is left saying
 * only "A303" — a name that means nothing to anyone who has not taught in it.
 * The same facts, spelled out under the control that chose them.
 */
function RoomSummary({
  room,
  styles,
  color,
}: {
  room: BookableRoom;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  const facts: { icon: IconSymbolName; label: string }[] = [];

  // Some rooms are recorded with no capacity at all; "0 ที่นั่ง" would be a
  // claim the data does not make.
  if (room.capacity > 0) {
    facts.push({
      icon: 'person.2.fill',
      label: `${room.capacity} ${TEXT.BOOKING_ROOM_SCHEDULE_SEAT_UNIT}`,
    });
  }

  if (room.projector) {
    facts.push({ icon: 'projector', label: TEXT.BOOKING_ROOM_EQUIPMENT_PROJECTOR });
  }

  if (room.mic) {
    facts.push({ icon: 'mic', label: TEXT.BOOKING_ROOM_EQUIPMENT_MIC });
  }

  if (facts.length === 0) {
    return <ThemedText style={styles.hint}>{TEXT.BOOKING_ROOM_EQUIPMENT_NONE}</ThemedText>;
  }

  return (
    <View style={styles.roomFacts}>
      {facts.map((fact) => (
        <View key={fact.icon} style={styles.roomFact}>
          <IconSymbol name={fact.icon} size={16} color={color.textMuted} />
          <ThemedText style={styles.roomFactText}>{fact.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

/** Why a step is still locked — a red triangle, then the reason in italics. */
function StepWarning({
  message,
  styles,
  color,
}: {
  message: string;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  return (
    <View style={styles.stepWarningRow}>
      <IconSymbol name="exclamationmark.triangle.fill" size={13} color={color.danger} />
      <ThemedText style={styles.stepWarning}>{message}</ThemedText>
    </View>
  );
}

/**
 * A labelled text input, drawn the way the absence forms draw theirs: no box,
 * just a bottom rule under the value.
 *
 * This is a raw TextInput rather than the shared `TextField`, which is a filled
 * rounded box — correct for the screens that use it, but the wrong shape next
 * to DatePickerField and the picker rows on this form.
 */
function FormTextField({
  label,
  required,
  error,
  styles,
  color,
  ...input
}: TextInputProps & {
  label: string;
  required?: boolean;
  error?: string;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} styles={styles} />
      <TextInput
        placeholderTextColor={color.textFaint}
        style={[styles.input, Boolean(error) && styles.inputError, webNoOutline]}
        {...input}
      />
      {error ? <ThemedText style={styles.fieldError}>{error}</ThemedText> : null}
    </View>
  );
}

/** A field's name, with the asterisk when it has to be answered. */
function FieldLabel({
  label,
  required,
  styles,
}: {
  label: string;
  required?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <ThemedText style={styles.fieldLabel}>
      {label}
      {required ? <ThemedText style={styles.requiredMark}> *</ThemedText> : null}
    </ThemedText>
  );
}

/**
 * A read-only field that opens a SelectSheet — the app's standard picker row.
 *
 * `locked` means "not yet answerable". It is deliberately *not* `disabled`: a
 * disabled Pressable swallows the tap and leaves the person guessing why
 * nothing happened, so a locked field still fires `onPress` and lets the caller
 * explain what is missing.
 */
function PickerField({
  label,
  required,
  error,
  value,
  placeholder,
  icon,
  onPress,
  locked,
  hasError,
  styles,
  color,
}: {
  /** Omitted where the card's own title already names the field. */
  label?: string;
  required?: boolean;
  error?: string;
  value: string;
  placeholder: string;
  /**
   * Leading glyph. Present, the field is drawn like the absence date fields —
   * icon first, no chevron — which is what a side-by-side start/end pair wants.
   */
  icon?: IconSymbolName;
  onPress: () => void;
  locked?: boolean;
  hasError?: boolean;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} required={required} styles={styles} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        onPress={onPress}
        style={({ pressed }) => [
          styles.selectButton,
          locked && styles.selectButtonLocked,
          (hasError || Boolean(error)) && styles.inputError,
          pressed && styles.fieldPressed,
        ]}>
        {icon ? <IconSymbol name={icon} size={16} color={color.textMuted} /> : null}
        <ThemedText
          style={[styles.selectText, !value && styles.placeholder]}
          numberOfLines={1}
          adjustsFontSizeToFit={Boolean(icon)}>
          {value || placeholder}
        </ThemedText>
        {/* The same glyph the absence selects use, rather than an icon — the
            two forms sit one tap apart and a different chevron reads as a
            different kind of control. An icon-led field skips it, exactly as
            the absence date fields do. */}
        {icon ? null : (
          <ThemedText style={[styles.chevron, locked && styles.chevronDisabled]}>⌄</ThemedText>
        )}
      </Pressable>
      {error ? <ThemedText style={styles.fieldError}>{error}</ThemedText> : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll: { paddingTop: 16, paddingBottom: 40, gap: 14 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // --- The absence forms' field shape -------------------------------------
    // Label above, value on a bare bottom rule, error underneath. Every control
    // on this screen uses it so the date, the pickers and the text inputs read
    // as one column rather than a stack of differently-shaped boxes.
    field: { paddingVertical: 12, gap: 10 },
    fieldLabel: {
      fontSize: 15,
      lineHeight: 20,
      color: c.text,
      fontFamily: AppFonts.psuBold,
    },
    requiredMark: { color: c.danger },
    input: {
      minHeight: 40,
      color: c.text,
      fontFamily: AppFonts.psuRegular,
      fontSize: 16,
      lineHeight: 22,
      paddingHorizontal: 0,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.inputBorder,
    },
    selectButton: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 0,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.inputBorder,
    },
    // A step that cannot be answered yet: still tappable (the tap is what
    // explains it), but drawn back so the eye lands on the step that is.
    selectButtonLocked: { borderBottomColor: c.border },
    inputError: { borderBottomWidth: 1.5, borderBottomColor: c.danger },
    selectText: { flex: 1, fontSize: 16, color: c.text, fontFamily: AppFonts.psuRegular },
    placeholder: { color: c.textFaint },
    chevron: { fontSize: 18, lineHeight: 22, color: c.textMuted },
    chevronDisabled: { color: c.textFaint },
    fieldPressed: { opacity: 0.7 },
    fieldError: { fontSize: 12, lineHeight: 17, color: c.danger },
    hint: { fontSize: 12, lineHeight: 17, color: c.textMuted },
    // "You cannot answer this yet" is a warning, not a failure — it reads in
    // the warning colour rather than the muted grey a plain hint uses, so a
    // locked step is legible as blocked at a glance.
    stepWarningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    // Red like the field errors, but italic — same weight of "you cannot go on
    // yet", told as an aside rather than as a verdict on something typed.
    stepWarning: { flex: 1, fontSize: 12, lineHeight: 17, color: c.danger, fontStyle: 'italic' },

    // The label wraps and the switch keeps its size: without flex on the text,
    // a long Thai label lays out at its full intrinsic width and pushes the
    // switch past the right edge of the card — off the screen on a phone,
    // where there is no spare width to absorb it.
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    toggleLabel: { flex: 1 },

    dateRow: { flexDirection: 'row', gap: 12 },
    timeRow: { flexDirection: 'row', gap: 12 },
    timeCol: { flex: 1 },

    notice: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.warningSoft,
    },
    noticeText: { flex: 1, gap: 2 },
    noticeTitle: { fontSize: 13, color: c.text, fontFamily: AppFonts.psuBold },
    noticeBody: { fontSize: 12, color: c.textMuted },

    equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    equipmentCapacity: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    equipmentCapacityText: { fontSize: 13, lineHeight: 18, color: c.textMuted },

    // Wraps, because a room with everything runs past the width on a narrow
    // phone and a fact half off the screen is worse than one on a second line.
    roomFacts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
    roomFact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    roomFactText: { fontSize: 13, lineHeight: 18, color: c.textMuted },

    swatchRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    swatchActive: { borderWidth: 2, borderColor: c.text },

    // Same pinned action bar the absence forms use — surface plate, hairline
    // top rule, generous bottom padding for the home indicator.
    bottomSpacer: { height: 100 },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: 10,
      paddingTop: 12,
      paddingBottom: 28,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.dangerSoft,
    },
    errorText: { flex: 1, fontSize: 13, color: c.danger },
    blockedHint: { fontSize: 12, lineHeight: 17, color: c.textMuted, textAlign: 'center' },
  });
