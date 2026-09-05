/**
 * Meeting Room → แบบฟอร์มขอใช้ห้องประชุม.
 *
 * A 5-step wizard, same stepper shape as repair-computer's
 * assign-job.tsx (numbered circles + connecting lines + a fixed
 * back/next bar) — the pattern the user asked to reuse here:
 *
 *   1. รายละเอียด      — purpose, type, headcount, room + arrangement
 *   2. วันและเวลาที่ใช้ห้อง — each slot added/edited on its own page
 *      (meeting-room-date.tsx), listed here with an "เพิ่มวันและเวลา" button
 *   3. โสตทัศนูปกรณ์    — hidden behind a Toggle; off by default, no inputs shown
 *   4. อาหาร            — same toggle-then-reveal shape as step 3
 *   5. ผู้อนุมัติ/สรุป   — leader + comment, folded together with the full
 *      read-only recap and the real submit button (no separate summary page)
 *
 * Reached directly from select-room-type.tsx (ห้องประชุม card) — unlike
 * classroom booking, meeting-room has no further style choice underneath it.
 *
 * One room for the whole request, not one per date (confirmed from the
 * legacy site's own user_order2.php and mirrored by
 * Request_Order_Model::create_request()) — so the room/arrangement pickers
 * live in step 1, not next to each date.
 *
 * No cart step — a request already bundles every date under one atomic
 * order, so there is nothing to stage the way classroom booking's cart does.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
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
import { InfinityLoader } from '@/components/infinity-loader';
import { ScreenHeader } from '@/components/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailInfoCard, type DetailRow } from '@/components/ui/detail-info-card';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { SelectSheet } from '@/components/ui/select-sheet';
import { Toggle } from '@/components/ui/toggle';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  createMeetingRoomRequest,
  getMeetingRoomOptions,
  type MeetingRoomOptions,
} from '@/services/meetingRoomService';
import {
  clearDraftMeetingRoomDates,
  removeDraftMeetingRoomDate,
  useDraftMeetingRoomDates,
  type DraftMeetingRoomDate,
} from '@/stores/draftMeetingRoomDates';
import { formatFullDate } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

// Removes the browser focus outline on web so an active input shows only its
// bottom border — same fix general-booking.tsx uses for its own text fields.
const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

type FormStep = 'basics' | 'dates' | 'audio' | 'food' | 'approval';
const STEP_ORDER: FormStep[] = ['basics', 'dates', 'audio', 'food', 'approval'];

type FieldErrors = {
  detail?: string;
  typeId?: string;
  totalMan?: string;
  roomId?: string;
  arrangementType?: string;
  dates?: string;
  leaderId?: string;
};

function dateEditHref(roomId: string, id?: string): Href {
  return {
    pathname: '/booking-room/meeting-room-date',
    params: id ? { room_id: roomId, id } : { room_id: roomId },
  } as unknown as Href;
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

  const [step, setStep] = useState<FormStep>('basics');

  const [detail, setDetail] = useState('');
  const [typeId, setTypeId] = useState('');
  const [totalMan, setTotalMan] = useState('');
  const [roomId, setRoomId] = useState('');
  const [arrangementType, setArrangementType] = useState('');

  // Each slot lives on its own page (meeting-room-date.tsx) and is read here
  // reactively — see stores/draftMeetingRoomDates.ts for why.
  const draftDates = useDraftMeetingRoomDates();

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioQty, setAudioQty] = useState<Record<number, string>>({});
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [foodQty, setFoodQty] = useState<Record<number, string>>({});

  const [leaderId, setLeaderId] = useState('');
  const [comment, setComment] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // A fresh wizard session starts with a clean slate — a slot left over from
  // an abandoned attempt must never leak into the next one. Runs once: this
  // screen stays mounted while meeting-room-date.tsx is pushed on top of it.
  useEffect(() => {
    clearDraftMeetingRoomDates();
  }, []);

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
    () =>
      (options?.leaders ?? []).map((l) => ({
        label: l.name,
        value: String(l.staff_id),
        // The photo API keys on UNI_STAFF_ID, not this module's usual
        // internal staff_id — fall back to staff_id itself if a leader has
        // no UNI_STAFF_ID on record (UserAvatar just shows the placeholder
        // if that id doesn't resolve to a photo either).
        leading: <UserAvatar staffId={l.uni_staff_id ?? l.staff_id} size={32} />,
      })),
    [options],
  );

  const selectRoom = useCallback((value: string) => {
    setRoomId(value);
    setArrangementType('');
  }, []);

  // Turning a toggle off clears its quantities too — a hidden field holding a
  // value the person can no longer see would silently still be submitted.
  const setAudioEnabledAndClear = useCallback((next: boolean) => {
    setAudioEnabled(next);
    if (!next) setAudioQty({});
  }, []);
  const setFoodEnabledAndClear = useCallback((next: boolean) => {
    setFoodEnabled(next);
    if (!next) setFoodQty({});
  }, []);

  const validateBasics = useCallback((): FieldErrors => {
    const next: FieldErrors = {};

    if (!detail.trim()) next.detail = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (!typeId) next.typeId = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (!totalMan.trim() || Number(totalMan) <= 0) next.totalMan = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (!roomId) next.roomId = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    if (arrangementOptions.length > 0 && !arrangementType) {
      next.arrangementType = TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR;
    }

    return next;
  }, [detail, typeId, totalMan, roomId, arrangementType, arrangementOptions]);

  // Each slot is already validated (past date, time order) at the point it
  // was entered on meeting-room-date.tsx — the only thing left to check here
  // is that at least one exists.
  const validateDates = useCallback((): FieldErrors => {
    return draftDates.length === 0 ? { dates: TEXT.MEETING_ROOM_FORM_NEED_ONE_DATE } : {};
  }, [draftDates]);

  const validateApproval = useCallback((): FieldErrors => {
    return leaderId ? {} : { leaderId: TEXT.MEETING_ROOM_FORM_REQUIRED_ERROR };
  }, [leaderId]);

  const goNext = useCallback(() => {
    if (step === 'basics') {
      const next = validateBasics();
      setErrors(next);
      if (Object.keys(next).length > 0) return;
    }
    if (step === 'dates') {
      const next = validateDates();
      setErrors(next);
      if (Object.keys(next).length > 0) return;
    }

    setErrors({});
    const index = STEP_ORDER.indexOf(step);
    if (index < STEP_ORDER.length - 1) setStep(STEP_ORDER[index + 1]);
  }, [step, validateBasics, validateDates]);

  const goBack = useCallback(() => {
    const index = STEP_ORDER.indexOf(step);
    if (index === 0) {
      router.replace('/booking-room/select-room-type');
      return;
    }
    setStep(STEP_ORDER[index - 1]);
  }, [step]);

  // The last step's own "confirm" button — validates the one field that step
  // still owns (the leader) before opening the confirm modal.
  const requestSubmit = useCallback(() => {
    const next = validateApproval();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setConfirmOpen(true);
  }, [validateApproval]);

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
        dates: draftDates.map((r) => ({ date: r.date, start_time: r.startTime, end_time: r.endTime })),
      });

      clearDraftMeetingRoomDates();
      setConfirmOpen(false);
      showToast(TEXT.MEETING_ROOM_SUBMIT_SUCCESS, 'success');
      router.replace('/booking-room');
    } catch (err) {
      setConfirmOpen(false);
      setSubmitError(err instanceof Error ? err.message : TEXT.MEETING_ROOM_SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  }, [staffId, detail, typeId, totalMan, roomId, arrangementType, leaderId, comment, draftDates, audioQty, foodQty, showToast]);

  // ── Step content ──────────────────────────────────────────────────────────

  const renderBasicsStep = () => (
    <>
      <SectionCard style={styles.card}>
        <FormTextField
          label={TEXT.MEETING_ROOM_FORM_PURPOSE_LABEL}
          required
          value={detail}
          onChangeText={setDetail}
          placeholder={TEXT.MEETING_ROOM_FORM_PURPOSE_PLACEHOLDER}
          error={errors.detail}
          styles={styles}
          color={c}
        />
        <SelectField
          label={TEXT.MEETING_ROOM_FORM_TYPE_LABEL}
          required
          title={TEXT.MEETING_ROOM_FORM_TYPE_PICK}
          placeholder={TEXT.MEETING_ROOM_FORM_TYPE_PICK}
          options={typeOptions}
          value={typeId}
          onSelect={setTypeId}
          error={errors.typeId}
          styles={styles}
          color={c}
        />
        <FormTextField
          label={TEXT.MEETING_ROOM_FORM_MAN_LABEL}
          required
          value={totalMan}
          onChangeText={setTotalMan}
          keyboardType="number-pad"
          placeholder={TEXT.MEETING_ROOM_FORM_MAN_PLACEHOLDER}
          error={errors.totalMan}
          styles={styles}
          color={c}
        />
      </SectionCard>

      <SectionCard style={styles.card}>
        <SelectField
          label={TEXT.MEETING_ROOM_FORM_ROOM_LABEL}
          required
          title={TEXT.MEETING_ROOM_FORM_ROOM_PICK}
          placeholder={TEXT.MEETING_ROOM_FORM_ROOM_PICK}
          options={roomOptions}
          value={roomId}
          onSelect={selectRoom}
          error={errors.roomId}
          styles={styles}
          color={c}
        />
        {arrangementOptions.length > 0 ? (
          <SelectField
            label={TEXT.MEETING_ROOM_FORM_ARRANGEMENT_LABEL}
            required
            title={TEXT.MEETING_ROOM_FORM_ARRANGEMENT_PICK}
            placeholder={TEXT.MEETING_ROOM_FORM_ARRANGEMENT_PICK}
            options={arrangementOptions}
            value={arrangementType}
            onSelect={setArrangementType}
            error={errors.arrangementType}
            styles={styles}
            color={c}
          />
        ) : null}
      </SectionCard>
    </>
  );

  const renderDatesStep = () => (
    <SectionCard title={TEXT.MEETING_ROOM_FORM_DATES_LABEL} style={styles.card}>
      {draftDates.length === 0 ? (
        <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_FORM_DATES_EMPTY}</ThemedText>
      ) : (
        draftDates.map((row) => (
          // Two sibling Pressables, not one inside the other — a Pressable
          // with accessibilityRole="button" renders as a real HTML <button>
          // on web, and a <button> can never contain another <button>.
          <View key={row.id} style={styles.dateRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navPush(dateEditHref(roomId, row.id))}
              style={({ pressed }) => [styles.dateRowText, pressed && styles.fieldPressed]}>
              <ThemedText style={styles.dateRowDate}>{formatFullDate(row.date)}</ThemedText>
              <ThemedText style={styles.dateRowTime}>
                {row.startTime}-{row.endTime}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.MEETING_ROOM_FORM_REMOVE_DATE}
              hitSlop={8}
              onPress={() => removeDraftMeetingRoomDate(row.id)}>
              <IconSymbol name="trash.fill" size={18} color={c.danger} />
            </Pressable>
          </View>
        ))
      )}
      {errors.dates ? <ThemedText style={styles.fieldError}>{errors.dates}</ThemedText> : null}
      <Button
        title={TEXT.MEETING_ROOM_FORM_ADD_DATE}
        variant="secondary"
        icon="plus"
        onPress={() => navPush(dateEditHref(roomId))}
      />
    </SectionCard>
  );

  const renderToggleThingsStep = (
    label: string,
    enabled: boolean,
    onToggle: (next: boolean) => void,
    items: MeetingRoomOptions['things_audio'],
    qty: Record<number, string>,
    setQty: (updater: (q: Record<number, string>) => Record<number, string>) => void,
  ) => (
    <SectionCard style={styles.card}>
      <View style={styles.toggleRow}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        <Toggle value={enabled} onValueChange={onToggle} />
      </View>
      {enabled ? (
        items.length === 0 ? (
          <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_SUMMARY_NONE}</ThemedText>
        ) : (
          items.map((item) => (
            <FormTextField
              key={item.id}
              label={item.detail}
              value={qty[item.id] ?? ''}
              onChangeText={(v) => setQty((q) => ({ ...q, [item.id]: v }))}
              keyboardType="number-pad"
              placeholder="0"
              styles={styles}
              color={c}
            />
          ))
        )
      ) : null}
    </SectionCard>
  );

  const roomSummaryLabel = selectedRoom
    ? `${selectedRoom.name}${arrangementOptions.find((a) => a.value === arrangementType) ? ` (${arrangementOptions.find((a) => a.value === arrangementType)?.label})` : ''}`
    : '';

  // Only what was actually requested (qty > 0) — the same items step 2/3 show
  // regardless of quantity are pared down here to what the summary is for.
  const selectedAudio = useMemo(
    () => getSelectedThings(options?.things_audio ?? [], audioQty),
    [options, audioQty],
  );
  const selectedFood = useMemo(
    () => getSelectedThings(options?.things_food ?? [], foodQty),
    [options, foodQty],
  );

  const summaryRows: DetailRow[] = [
    { label: TEXT.MEETING_ROOM_FORM_PURPOSE_LABEL, value: detail },
    { label: TEXT.MEETING_ROOM_FORM_TYPE_LABEL, value: typeOptions.find((t) => t.value === typeId)?.label ?? '' },
    { label: TEXT.MEETING_ROOM_FORM_MAN_LABEL, value: totalMan },
    { label: TEXT.MEETING_ROOM_FORM_ROOM_LABEL, value: roomSummaryLabel },
    { label: TEXT.MEETING_ROOM_FORM_LEADER_LABEL, value: leaderOptions.find((l) => l.value === leaderId)?.label ?? '' },
    { label: TEXT.MEETING_ROOM_FORM_COMMENT_LABEL, value: comment, numberOfLines: 2 },
  ];

  // The last step: still owns the leader/comment fields, but folds the full
  // recap and the real submit button into the same page rather than a
  // separate summary step.
  const renderApprovalStep = () => (
    <>
      <SectionCard style={styles.card}>
        {leaderOptions.length === 0 ? (
          <View style={styles.field}>
            <FieldLabel label={TEXT.MEETING_ROOM_FORM_LEADER_LABEL} required styles={styles} />
            <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_FORM_LEADER_NONE}</ThemedText>
          </View>
        ) : (
          <SelectField
            label={TEXT.MEETING_ROOM_FORM_LEADER_LABEL}
            required
            title={TEXT.MEETING_ROOM_FORM_LEADER_PICK}
            placeholder={TEXT.MEETING_ROOM_FORM_LEADER_PICK}
            options={leaderOptions}
            value={leaderId}
            onSelect={setLeaderId}
            error={errors.leaderId}
            styles={styles}
            color={c}
          />
        )}
        <FormTextField
          label={TEXT.MEETING_ROOM_FORM_COMMENT_LABEL}
          value={comment}
          onChangeText={setComment}
          placeholder={TEXT.MEETING_ROOM_FORM_COMMENT_PLACEHOLDER}
          multiline
          numberOfLines={2}
          styles={styles}
          color={c}
        />
      </SectionCard>

      <DetailInfoCard title={TEXT.MEETING_ROOM_SUMMARY_TITLE} rows={summaryRows} />

      <SectionCard title={TEXT.MEETING_ROOM_FORM_DATES_LABEL} style={styles.card}>
        <DateSummaryList dates={draftDates} styles={styles} />
      </SectionCard>

      <SectionCard style={styles.card}>
        <View style={styles.field}>
          <FieldLabel label={TEXT.MEETING_ROOM_FORM_AUDIO_LABEL} styles={styles} />
          <ThingChips things={selectedAudio} styles={styles} color={c} />
        </View>
        <View style={styles.field}>
          <FieldLabel label={TEXT.MEETING_ROOM_FORM_FOOD_LABEL} styles={styles} />
          <ThingChips things={selectedFood} styles={styles} color={c} />
        </View>
      </SectionCard>

      {submitError ? <ThemedText style={styles.fieldError}>{submitError}</ThemedText> : null}
    </>
  );

  const stepLabels: Record<FormStep, string> = {
    basics: TEXT.MEETING_ROOM_STEP_1_LABEL,
    dates: TEXT.MEETING_ROOM_STEP_DATES_LABEL,
    audio: TEXT.MEETING_ROOM_STEP_2_LABEL,
    food: TEXT.MEETING_ROOM_STEP_3_LABEL,
    approval: TEXT.MEETING_ROOM_STEP_4_LABEL,
  };

  const nextLabel: Record<Exclude<FormStep, 'approval'>, string> = {
    basics: TEXT.MEETING_ROOM_STEP_NEXT_TO_DATES,
    dates: TEXT.MEETING_ROOM_STEP_NEXT_TO_AUDIO,
    audio: TEXT.MEETING_ROOM_STEP_NEXT_TO_FOOD,
    food: TEXT.MEETING_ROOM_STEP_NEXT_TO_APPROVAL,
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = step === 'approval';

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

      {/* Step progress — numbered circles (check when done) + connectors,
          the same shape repair-computer's assign-job.tsx uses. */}
      <View style={styles.stepperWrap}>
        <View style={styles.stepper}>
          {STEP_ORDER.map((s, i) => {
            const isDone = i < stepIndex;
            const isActive = i === stepIndex;
            return (
              <View key={s} style={styles.stepCol}>
                <View style={styles.stepCircleRow}>
                  <View
                    style={[
                      styles.stepLine,
                      i <= stepIndex ? styles.stepLineOn : styles.stepLineOff,
                      i === 0 && styles.stepLineHidden,
                    ]}
                  />
                  <View style={[styles.stepDot, (isDone || isActive) && styles.stepDotOn]}>
                    {isDone ? (
                      <IconSymbol name="checkmark" size={13} color={c.textOnPrimary} />
                    ) : (
                      <ThemedText style={[styles.stepDotNum, isActive && styles.stepDotNumOn]}>
                        {i + 1}
                      </ThemedText>
                    )}
                  </View>
                  <View
                    style={[
                      styles.stepLine,
                      i < stepIndex ? styles.stepLineOn : styles.stepLineOff,
                      i === STEP_ORDER.length - 1 && styles.stepLineHidden,
                    ]}
                  />
                </View>
                <ThemedText
                  style={[styles.stepColLabel, isActive && styles.stepColLabelActive]}
                  numberOfLines={1}>
                  {stepLabels[s]}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 'basics' ? renderBasicsStep() : null}
        {step === 'dates' ? renderDatesStep() : null}
        {step === 'audio'
          ? renderToggleThingsStep(
              TEXT.MEETING_ROOM_FORM_AUDIO_TOGGLE,
              audioEnabled,
              setAudioEnabledAndClear,
              options.things_audio,
              audioQty,
              setAudioQty,
            )
          : null}
        {step === 'food'
          ? renderToggleThingsStep(
              TEXT.MEETING_ROOM_FORM_FOOD_TOGGLE,
              foodEnabled,
              setFoodEnabledAndClear,
              options.things_food,
              foodQty,
              setFoodQty,
            )
          : null}
        {step === 'approval' ? renderApprovalStep() : null}
      </ScrollView>

      {/* One fixed bar for every step — Back stays on the left throughout, and
          the right button is either "next step" or, on the last step, the
          real submit. Keeping Submit here (not floating inside the scroll
          content) means it sits in the same fixed place Back always has. */}
      <View style={styles.bottomBar}>
        <Button title={TEXT.SHARED_BACK_THAI} variant="secondary" onPress={goBack} />
        <Button
          title={isLastStep ? TEXT.MEETING_ROOM_CONFIRM_ACTION : nextLabel[step]}
          onPress={isLastStep ? requestSubmit : goNext}
          style={styles.ctaButton}
        />
      </View>

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

/**
 * A labelled text input, drawn the way general-booking.tsx (and the absence
 * forms before it) draw theirs: no box, just a bottom rule under the value —
 * so a textbox on this form reads the same as one on the classroom-booking
 * form it sits next to in the same "จองห้อง" hub, rather than the shared
 * `TextField`'s filled rounded box.
 */
function FormTextField({
  label,
  required,
  error,
  styles,
  color,
  multiline,
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
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline, Boolean(error) && styles.inputError, webNoOutline]}
        {...input}
      />
      {error ? <ThemedText style={styles.fieldError}>{error}</ThemedText> : null}
    </View>
  );
}

/** A field's name, with the asterisk when it has to be answered — same shape
 *  general-booking.tsx uses for its own field labels. */
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

type SelectFieldOption = {
  label: string;
  value: string;
  /** Leading node shown before the label — e.g. a person's photo — both in
   *  the sheet's option row and on the trigger once that option is chosen. */
  leading?: ReactNode;
};

/**
 * A dropdown field, drawn like general-booking.tsx's own `PickerField`: label
 * above, a bottom-rule trigger with a "⌄" chevron, error below — the list it
 * opens is still the app-wide `SelectSheet`, only the trigger's look is local
 * to this form. Kept separate from the shared `ModalSelectField`, which is a
 * filled rounded box by design (its own callers rely on that look) rather
 * than this screen's underline style.
 */
function SelectField({
  label,
  required,
  title,
  placeholder,
  options,
  value,
  onSelect,
  error,
  styles,
  color,
}: {
  label?: string;
  required?: boolean;
  title: string;
  placeholder: string;
  options: SelectFieldOption[];
  value: string;
  onSelect: (value: string) => void;
  error?: string;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} required={required} styles={styles} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.selectButton,
          Boolean(error) && styles.inputError,
          pressed && styles.fieldPressed,
        ]}>
        {selected?.leading}
        <ThemedText
          style={[styles.selectText, !selected && styles.placeholder]}
          numberOfLines={1}>
          {selected?.label || placeholder}
        </ThemedText>
        <ThemedText style={styles.chevron}>⌄</ThemedText>
      </Pressable>
      {error ? <ThemedText style={styles.fieldError}>{error}</ThemedText> : null}

      <SelectSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        options={options.map((option) => ({ id: option.value, label: option.label, leading: option.leading }))}
        selectedId={value}
        onSelect={(option) => onSelect(option.id)}
      />
    </View>
  );
}

