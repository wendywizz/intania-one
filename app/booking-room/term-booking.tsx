/**
 * Booking Room → จองรายเทอม.
 *
 * The phone's form for a whole-term timetable — system/main/termbook.php,
 * rebuilt with the app's own controls.
 *
 * What that page actually does, and what this one has to match:
 *
 *  1. Ticking a weekday books it *every week of the term*. จันทร์ 09:00–11:00
 *     in a fifteen-week term is fifteen bookings sharing one header. The web
 *     form never says fifteen anywhere; this one says it before the tick, on
 *     the row, and again in the confirmation, because that number is the whole
 *     difference between this screen and จองทั่วไป.
 *  2. A room is offered only if it is free on *every* occurrence of that
 *     weekday. One clash in week nine rules it out for all fifteen.
 *  3. A room that is taken can still be chosen when the bookings holding it are
 *     yours, or are for a subject you also teach — co-teachers share a room
 *     rather than compete for it. Those come back flagged `shareable` and are
 *     shown as such rather than hidden.
 *
 * As with จองทั่วไป, the web form's submit only fills a $_SESSION cart; this
 * posts once and the booking exists. Every rule is enforced again on the
 * server; the copies here exist only to explain them early.
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
  createTermBooking,
  getTermFormOptions,
  listTermRooms,
  type TeachingSubject,
  type TermFormOptions,
  type TermRoom,
} from '@/services/bookingRoomService';

/** The swatches termbook.php's colour input is usually left on. */
const COLORS = ['#8080FF', '#FF8080', '#80C080', '#FFC080', '#C080FF', '#80D0D0'];

const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

/** What one ticked weekday holds while the form is being filled in. */
type DayDraft = {
  on: boolean;
  startTime: string;
  endTime: string;
  room: TermRoom | null;
};

const EMPTY_DAY: DayDraft = { on: false, startTime: '', endTime: '', room: null };

type FieldKey = 'subject' | 'extraSubject' | 'extraObjective' | 'teacher' | 'days';
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Which sheet is open, and for which weekday when it is a day's own picker. */
type Picker =
  | { kind: 'subject' }
  | { kind: 'start' | 'end' | 'room'; day: string }
  | null;

function fill(template: string, values: Record<string, string | number>) {
  return Object.keys(values).reduce(
    (text, key) => text.replace(`{${key}}`, String(values[key])),
    template,
  );
}

