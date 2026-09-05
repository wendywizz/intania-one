/**
 * Meeting Room → แบบฟอร์มขอใช้ห้องประชุม.
 *
 * Reached directly from select-room-type.tsx (ห้องประชุม card) — unlike
 * classroom booking, meeting-room has no further style choice underneath it.
 *
 * Structured like general-booking.tsx (SectionCard-grouped fields, staged
 * server-side availability checks, validate-everything-at-once, a confirm
 * modal before the real submit) but simpler in two ways that are deliberate,
 * not omissions: no cart step — a request already bundles every date under
 * one atomic order, so there is nothing to stage — and no "add extra"
 * toggle, since every field here applies to every request the same way.
 *
 * One room for the whole request, not one per date (confirmed from the
 * legacy site's own user_order2.php and mirrored by
 * Request_Order_Model::create_request()) — so the room/arrangement pickers
 * sit above the repeatable date list, not inside each row.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { TimePickerField } from '@/components/time-picker-field';
import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { ModalSelectField } from '@/components/modal-select-field';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextField } from '@/components/ui/text-field';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  checkMeetingRoomAvailability,
  createMeetingRoomRequest,
  getMeetingRoomOptions,
  type MeetingRoomOptions,
} from '@/services/meetingRoomService';

type DateRow = {
  id: string;
  date: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  /** null = not yet checked (or incomplete); set after a completed row is checked. */
  available: boolean | null;
};

type FieldErrors = {
  detail?: string;
  typeId?: string;
  totalMan?: string;
  roomId?: string;
  arrangementType?: string;
  dates?: string;
  leaderId?: string;
};

function newRow(): DateRow {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: null, startTime: null, endTime: null, available: null };
}

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