/**
 * Best-effort icon for one equipment/food item, matched on its Thai name.
 *
 * The catalogue itself is free-text set by whoever administers the legacy
 * site, so there is no id this can key on reliably — only the words in
 * `detail`. No match returns null rather than a generic placeholder icon: a
 * wrong icon claims to know what the item is, while falling back to its own
 * (shortened) name never lies.
 */
function getThingIcon(detail: string): IconSymbolName | null {
  const d = detail.toLowerCase();
  if (d.includes('ไมค์') || d.includes('ไมโครโฟน') || d.includes('mic')) return 'mic';
  if (d.includes('โปรเจค') || d.includes('ฉาย') || d.includes('projector')) return 'projector';
  if (d.includes('จอ') || d.includes('มอนิเตอร์') || d.includes('screen') || d.includes('monitor')) return 'display';
  if (d.includes('โน้ตบุ๊ค') || d.includes('คอมพิวเตอร์') || d.includes('laptop')) return 'laptop';
  if (d.includes('ปริ้น') || d.includes('printer')) return 'printer.fill';
  if (d.includes('ไวไฟ') || d.includes('อินเทอร์เน็ต') || d.includes('wifi')) return 'wifi';
  if (d.includes('กาแฟ') || d.includes('ชา') || d.includes('coffee')) return 'coffee';
  if (d.includes('น้ำ') || d.includes('เครื่องดื่ม') || d.includes('drink')) return 'cup-soda';
  if (d.includes('ขนม') || d.includes('อาหาร') || d.includes('เบรก') || d.includes('food') || d.includes('snack')) {
    return 'utensils';
  }
  return null;
}

