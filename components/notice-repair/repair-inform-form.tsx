import { X } from 'lucide-react-native';

import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { useToast } from '@/components/toast-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import type { NoticeRepairReference } from '@/models/types';
import { createRepair, getDetail, getReference, updateRepair } from '@/services/noticeRepairService';
import { getCategoryIcon } from '@/utils/category-icon';
import { useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView,
  StyleSheet, TextInput, useWindowDimensions, View,
} from 'react-native';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

// On web a focused TextInput draws the browser's own rectangular outline, which
// ignores the control's rounded border. Remove it so the focus state can show
// on the control's own (rounded) border instead. `outlineStyle` is a web-only
// RN-Web style, hence the loose type.
const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

/** Radio group for repair type: แจ้งซ่อม (n) / ติดตั้งเพิ่มเติม (y). */
const REPAIR_TYPE_OPTIONS = [
  { value: 'n', label: 'แจ้งซ่อม' },
  { value: 'y', label: 'ติดตั้งเพิ่มเติม' },
] as const;

type RepairType = typeof REPAIR_TYPE_OPTIONS[number]['value'];

function RadioGroup({
  label, options, value, onChange,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <FieldLabel text={label} />
      <View style={styles.radioRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(opt.value)}
              style={[styles.radioOption, active && styles.radioOptionActive]}
            >
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
              <ThemedText style={[styles.radioLabel, active && styles.radioLabelActive]}>
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Reference ids are codes like "001"–"005" (strings with leading zeros), so we
// keep them as strings — Number() would turn "002" into 2 and lose the zeros.
type RefItem = { id: string; name: string };

/** First non-empty value among the candidate keys. */
function pick(r: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

// Tolerant of the upstream's field naming: a reference row may key its id/name
// as work_category_id/_name, category_id/_name, or plain id/name. Items that
// end up without a usable name are dropped so the picker never shows blanks.
function toRefItems(list: NoticeRepairReference[], idKeys: string[], nameKeys: string[]): RefItem[] {
  return list
    .map((r) => {
      const row = r as Record<string, unknown>;
      const name = pick(row, nameKeys);
      const id = pick(row, idKeys);
      return { id: id == null ? '' : String(id), name: name == null ? '' : String(name) };
    })
    .filter((item) => item.name.trim() !== '');
}

const CATEGORY_ID_KEYS = ['work_category_id', 'category_id', 'id'];
const CATEGORY_NAME_KEYS = ['work_category_name', 'category_name', 'name'];

/**
 * Build a RefItem from the loaded detail. Keeps whichever of id/name is present
 * — the detail may carry only the code (e.g. repair_work_category) without a
 * display name. A missing piece is filled in by reconciling against the
 * reference list once it loads (see reconcile).
 */
function refFrom(id: unknown, name?: string): RefItem | null {
  const idStr = id == null || id === '' ? '' : String(id);
  if (!idStr && !name) return null;
  return { id: idStr, name: name ?? '' };
}

/**
 * Resolve a prefilled selection against the loaded list, matching by id first
 * (the detail may carry only the code) then by name.
 */
function reconcile(prev: RefItem | null, items: RefItem[]): RefItem | null {
  if (!prev) return prev;
  const byId = prev.id ? items.find((i) => i.id === prev.id) : undefined;
  if (byId) return byId;
  return items.find((i) => i.name === prev.name) ?? prev;
}

/** The current selection (default value) is highlighted and checked. */
function isSameRef(a: RefItem | null | undefined, b: RefItem) {
  if (!a) return false;
  return (!!a.id && a.id === b.id) || a.name === b.name;
}

/** Renders the label, colouring a trailing "*" (required marker) red. */
function FieldLabel({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  const trimmed = text.trimEnd();
  const required = trimmed.endsWith('*');
  const base = required ? trimmed.slice(0, -1).trimEnd() : trimmed;
  return (
    <ThemedText style={styles.fieldLabel}>
      {base}
      {required ? <ThemedText style={styles.required}> *</ThemedText> : null}
    </ThemedText>
  );
}

// Option sheet for the reference pickers, styled like the absence forms'
// select modal (centred card, X close button, hairline-separated options).
function PickerModal({
  visible, title, items, selected, onSelect, onClose, iconFor,
}: {
  visible: boolean; title: string; items: RefItem[]; selected?: RefItem | null;
  onSelect: (item: RefItem) => void; onClose: () => void;
  /** Leading icon for each option row. */
  iconFor?: (item: RefItem) => IconSymbolName;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  // Never narrower than 70% of the screen, however short the option labels are.
  const minWidth = Math.round(width * 0.7);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalWrap}>
          <ThemedView style={[styles.selectModal, { minWidth }]} lightColor="#FFFFFF" darkColor="#151718">
            <View style={styles.selectModalHeader}>
              <ThemedText type="defaultSemiBold" style={styles.selectModalTitle}>{title}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
                onPress={onClose}
                style={styles.closeButton}>
                <X size={20} color={c.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.optionScroll} contentContainerStyle={styles.optionScrollContent}>
              {items.length ? (
                items.map((item) => {
                  const active = isSameRef(selected, item);
                  return (
                    <Pressable key={item.id || item.name} accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => { onSelect(item); onClose(); }}
                      style={styles.option}>
                      <View style={styles.optionRow}>
                        {iconFor ? (
                          <View style={styles.optionIcon}>
                            <IconSymbol
                              name={iconFor(item)}
                              size={18}
                              color={active ? c.primary : c.textMuted}
                            />
                          </View>
                        ) : null}
                        <ThemedText style={[styles.optionText, active && styles.selectedOptionText]}>
                          {item.name}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <ThemedText style={styles.emptyOption}>{TEXT.SHARED_EMPTY_DATA}</ThemedText>
              )}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectField({
  label, value, placeholder, onPress,
}: {
  label: string; value: string; placeholder: string; onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <FieldLabel text={label} />
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.selectButton}>
        <ThemedText style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </ThemedText>
        <ThemedText style={styles.chevron}>⌄</ThemedText>
      </Pressable>
    </View>
  );
}

function TextField({
  label, value, onChangeText, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'phone-pad' | 'default';
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <FieldLabel text={label} />
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, webNoOutline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A969C"
        multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export type RepairInformFormProps = {
  /** 'create' = informer add form; 'edit' = admin edit form. */
  mode: 'create' | 'edit';
  staffId: string;
  /** Required in 'edit' mode — the job to load and update. */
  repairId?: string;
  title: string;
  rightContent?: ReactNode;
  /** Where the top-bar back button goes. Defaults to NavTopBar's own behavior. */
  backHref?: Href;
  showHomeButton?: boolean;
  submitLabel: string;
  successMessage: string;
  errorMessage: string;
  loadErrorMessage?: string;
  /** Ask for confirmation in a modal before submitting (edit form). */
  confirmBeforeSubmit?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  /** Clear the form whenever the screen regains focus (create form). */
  resetOnFocus?: boolean;
  /** Called after a successful submit (e.g. redirect to the detail screen). */
  onSuccess?: () => void;
};

export function RepairInformForm({
  mode, staffId, repairId, title, rightContent, backHref, showHomeButton,
  submitLabel, successMessage, errorMessage, loadErrorMessage,
  confirmBeforeSubmit, confirmTitle, confirmMessage, resetOnFocus, onSuccess,
}: RepairInformFormProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [buildings, setBuildings] = useState<RefItem[]>([]);
  const [workTypes, setWorkTypes] = useState<RefItem[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<RefItem | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<RefItem | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<RefItem | null>(null);
  const [repairType, setRepairType] = useState<RepairType>('n');
  const [place, setPlace] = useState('');
  const [detail, setDetail] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');

  const [openPicker, setOpenPicker] = useState<'category' | 'building' | 'workType' | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Success/error feedback uses the app-wide slide-down toast.
  const { showToast } = useToast();

  const resetForm = useCallback(() => {
    setSelectedCategory(null);
    setSelectedBuilding(null);
    setSelectedWorkType(null);
    setRepairType('n');
    setPlace('');
    setDetail('');
    setPhone('');
    setRemark('');
  }, []);

  // Edit mode: load the existing job and prefill. Both pickers are backed by the
  // work_categories list, so default them from repair_work_category.
  useEffect(() => {
    if (mode !== 'edit' || !repairId) return undefined;
    let active = true;
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const job = await getDetail(Number(repairId), staffId);
        if (!active) return;
        setSelectedCategory(refFrom(job.repair_work_category, job.work_category_name));
        setSelectedWorkType(refFrom(job.repair_work_category, job.work_category_name));
        setSelectedBuilding(refFrom(job.repair_building, job.building_name));
        setRepairType(job.repair === 'y' ? 'y' : 'n');
        setPlace(job.repair_place ?? '');
        setDetail(job.repair_inform ?? '');
        setPhone(job.repair_tel ?? '');
        setRemark(job.repair_remark ?? '');
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : (loadErrorMessage ?? TEXT.NOTICE_REPAIR_EDIT_LOAD_ERROR));
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [mode, repairId, staffId, loadErrorMessage]);

  // Both pickers pull from /api/notice-repair/work_categories (fetched once).
  // Buildings list from /api/notice-repair/reference/buildings
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [workCatRef, buildingRef] = await Promise.all([
          getReference('work_categories'),
          getReference('buildings'),
        ]);
        if (!active) return;
        const workCatItems = toRefItems(workCatRef, CATEGORY_ID_KEYS, CATEGORY_NAME_KEYS);
        const buildingItems = toRefItems(buildingRef, ['building_id', 'id'], ['building_name', 'name']);
        setCategories(workCatItems);
        setWorkTypes(workCatItems);
        setBuildings(buildingItems);
        setSelectedCategory((prev) => reconcile(prev, workCatItems));
        setSelectedWorkType((prev) => reconcile(prev, workCatItems));
        setSelectedBuilding((prev) => reconcile(prev, buildingItems));
      } catch {
        // Leave the lists empty — the pickers simply won't have options.
      }
    })();
    return () => { active = false; };
  }, []);

  // Create mode: clear the form each time the screen regains focus.
  useFocusEffect(useCallback(() => {
    if (resetOnFocus) resetForm();
  }, [resetOnFocus, resetForm]));

  const doSubmit = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      const payload = {
        work_category: selectedCategory.id,
        repair: repairType,
        building: selectedBuilding?.id,
        repair_place: place.trim(),
        repair_inform: detail.trim(),
        work_type: selectedWorkType?.id,
        repair_tel: phone.trim() || undefined,
        repair_remark: remark.trim() || undefined,
      };
      if (mode === 'edit') {
        await updateRepair(repairId as string, staffId, payload);
      } else {
        await createRepair(staffId, payload);
      }
      setConfirmVisible(false);
      showToast(successMessage, 'success');
      if (mode === 'create') resetForm();
      if (onSuccess) setTimeout(onSuccess, 800);
    } catch (e) {
      setConfirmVisible(false);
      showToast(e instanceof Error ? e.message : errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate, then either confirm (edit) or submit straight away (create).
  const handleSave = () => {
    if (!selectedCategory || !place.trim() || !detail.trim()) {
      showToast(TEXT.NOTICE_REPAIR_FORM_REQUIRED, 'error');
      return;
    }
    if (confirmBeforeSubmit) {
      setConfirmVisible(true);
      return;
    }
    doSubmit();
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={title}
        backHref={backHref}
        rightContent={rightContent}
        showHomeButton={showHomeButton}
        titleInNavBar
        tone="primary"
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={c.primary} />
      ) : loadError ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{loadError}</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {/* Type of request */}
            <SectionCard>
              <RadioGroup
                label={TEXT.NOTICE_REPAIR_FORM_REPAIR_TYPE}
                options={REPAIR_TYPE_OPTIONS}
                value={repairType}
                onChange={(v) => setRepairType(v as RepairType)}
              />
              <SelectField
                label={TEXT.NOTICE_REPAIR_FORM_WORK_CATEGORY}
                value={selectedCategory?.name ?? ''}
                placeholder={TEXT.NOTICE_REPAIR_FORM_SELECT_CATEGORY}
                onPress={() => setOpenPicker('category')}
              />
            </SectionCard>

            {/* Where */}
            <SectionCard>
              <SelectField
                label={TEXT.NOTICE_REPAIR_FORM_BUILDING}
                value={selectedBuilding?.name ?? ''}
                placeholder={TEXT.NOTICE_REPAIR_FORM_SELECT_BUILDING}
                onPress={() => setOpenPicker('building')}
              />
              <TextField
                label={TEXT.NOTICE_REPAIR_FORM_PLACE}
                value={place}
                onChangeText={setPlace}
                placeholder="เช่น ห้อง 201 ชั้น 2"
              />
            </SectionCard>

            {/* What is wrong + how to reach the informer */}
            <SectionCard>
              <TextField
                label={TEXT.NOTICE_REPAIR_FORM_DETAIL}
                value={detail}
                onChangeText={setDetail}
                placeholder="อธิบายปัญหาที่พบ"
                multiline
              />
              <TextField
                label={TEXT.NOTICE_REPAIR_FORM_PHONE}
                value={phone}
                onChangeText={setPhone}
                placeholder="08X-XXX-XXXX"
                keyboardType="phone-pad"
              />
              <TextField
                label={TEXT.NOTICE_REPAIR_FORM_REMARK}
                value={remark}
                onChangeText={setRemark}
                placeholder={TEXT.NOTICE_REPAIR_FORM_REMARK_PLACEHOLDER}
                multiline
              />
            </SectionCard>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSave}
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {submitLabel}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <PickerModal visible={openPicker === 'category'} title={TEXT.NOTICE_REPAIR_FORM_WORK_CATEGORY}
        items={categories} selected={selectedCategory} onSelect={setSelectedCategory}
        onClose={() => setOpenPicker(null)}
        iconFor={(item) => getCategoryIcon(item.name)} />
      <PickerModal visible={openPicker === 'building'} title={TEXT.NOTICE_REPAIR_FORM_BUILDING}
        items={buildings} selected={selectedBuilding} onSelect={setSelectedBuilding}
        onClose={() => setOpenPicker(null)}
        iconFor={() => 'house.fill'} />

      <ConfirmModal
        visible={confirmVisible}
        title={confirmTitle ?? TEXT.NOTICE_REPAIR_ACTION_CONFIRM}
        message={confirmMessage}
        confirmLabel={submitLabel}
        loading={isSubmitting}
        onConfirm={doSubmit}
        onCancel={() => setConfirmVisible(false)}
      />
    </ThemedView>
  );
}

// Mirrors the absence form screens: underlined fields grouped into SectionCards,
// bold 15px labels, and an inline submit button at the end of the form.
const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: c.danger, textAlign: 'center' },

  content: { paddingTop: 16, paddingBottom: 24 },
  form: { marginTop: 4, gap: 14 },

  field: { paddingVertical: 12, gap: 10 },
  fieldLabel: { fontSize: 15, lineHeight: 20, color: c.text, fontFamily: AppFonts.psuBold },
  required: { color: c.danger, fontFamily: AppFonts.psuBold },
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
  // Two lines of text (2 × 22 lineHeight) plus the vertical padding.
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  placeholder: { color: c.textFaint },

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
  selectText: { flex: 1, color: c.text, fontSize: 16, fontFamily: AppFonts.psuRegular },
  chevron: { color: c.textMuted, fontSize: 18, lineHeight: 22 },

  // Radio row (no absence equivalent — kept, restyled to sit with the fields).
  radioRow: { flexDirection: 'row', gap: 12 },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  radioOptionActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: c.border, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: c.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  radioLabel: { flex: 1, fontSize: 15, color: c.textMuted, fontFamily: AppFonts.psuRegular },
  radioLabelActive: { color: c.primary, fontFamily: AppFonts.psuBold },

  // Picker modal
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  modalWrap: { width: '100%', alignItems: 'center' },
  selectModal: { width: '100%', maxWidth: 520, maxHeight: 460, borderRadius: 8, padding: 16 },
  selectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  selectModalTitle: { flex: 1, fontSize: 16 },
  closeButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: `${c.text}14`,
  },
  optionScroll: { maxHeight: 360 },
  optionScrollContent: { gap: 8 },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
    flexShrink: 0,
  },
  optionText: { flex: 1, color: c.text, lineHeight: 20 },
  selectedOptionText: { color: c.primary, fontFamily: AppFonts.psuBold },
  emptyOption: { color: c.textMuted, lineHeight: 20, paddingVertical: 16, textAlign: 'center' },

  submitButton: {
    minHeight: 48,
    minWidth: 132,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.pomegranate,
    marginTop: 6,
  },
  disabledButton: { opacity: 0.65 },
});