export default function MeetingRoomFormScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const { showToast } = useToast();
  const staffId = user?.staffId ?? '';

  const [options, setOptions] = useState<MeetingRoomOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detail, setDetail] = useState('');
  const [typeId, setTypeId] = useState('');
  const [totalMan, setTotalMan] = useState('');
  const [roomId, setRoomId] = useState('');
  const [arrangementType, setArrangementType] = useState('');
  const [dateRows, setDateRows] = useState<DateRow[]>([newRow()]);
  const [audioQty, setAudioQty] = useState<Record<number, string>>({});
  const [foodQty, setFoodQty] = useState<Record<number, string>>({});
  const [leaderId, setLeaderId] = useState('');
  const [comment, setComment] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    if (!staffId) {
      setLoadingOptions(false);
      return;
    }
    setLoadingOptions(true);
    setLoadError(null);
    try {
      setOptions(await getMeetingRoomOptions(staffId));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : TEXT.MEETING_ROOM_FORM_LOAD_ERROR);
    } finally {
      setLoadingOptions(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRoom = useMemo(
    () => options?.rooms.find((r) => String(r.id) === roomId) ?? null,
    [options, roomId],
  );

  const arrangementOptions = useMemo(
    () =>
      (selectedRoom?.arrangements ?? []).map((a) => ({
        label: `${a.detail} (${a.capacity})`,
        value: String(a.type),
      })),
    [selectedRoom],
  );

  const typeOptions = useMemo(
    () => (options?.request_types ?? []).map((t) => ({ label: t.name, value: String(t.id) })),
    [options],
  );

  const roomOptions = useMemo(
    () => (options?.rooms ?? []).map((r) => ({ label: r.name, value: String(r.id) })),
    [options],
  );

  const leaderOptions = useMemo(
    () => (options?.leaders ?? []).map((l) => ({ label: l.name, value: String(l.staff_id) })),
    [options],
  );

  // Picking a room resets the arrangement (and its checked availability,
  // since a conflict was checked against the old room) — a stale selection
  // from a different room would otherwise silently carry over.
  const selectRoom = useCallback((value: string) => {
    setRoomId(value);
    setArrangementType('');
    setDateRows((rows) => rows.map((r) => ({ ...r, available: null })));
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<DateRow>) => {
    setDateRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, available: null } : r)));
  }, []);

  // Checked once a row's date+start+end (and the request's room) are all set
  // — not on every keystroke, the same staged approach general-booking.tsx
  // uses. Not the last word: create_action() re-checks server-side and is
  // what's actually enforced.
  const checkRow = useCallback(
    async (id: string) => {
      setDateRows((rows) => {
        const row = rows.find((r) => r.id === id);
        if (!row || !roomId || !row.date || !row.startTime || !row.endTime) return rows;

        void (async () => {
          try {
            const result = await checkMeetingRoomAvailability({
              roomId,
              date: toISODate(row.date!),
              startTime: toHHMM(row.startTime!),
              endTime: toHHMM(row.endTime!),
            });
            setDateRows((current) =>
              current.map((r) => (r.id === id ? { ...r, available: result.available } : r)),
            );
          } catch {
            // A failed pre-check just leaves availability unknown; the real
            // enforcement is server-side on submit either way.
          }
        })();

        return rows;
      });
    },
    [roomId],
  );

  const addRow = useCallback(() => setDateRows((rows) => [...rows, newRow()]), []);
  const removeRow = useCallback(
    (id: string) => setDateRows((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows)),
    [],
  );

  const validate = useCallback((): FieldErrors => {
    const next: FieldErrors = {};

    if (!detail.trim()) next.detail = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (!typeId) next.typeId = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (!totalMan.trim() || Number(totalMan) <= 0) next.totalMan = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (!roomId) next.roomId = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (arrangementOptions.length > 0 && !arrangementType) {
      next.arrangementType = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    }
    if (!leaderId) next.leaderId = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;

    const complete = dateRows.filter((r) => r.date && r.startTime && r.endTime);
    if (complete.length === 0) {
      next.dates = TEXT.MEETING_ROOM_FORM_NEED_ONE_DATE;
    } else {
      const today = todayISO();
      const hasPast = complete.some((r) => toISODate(r.date!) < today);
      const hasBadOrder = complete.some((r) => toHHMM(r.endTime!) <= toHHMM(r.startTime!));
      if (hasPast) next.dates = TEXT.MEETING_ROOM_FORM_PAST_DATE_ERROR;
      else if (hasBadOrder) next.dates = TEXT.MEETING_ROOM_FORM_TIME_ORDER_ERROR;
    }

    return next;
  }, [detail, typeId, totalMan, roomId, arrangementType, arrangementOptions, leaderId, dateRows]);

  const requestSubmit = useCallback(() => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitError('');
    setConfirmOpen(true);
  }, [validate]);

  const confirmSubmit = useCallback(async () => {
    if (!staffId) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const things = [
        ...Object.entries(audioQty)
          .filter(([, v]) => Number(v) > 0)
          .map(([id, v]) => ({ thing_id: Number(id), thing_type: 1 as const, total: Number(v) })),
        ...Object.entries(foodQty)
          .filter(([, v]) => Number(v) > 0)
          .map(([id, v]) => ({ thing_id: Number(id), thing_type: 2 as const, total: Number(v) })),
      ];

      await createMeetingRoomRequest({
        uni_staff_id: staffId,
        detail: detail.trim(),
        type_id: Number(typeId),
        total_man: Number(totalMan),
        room_id: Number(roomId),
        arrangement_type: arrangementType ? Number(arrangementType) : 0,
        leader_id: Number(leaderId),
        comment: comment.trim(),
        things,
        dates: dateRows
          .filter((r) => r.date && r.startTime && r.endTime)
          .map((r) => ({
            date: toISODate(r.date!),
            start_time: toHHMM(r.startTime!),
            end_time: toHHMM(r.endTime!),
          })),
      });

      setConfirmOpen(false);
      showToast(TEXT.MEETING_ROOM_SUBMIT_SUCCESS, 'success');
      router.replace('/booking-room');
    } catch (err) {
      setConfirmOpen(false);
      // The server's own wording — a 409 conflict or a 422 ineligible-leader
      // message tells the person what to fix, and a generic error would not.
      setSubmitError(err instanceof Error ? err.message : TEXT.MEETING_ROOM_SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  }, [staffId, detail, typeId, totalMan, roomId, arrangementType, leaderId, comment, dateRows, audioQty, foodQty, showToast]);

  if (loadingOptions) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title={TEXT.MEETING_ROOM_FORM_NAV_TITLE}
          backHref="/booking-room/select-room-type"
          titleInNavBar
          showHomeButton={false}
          tone="primary"
        />
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      </ThemedView>
    );
  }

  if (loadError || !options) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title={TEXT.MEETING_ROOM_FORM_NAV_TITLE}
          backHref="/booking-room/select-room-type"
          titleInNavBar
          showHomeButton={false}
          tone="primary"
        />
        <ErrorState
          title={TEXT.MEETING_ROOM_FORM_LOAD_ERROR}
          message={loadError ?? ''}
          onRetry={() => void load()}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.MEETING_ROOM_FORM_NAV_TITLE}
        backHref="/booking-room/select-room-type"
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionCard style={styles.card}>
          <TextField
            label={TEXT.MEETING_ROOM_FORM_PURPOSE_LABEL}
            required
            value={detail}
            onChangeText={setDetail}
            error={errors.detail}
          />
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.MEETING_ROOM_FORM_TYPE_LABEL} <ThemedText style={{ color: c.danger }}>*</ThemedText>
            </ThemedText>
            <ModalSelectField
              title={TEXT.MEETING_ROOM_FORM_TYPE_PICK}
              placeholder={TEXT.MEETING_ROOM_FORM_TYPE_PICK}
              options={typeOptions}
              value={typeId}
              onSelect={setTypeId}
              hasError={Boolean(errors.typeId)}
            />
          </View>
          <TextField
            label={TEXT.MEETING_ROOM_FORM_MAN_LABEL}
            required
            value={totalMan}
            onChangeText={setTotalMan}
            keyboardType="number-pad"
            error={errors.totalMan}
          />
        </SectionCard>

        <SectionCard style={styles.card}>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.MEETING_ROOM_FORM_ROOM_LABEL} <ThemedText style={{ color: c.danger }}>*</ThemedText>
            </ThemedText>
            <ModalSelectField
              title={TEXT.MEETING_ROOM_FORM_ROOM_PICK}
              placeholder={TEXT.MEETING_ROOM_FORM_ROOM_PICK}
              options={roomOptions}
              value={roomId}
              onSelect={selectRoom}
              hasError={Boolean(errors.roomId)}
            />
          </View>
          {arrangementOptions.length > 0 ? (
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.MEETING_ROOM_FORM_ARRANGEMENT_LABEL}{' '}
                <ThemedText style={{ color: c.danger }}>*</ThemedText>
              </ThemedText>
              <ModalSelectField
                title={TEXT.MEETING_ROOM_FORM_ARRANGEMENT_PICK}
                placeholder={TEXT.MEETING_ROOM_FORM_ARRANGEMENT_PICK}
                options={arrangementOptions}
                value={arrangementType}
                onSelect={setArrangementType}
                hasError={Boolean(errors.arrangementType)}
              />
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title={TEXT.MEETING_ROOM_FORM_DATES_LABEL} style={styles.card}>
          {dateRows.map((row, index) => (
            <View key={row.id} style={styles.dateRowWrap}>
              <View style={styles.dateRowHeader}>
                <ThemedText style={styles.dateRowIndex}>#{index + 1}</ThemedText>
                {dateRows.length > 1 ? (
                  <Button
                    title={TEXT.MEETING_ROOM_FORM_REMOVE_DATE}
                    variant="ghost"
                    size="sm"
                    icon="trash.fill"
                    onPress={() => removeRow(row.id)}
                  />
                ) : null}
              </View>
              <DatePickerField
                label={TEXT.MEETING_ROOM_FORM_DATE_LABEL}
                value={row.date}
                minimumDate={new Date()}
                allowWeekends
                onChange={(date) => {
                  updateRow(row.id, { date });
                  void checkRow(row.id);
                }}
              />
              <View style={styles.timeRow}>
                <TimePickerField
                  label={TEXT.MEETING_ROOM_FORM_START_TIME_LABEL}
                  value={row.startTime}
                  onChange={(startTime) => {
                    updateRow(row.id, { startTime });
                    void checkRow(row.id);
                  }}
                />
                <TimePickerField
                  label={TEXT.MEETING_ROOM_FORM_END_TIME_LABEL}
                  value={row.endTime}
                  onChange={(endTime) => {
                    updateRow(row.id, { endTime });
                    void checkRow(row.id);
                  }}
                />
              </View>
              {row.available === false ? (
                <View style={styles.warningRow}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
                  <ThemedText style={[styles.warningText, { color: c.danger }]}>
                    {TEXT.MEETING_ROOM_FORM_ROOM_UNAVAILABLE}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ))}
          {errors.dates ? <ThemedText style={styles.fieldError}>{errors.dates}</ThemedText> : null}
          <Button
            title={TEXT.MEETING_ROOM_FORM_ADD_DATE}
            variant="secondary"
            icon="plus"
            onPress={addRow}
          />
        </SectionCard>

        {options.things_audio.length > 0 ? (
          <SectionCard
            title={TEXT.MEETING_ROOM_FORM_AUDIO_LABEL}
            style={styles.card}>
            <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_FORM_AUDIO_HINT}</ThemedText>
            {options.things_audio.map((item) => (
              <TextField
                key={item.id}
                label={item.detail}
                value={audioQty[item.id] ?? ''}
                onChangeText={(v) => setAudioQty((q) => ({ ...q, [item.id]: v }))}
                keyboardType="number-pad"
              />
            ))}
          </SectionCard>
        ) : null}

        {options.things_food.length > 0 ? (
          <SectionCard title={TEXT.MEETING_ROOM_FORM_FOOD_LABEL} style={styles.card}>
            <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_FORM_FOOD_HINT}</ThemedText>
            {options.things_food.map((item) => (
              <TextField
                key={item.id}
                label={item.detail}
                value={foodQty[item.id] ?? ''}
                onChangeText={(v) => setFoodQty((q) => ({ ...q, [item.id]: v }))}
                keyboardType="number-pad"
              />
            ))}
          </SectionCard>
        ) : null}

        <SectionCard style={styles.card}>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.MEETING_ROOM_FORM_LEADER_LABEL}{' '}
              <ThemedText style={{ color: c.danger }}>*</ThemedText>
            </ThemedText>
            {leaderOptions.length === 0 ? (
              <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_FORM_LEADER_NONE}</ThemedText>
            ) : (
              <ModalSelectField
                title={TEXT.MEETING_ROOM_FORM_LEADER_PICK}
                placeholder={TEXT.MEETING_ROOM_FORM_LEADER_PICK}
                options={leaderOptions}
                value={leaderId}
                onSelect={setLeaderId}
                hasError={Boolean(errors.leaderId)}
              />
            )}
          </View>
          <TextField
            label={TEXT.MEETING_ROOM_FORM_COMMENT_LABEL}
            value={comment}
            onChangeText={setComment}
            multiline
            optional
          />
        </SectionCard>

        {submitError ? <ThemedText style={styles.fieldError}>{submitError}</ThemedText> : null}
        {Object.keys(errors).length > 0 ? (
          <ThemedText style={styles.fieldError}>{TEXT.BOOKING_ROOM_REQUIRED_ERROR}</ThemedText>
        ) : null}

        <Button
          title={TEXT.MEETING_ROOM_CONFIRM_ACTION}
          onPress={requestSubmit}
          fullWidth
          style={styles.submitButton}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        loading={submitting}
        title={TEXT.MEETING_ROOM_CONFIRM_TITLE}
        message={TEXT.MEETING_ROOM_CONFIRM_MESSAGE}
        confirmLabel={TEXT.MEETING_ROOM_CONFIRM_ACTION}
        cancelLabel={TEXT.MEETING_ROOM_CONFIRM_CANCEL}
        onConfirm={() => void confirmSubmit()}
        onCancel={() => setConfirmOpen(false)}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    scroll: { padding: 16, paddingBottom: 32, gap: 12 },
    card: { gap: 14 },
    field: { gap: 8 },
    fieldLabel: { fontSize: 14, lineHeight: 20, color: c.text, fontFamily: AppFonts.psuBold },
    fieldError: { fontSize: 12, lineHeight: 17, color: c.danger, fontFamily: AppFonts.psuRegular },
    hint: { fontSize: 12, lineHeight: 17, color: c.textMuted, fontFamily: AppFonts.psuRegular },
    dateRowWrap: {
      gap: 10,
      paddingBottom: 14,
      marginBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    dateRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateRowIndex: { fontSize: 13, color: c.textMuted, fontFamily: AppFonts.psuBold },
    timeRow: { flexDirection: 'row', gap: 16 },
    warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    warningText: { fontSize: 12, fontFamily: AppFonts.psuRegular },
    submitButton: { marginTop: 8 },
  });