export default function TermBookingScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const staffId = user?.staffId ?? '';

  const [options, setOptions] = useState<TermFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [extra, setExtra] = useState(false);
  const [subject, setSubject] = useState<TeachingSubject | null>(null);
  const [extraSubject, setExtraSubject] = useState('');
  const [extraSection, setExtraSection] = useState('');
  const [extraObjective, setExtraObjective] = useState('');
  const [teacher, setTeacher] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  /** Keyed by the server's day name — 'Monday' … 'Sunday'. */
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});

  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [picker, setPicker] = useState<Picker>(null);
  const [rooms, setRooms] = useState<TermRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!staffId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getTermFormOptions(staffId);
        if (cancelled) return;

        setOptions(data);
        setTeacher(data.teacher);
        setColor(data.default_color || COLORS[0]);
        setDrafts(
          Object.fromEntries(data.days.map((d) => [d.day, { ...EMPTY_DAY }])),
        );
        // The toggle starts off, whatever the subject list holds — the same
        // state termbook.php's checkbox loads in. Booking against a subject you
        // teach is the ordinary case; "อื่นๆ" is the exception, and an
        // exception should be chosen rather than arrived in.
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

  const clearError = useCallback((field: FieldKey) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const patchDay = useCallback((day: string, patch: Partial<DayDraft>) => {
    setDrafts((current) => ({
      ...current,
      [day]: { ...(current[day] ?? EMPTY_DAY), ...patch },
    }));
  }, []);

  const activeDays = useMemo(
    () => (options?.days ?? []).filter((d) => drafts[d.day]?.on),
    [options, drafts],
  );

  /** Bookings this form would write — the number that matters. */
  const totalSlots = useMemo(
    () => activeDays.reduce((sum, d) => sum + d.date_count, 0),
    [activeDays],
  );

  const openDayPicker = useCallback(
    async (kind: 'start' | 'end' | 'room', day: string) => {
      const draft = drafts[day] ?? EMPTY_DAY;

      // The same ordering จองทั่วไป uses, per day: a room list has no meaning
      // before the window it would be free in is known.
      if (kind === 'end' && !draft.startTime) {
        showToast(TEXT.BOOKING_ROOM_STEP_NEED_START_TIME, 'error');
        return;
      }

      if (kind === 'room') {
        if (!draft.startTime || !draft.endTime) {
          showToast(TEXT.BOOKING_ROOM_STEP_NEED_TIME, 'error');
          return;
        }
        if (draft.startTime >= draft.endTime) {
          showToast(TEXT.BOOKING_ROOM_TIME_ORDER_ERROR, 'error');
          return;
        }

        setPicker({ kind, day });
        setRoomsLoading(true);
        setRooms([]);

        try {
          setRooms(await listTermRooms(staffId, day, draft.startTime, draft.endTime));
        } catch {
          setRooms([]);
        } finally {
          setRoomsLoading(false);
        }

        return;
      }

      setPicker({ kind, day });
    },
    [drafts, staffId, showToast],
  );

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
        // A shareable room says who it is shared with — agreeing to sit
        // alongside a booking is a different decision from taking an empty
        // room, and the subject code is what makes it one or the other.
        description: r.available
          ? undefined
          : r.shareable
            ? shareLabel(r)
            : TEXT.BOOKING_ROOM_ROOM_UNAVAILABLE,
        disabled: !r.available && !r.shareable,
        trailing: <RoomOptionFacts room={r} color={c} styles={styles} />,
      })),
    [rooms, c, styles],
  );

  const subjectLabel = subject
    ? `${subject.subject_id} (${subject.section}) ${subject.subject_name}`
    : '';

  const confirmSummary = useMemo(() => {
    const lines = [extra ? extraSubject.trim() : subjectLabel];

    activeDays.forEach((d) => {
      const draft = drafts[d.day];
      if (!draft) return;
      lines.push(
        `${d.label} ${draft.startTime}-${draft.endTime} · ${draft.room?.name ?? ''} · ` +
          fill(TEXT.BOOKING_ROOM_TERM_DAY_COUNT, { count: d.date_count }),
      );
    });

    lines.push(fill(TEXT.BOOKING_ROOM_TERM_TOTAL, { count: totalSlots }));

    return lines.filter(Boolean).join('\n');
  }, [extra, extraSubject, subjectLabel, activeDays, drafts, totalSlots]);

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};

    if (extra) {
      if (!extraSubject.trim()) found.extraSubject = TEXT.BOOKING_ROOM_FIELD_REQUIRED;
      if (!extraObjective.trim()) found.extraObjective = TEXT.BOOKING_ROOM_FIELD_REQUIRED;
    } else if (!subject) {
      found.subject = TEXT.BOOKING_ROOM_FIELD_SELECT_REQUIRED;
    }

    if (!teacher.trim()) found.teacher = TEXT.BOOKING_ROOM_FIELD_REQUIRED;

    if (activeDays.length === 0) {
      found.days = TEXT.BOOKING_ROOM_TERM_NO_DAY;
    } else {
      // A ticked day with a blank room is the failure the web form's own
      // validate() checks for by name; same check, said once for all of them.
      const incomplete = activeDays.some((d) => {
        const draft = drafts[d.day];
        return (
          !draft?.startTime ||
          !draft?.endTime ||
          draft.startTime >= draft.endTime ||
          !draft.room
        );
      });

      if (incomplete) found.days = TEXT.BOOKING_ROOM_TERM_DAY_INCOMPLETE;
    }

    return found;
  };

  /**
   * Whether a booking is possible at all yet — not whether the form is
   * complete.
   *
   * termbook.php ships its submit button disabled when the person has no
   * subjects to pick, and showMe() enables it the moment the "อื่นๆ" toggle is
   * ticked. The same rule stated once: something has to say what is being
   * booked, and until the toggle is on that something can only be a subject
   * from the list.
   *
   * Everything else the form needs — days, times, rooms — is checked on submit
   * and reported per field, because those are omissions to fix rather than a
   * reason the screen cannot be used.
   */
  const canSubmit = extra || subject !== null;

  const requestSubmit = () => {
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      setError(TEXT.BOOKING_ROOM_REQUIRED_ERROR);
      return;
    }

    setError(null);
    setConfirming(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await createTermBooking({
        staff_id: staffId,
        teacher: teacher.trim(),
        bgcolor: color,
        extra,
        days: activeDays.map((d) => ({
          day: d.day,
          start_time: drafts[d.day].startTime,
          end_time: drafts[d.day].endTime,
          room_id: drafts[d.day].room!.id,
        })),
        ...(extra
          ? {
              subject_id: extraSubject.trim(),
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

      showToast(TEXT.BOOKING_ROOM_TERM_SUBMIT_SUCCESS, 'success');
      router.replace('/booking-room');
    } catch (err) {
      setConfirming(false);
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
          onRetry={() => router.replace('/booking-room/term-booking')}
        />
      </ThemedView>
    );
  }

  const noSubjects = options.subjects.length === 0;
  const hasPastWeeks = options.days.some((d) => d.past_count > 0);

  return (
    <ThemedView style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* The term is not chosen — the website posts whichever term is flagged
            default — so it is stated, not offered. */}
        <SectionCard>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>{TEXT.BOOKING_ROOM_TERM_LABEL}</ThemedText>
            <View style={styles.termRow}>
              <IconSymbol name="calendar-range" size={18} color={c.primary} />
              <View style={styles.termText}>
                <ThemedText style={styles.termValue}>
                  {fill(TEXT.BOOKING_ROOM_TERM_VALUE, options.term)}
                </ThemedText>
                <ThemedText style={styles.hint}>
                  {fill(TEXT.BOOKING_ROOM_TERM_RANGE, {
                    start: formatFullDate(options.term.startdate),
                    end: formatFullDate(options.term.enddate),
                  })}
                </ThemedText>
              </View>
            </View>

            {hasPastWeeks ? (
              <View style={styles.notice}>
                <IconSymbol name="info.circle.fill" size={16} color={c.warning} />
                <ThemedText style={styles.noticeBody}>
                  {TEXT.BOOKING_ROOM_TERM_PAST_WARNING}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.BOOKING_ROOM_EXTRA_TOGGLE}
              </ThemedText>
              {/* Never disabled, even with no subjects to pick — that is
                  precisely when someone needs to turn it on. termbook.php's
                  showMe() re-enables its submit button the moment this is
                  ticked, for the same reason. */}
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
              onPress={() => setPicker({ kind: 'subject' })}
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

        {/* The seven rows of the web form. Each expands only once ticked: an
            untouched Sunday is one line, not a set of empty controls. */}
        <SectionCard>
          <FieldLabel label={TEXT.BOOKING_ROOM_TERM_STEP_DAYS} required styles={styles} />

          {options.days.map((info) => {
            const draft = drafts[info.day] ?? EMPTY_DAY;

            return (
              <View key={info.day} style={[styles.dayCard, draft.on && styles.dayCardOn]}>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: draft.on }}
                  onPress={() => {
                    // Turning a day off drops what was chosen for it. Keeping
                    // it would let a stale room be re-submitted after the
                    // times that made it free had changed.
                    patchDay(info.day, draft.on ? { ...EMPTY_DAY } : { on: true });
                    clearError('days');
                  }}
                  style={styles.dayHead}>
                  <View style={[styles.checkbox, draft.on && styles.checkboxOn]}>
                    {draft.on ? <IconSymbol name="checkmark" size={13} color="#FFFFFF" /> : null}
                  </View>
                  <ThemedText style={[styles.dayName, draft.on && styles.dayNameOn]}>
                    {info.label}
                  </ThemedText>
                  <ThemedText style={styles.dayCount}>
                    {fill(TEXT.BOOKING_ROOM_TERM_DAY_COUNT, { count: info.date_count })}
                  </ThemedText>
                </Pressable>

                {draft.on ? (
                  <View style={styles.dayBody}>
                    <View style={styles.timeRow}>
                      <View style={styles.timeCol}>
                        <PickerField
                          value={draft.startTime}
                          placeholder={TEXT.BOOKING_ROOM_PICK_START_TIME}
                          icon="clock.fill"
                          onPress={() => void openDayPicker('start', info.day)}
                          hasError={badTimes(draft)}
                          styles={styles}
                          color={c}
                        />
                      </View>
                      <View style={styles.timeCol}>
                        <PickerField
                          value={draft.endTime}
                          placeholder={TEXT.BOOKING_ROOM_PICK_END_TIME}
                          icon="clock.fill"
                          onPress={() => void openDayPicker('end', info.day)}
                          locked={!draft.startTime}
                          hasError={badTimes(draft)}
                          styles={styles}
                          color={c}
                        />
                      </View>
                    </View>

                    {badTimes(draft) ? (
                      <ThemedText style={styles.fieldError}>
                        {TEXT.BOOKING_ROOM_TIME_ORDER_ERROR}
                      </ThemedText>
                    ) : null}

                    <PickerField
                      value={draft.room?.name ?? ''}
                      placeholder={TEXT.BOOKING_ROOM_ROOM_PLACEHOLDER}
                      onPress={() => void openDayPicker('room', info.day)}
                      locked={!draft.startTime || !draft.endTime || badTimes(draft)}
                      styles={styles}
                      color={c}
                    />

                    {draft.room ? (
                      <RoomSummary room={draft.room} styles={styles} color={c} />
                    ) : null}

                    {info.past_count > 0 ? (
                      <ThemedText style={styles.hint}>
                        {fill(TEXT.BOOKING_ROOM_TERM_PAST_NOTE, { count: info.past_count })}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}

          {errors.days ? (
            <ThemedText style={styles.fieldError}>{errors.days}</ThemedText>
          ) : totalSlots > 0 ? (
            <View style={styles.totalRow}>
              <IconSymbol name="calendar" size={16} color={c.primary} />
              <ThemedText style={styles.totalText}>
                {fill(TEXT.BOOKING_ROOM_TERM_TOTAL, { count: totalSlots })}
              </ThemedText>
            </View>
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingHorizontal: gutter }]}>
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
          title={TEXT.BOOKING_ROOM_SUBMIT}
          onPress={requestSubmit}
          loading={submitting}
          disabled={!canSubmit}
          size="lg"
          fullWidth
        />
      </View>

      {/* The pause matters more here than on จองทั่วไป: confirming writes
          dozens of rows at once, and the app has no way to cancel a booking. */}
      <ConfirmDialog
        visible={confirming}
        icon="calendar-range"
        title={TEXT.BOOKING_ROOM_TERM_CONFIRM_TITLE}
        message={confirmSummary}
        confirmLabel={TEXT.BOOKING_ROOM_CONFIRM_ACTION}
        cancelLabel={TEXT.BOOKING_ROOM_CONFIRM_CANCEL}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
        loading={submitting}
      />

      <SelectSheet
        visible={picker?.kind === 'subject'}
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
        visible={picker?.kind === 'start'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_START_TIME_LABEL}
        options={timeOptions}
        searchable={false}
        selectedId={
          picker?.kind === 'start' ? drafts[picker.day]?.startTime || undefined : undefined
        }
        onSelect={(option) => {
          if (picker?.kind !== 'start') return;
          // Changing the window can only invalidate the room chosen for the
          // old one, so it goes with it.
          patchDay(picker.day, { startTime: option.id, room: null });
          clearError('days');
        }}
      />

      <SelectSheet
        visible={picker?.kind === 'end'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_END_TIME_LABEL}
        options={timeOptions}
        searchable={false}
        selectedId={picker?.kind === 'end' ? drafts[picker.day]?.endTime || undefined : undefined}
        onSelect={(option) => {
          if (picker?.kind !== 'end') return;
          patchDay(picker.day, { endTime: option.id, room: null });
          clearError('days');
        }}
      />

      <SelectSheet
        visible={picker?.kind === 'room'}
        onClose={() => setPicker(null)}
        title={TEXT.BOOKING_ROOM_ROOM_PICK}
        searchPlaceholder={TEXT.BOOKING_ROOM_SCHEDULE_SEARCH_ROOM}
        options={roomOptions}
        selectedId={picker?.kind === 'room' ? drafts[picker.day]?.room?.id : undefined}
        emptyMessage={
          roomsLoading ? TEXT.SHARED_LOADING_DATA_TITLE : TEXT.BOOKING_ROOM_ROOM_NONE_FREE
        }
        onSelect={(option) => {
          if (picker?.kind !== 'room') return;
          patchDay(picker.day, { room: rooms.find((r) => r.id === option.id) ?? null });
          clearError('days');
        }}
      />
    </ThemedView>
  );
}

function Header() {
  return (
    <ScreenHeader
      title={TEXT.BOOKING_ROOM_TERM_TITLE}
      backHref="/booking-room/select-booking"
      titleInNavBar
      showHomeButton={false}
      tone="primary"
    />
  );
}

function badTimes(draft: DayDraft) {
  return Boolean(draft.startTime && draft.endTime && draft.startTime >= draft.endTime);
}

/** Who a shareable room is already booked for. */
function shareLabel(room: TermRoom) {
  const mine = room.conflicts.every((conflict) => conflict.mine);

  if (mine) return TEXT.BOOKING_ROOM_TERM_ROOM_MINE;

  const subjects = Array.from(new Set(room.conflicts.map((conflict) => conflict.subject_id)));

  return fill(TEXT.BOOKING_ROOM_TERM_ROOM_SHARED, { subject: subjects.join(', ') });
}

/** A room row's facts in the picker: seats, then what it comes with. */
function RoomOptionFacts({
  room,
  color,
  styles,
}: {
  room: TermRoom;
  color: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  if (room.capacity <= 0 && !room.projector && !room.mic) return null;

  return (
    <View style={styles.equipmentRow}>
      {room.capacity > 0 ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`${room.capacity} ${TEXT.BOOKING_ROOM_SCHEDULE_SEAT_UNIT}`}
          style={styles.equipmentCapacity}>
          <IconSymbol name="person.2.fill" size={20} color={color.textMuted} />
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

/** What the chosen room is, once the sheet has closed over its own list. */
function RoomSummary({
  room,
  styles,
  color,
}: {
  room: TermRoom;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  const facts: { icon: IconSymbolName; label: string }[] = [];

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

  return (
    <View style={styles.roomFactsWrap}>
      {facts.length === 0 ? (
        <ThemedText style={styles.hint}>{TEXT.BOOKING_ROOM_EQUIPMENT_NONE}</ThemedText>
      ) : (
        <View style={styles.roomFacts}>
          {facts.map((fact) => (
            <View key={fact.icon} style={styles.roomFact}>
              <IconSymbol name={fact.icon} size={16} color={color.textMuted} />
              <ThemedText style={styles.roomFactText}>{fact.label}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Sharing is a real decision, so it is repeated on the field and not
          left behind in the sheet the person has already closed. */}
      {!room.available ? (
        <View style={styles.sharedRow}>
          <IconSymbol name="person.2.fill" size={14} color={color.warning} />
          <ThemedText style={styles.sharedText}>{shareLabel(room)}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

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
  label?: string;
  required?: boolean;
  error?: string;
  value: string;
  placeholder: string;
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

    // The absence forms' field shape, shared with general-booking.
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
    selectButtonLocked: { borderBottomColor: c.border },
    inputError: { borderBottomWidth: 1.5, borderBottomColor: c.danger },
    selectText: { flex: 1, fontSize: 16, color: c.text, fontFamily: AppFonts.psuRegular },
    placeholder: { color: c.textFaint },
    chevron: { fontSize: 18, lineHeight: 22, color: c.textMuted },
    chevronDisabled: { color: c.textFaint },
    fieldPressed: { opacity: 0.7 },
    fieldError: { fontSize: 12, lineHeight: 17, color: c.danger },
    hint: { fontSize: 12, lineHeight: 17, color: c.textMuted },

    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    termRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    termText: { flex: 1, gap: 2 },
    termValue: { fontSize: 15, color: c.text, fontFamily: AppFonts.psuBold },

    // One weekday. Collapsed it is a single tappable line; ticked it grows the
    // controls for that day only.
    dayCard: {
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
    },
    dayCardOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
    dayHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    dayName: { flex: 1, fontSize: 15, color: c.text },
    dayNameOn: { fontFamily: AppFonts.psuBold },
    dayCount: { fontSize: 12, color: c.textMuted },
    dayBody: {
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },

    timeRow: { flexDirection: 'row', gap: 12 },
    timeCol: { flex: 1 },

    totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
    totalText: { fontSize: 14, color: c.primary, fontFamily: AppFonts.psuBold },

    notice: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.warningSoft,
    },
    noticeText: { flex: 1, gap: 2 },
    noticeTitle: { fontSize: 13, color: c.text, fontFamily: AppFonts.psuBold },
    noticeBody: { flex: 1, fontSize: 12, lineHeight: 18, color: c.textMuted },

    equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    equipmentCapacity: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    equipmentCapacityText: { fontSize: 13, lineHeight: 18, color: c.textMuted },

    roomFactsWrap: { gap: 6, paddingBottom: 8 },
    roomFacts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
    roomFact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    roomFactText: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    sharedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sharedText: { flex: 1, fontSize: 12, lineHeight: 17, color: c.warning },

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