/** A short stand-in for an item's name when no icon matched it — just the
 *  first word, capped, so a long catalogue entry can't blow out a chip. */
function shortThingLabel(detail: string): string {
  const first = detail.trim().split(/\s+/)[0] ?? detail;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

type SelectedThing = { id: number; detail: string; qty: number };

/** The catalogue items that actually got a quantity > 0 — step 2/3 show every
 *  item regardless of quantity; the summary only cares what was asked for. */
function getSelectedThings(
  items: readonly { id: number; detail: string }[],
  qty: Record<number, string>,
): SelectedThing[] {
  return items
    .map((item) => ({ id: item.id, detail: item.detail, qty: Number(qty[item.id] ?? 0) }))
    .filter((thing) => thing.qty > 0);
}

/** Selected equipment/food as a row of icon-led chips — "[mic] x1" rather
 *  than a comma-joined sentence, per item, at a glance. */
function ThingChips({
  things,
  styles,
  color,
}: {
  things: SelectedThing[];
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
}) {
  if (things.length === 0) {
    return <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_SUMMARY_NONE}</ThemedText>;
  }

  return (
    <View style={styles.thingChipRow}>
      {things.map((thing) => {
        const icon = getThingIcon(thing.detail);
        return (
          <View key={thing.id} style={styles.thingChip}>
            {icon ? (
              <IconSymbol name={icon} size={14} color={color.textMuted} />
            ) : (
              <ThemedText style={styles.thingChipLabel} numberOfLines={1}>
                {shortThingLabel(thing.detail)}
              </ThemedText>
            )}
            <ThemedText style={styles.thingChipQty}>x{thing.qty}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/** The chosen date/time slots, read-only, in the same "date bold, time muted"
 *  row shape the dates step itself uses — a recap should look like the list
 *  it is summarizing, not a paragraph of text. */
function DateSummaryList({
  dates,
  styles,
}: {
  dates: readonly DraftMeetingRoomDate[];
  styles: ReturnType<typeof makeStyles>;
}) {
  if (dates.length === 0) {
    return <ThemedText style={styles.hint}>{TEXT.MEETING_ROOM_SUMMARY_NONE}</ThemedText>;
  }

  return (
    <>
      {dates.map((row, index) => (
        <View
          key={row.id}
          style={[styles.summaryDateRow, index === dates.length - 1 && styles.summaryDateRowLast]}>
          <ThemedText style={styles.dateRowDate}>{formatFullDate(row.date)}</ThemedText>
          <ThemedText style={styles.dateRowTime}>
            {row.startTime}-{row.endTime}
          </ThemedText>
        </View>
      ))}
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    scroll: { padding: 16, paddingBottom: 32, gap: 12 },
    card: { gap: 14 },
    field: { paddingVertical: 4, gap: 10 },
    fieldLabel: { fontSize: 15, lineHeight: 20, color: c.text, fontFamily: AppFonts.psuBold },
    requiredMark: { color: c.danger },
    fieldPressed: { opacity: 0.7 },
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
    // Caps the comment box to ~2 lines tall — a note is a line or two, not a
    // paragraph, and numberOfLines alone isn't respected consistently enough
    // across platforms to rely on it without a matching height.
    inputMultiline: { minHeight: 56, textAlignVertical: 'top' },
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
    selectText: { flex: 1, fontSize: 16, color: c.text, fontFamily: AppFonts.psuRegular },
    placeholder: { color: c.textFaint },
    chevron: { fontSize: 18, lineHeight: 22, color: c.textMuted },
    inputError: { borderBottomWidth: 1.5, borderBottomColor: c.danger },
    fieldError: { fontSize: 12, lineHeight: 17, color: c.danger, fontFamily: AppFonts.psuRegular },
    hint: { fontSize: 12, lineHeight: 17, color: c.textMuted, fontFamily: AppFonts.psuRegular },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    dateRowText: { flex: 1, gap: 2 },
    dateRowDate: { fontSize: 15, color: c.text, fontFamily: AppFonts.psuBold },
    dateRowTime: { fontSize: 13, color: c.textMuted, fontFamily: AppFonts.psuRegular },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    // Read-only recap of the dates step's own rows — same date/time text
    // styles, just without the tap/delete affordances of the editable list.
    summaryDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    summaryDateRowLast: { borderBottomWidth: 0 },

    // Selected equipment/food, one pill per item: an icon (or, failing that,
    // a short label) plus the quantity — "[mic] x1" rather than a sentence.
    thingChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    thingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surfaceMuted,
    },
    thingChipLabel: { fontSize: 12, color: c.text, fontFamily: AppFonts.psuBold },
    thingChipQty: { fontSize: 12, color: c.textMuted, fontFamily: AppFonts.psuRegular },

    // ── Stepper (mirrors repair-computer/assign-job.tsx) ──────────────────────
    stepperWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    stepper: { flexDirection: 'row' },
    stepCol: { flex: 1, alignItems: 'center', gap: 6 },
    stepCircleRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    stepLine: { flex: 1, height: 2 },
    stepLineOn: { backgroundColor: c.primary },
    stepLineOff: { backgroundColor: c.surfaceMuted },
    stepLineHidden: { backgroundColor: 'transparent' },
    stepDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotOn: { backgroundColor: c.primary },
    stepDotNum: { fontSize: 11, fontFamily: AppFonts.psuBold, color: c.textMuted },
    stepDotNumOn: { color: c.textOnPrimary },
    stepColLabel: { fontSize: 10, lineHeight: 14, color: c.textMuted, textAlign: 'center' },
    stepColLabelActive: { color: c.primary, fontFamily: AppFonts.psuBold },

    // ── Fixed bottom bar ───────────────────────────────────────────────────────
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
