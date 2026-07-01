import { NavTopBar } from '@/components/nav-top-bar';
import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { useToast } from '@/components/toast-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import type { NoticeRepairReference } from '@/models/types';
import { createRepair, getDetail, getReference, updateRepair } from '@/services/noticeRepairService';
import { useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView,
  StyleSheet, TextInput, useWindowDimensions, View,
} from 'react-native';

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
  return (
    <View style={fs.field}>
      <FieldLabel text={label} />
      <View style={rs.row}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(opt.value)}
              style={[rs.option, active && rs.optionActive]}
            >
              <View style={[rs.radio, active && rs.radioActive]}>
                {active ? <View style={rs.radioDot} /> : null}
              </View>
              <ThemedText style={[rs.radioLabel, active && rs.radioLabelActive]}>
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
  const trimmed = text.trimEnd();
  const required = trimmed.endsWith('*');
  const base = required ? trimmed.slice(0, -1).trimEnd() : trimmed;
  return (
    <ThemedText style={fs.label}>
      {base}
      {required ? <ThemedText style={fs.required}> *</ThemedText> : null}
    </ThemedText>
  );
}

function PickerModal({
  visible, title, items, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; items: RefItem[]; selected?: RefItem | null;
  onSelect: (item: RefItem) => void; onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.backdrop} onPress={onClose}>
        <Pressable>
          <View style={[ms.modal, { minWidth: width * 0.6 }]}>
            <View style={ms.header}>
              <ThemedText style={ms.title}>{title}</ThemedText>
              <Pressable accessibilityRole="button" onPress={onClose} style={ms.closeBtn}>
                <ThemedText>{TEXT.CLOSE}</ThemedText>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {items.map((item) => {
                const active = isSameRef(selected, item);
                return (
                  <Pressable key={item.id || item.name} accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => { onSelect(item); onClose(); }}
                    style={[ms.option, active && ms.optionActive]}>
                    <ThemedText style={[ms.optionText, active && ms.optionTextActive]}>
                      {item.name}
                    </ThemedText>
                    {active && <ThemedText style={ms.optionCheck}>✓</ThemedText>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
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
  return (
    <View style={fs.field}>
      <FieldLabel text={label} />
      <Pressable accessibilityRole="button" onPress={onPress} style={fs.control}>
        <ThemedText style={[fs.controlText, !value && fs.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </ThemedText>
        <IconSymbol name="chevron.down" size={18} color="#687076" />
      </Pressable>
    </View>
  );
}

function TextField({
  label, value, onChangeText, placeholder, multiline, keyboardType, iconName,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'phone-pad' | 'default';
  iconName?: IconSymbolName;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fs.field}>
      <FieldLabel text={label} />
      <View style={[fs.control, multiline && fs.controlMultiline, focused && fs.controlFocused]}>
        {iconName && !multiline ? (
          <IconSymbol name={iconName} size={18} color="#687076" />
        ) : null}
        <TextInput
          style={[fs.input, multiline && fs.inputMultiline, webNoOutline]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
        />
      </View>
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
  /** Heading shown above the form card (e.g. "แจ้งซ่อมใหม่"). */
  heading?: string;
  subtitle?: string;
  rightContent?: ReactNode;
  /** Where the top-bar back button goes. Defaults to NavTopBar's own behavior. */
  backHref?: Href;
  showHomeButton?: boolean;
  submitLabel: string;
  /** Optional leading icon on the submit button (e.g. send/paperplane). */
  submitIconName?: IconSymbolName;
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
  mode, staffId, repairId, title, heading, subtitle, rightContent, backHref, showHomeButton,
  submitLabel, submitIconName, successMessage, errorMessage, loadErrorMessage,
  confirmBeforeSubmit, confirmTitle, confirmMessage, resetOnFocus, onSuccess,
}: RepairInformFormProps) {
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
      <NavTopBar title={title} backHref={backHref} rightContent={rightContent} showHomeButton={showHomeButton} />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#922124" />
      ) : loadError ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{loadError}</ThemedText>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {heading ? <ThemedText style={styles.heading}>{heading}</ThemedText> : null}
            {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}

            <View style={styles.card}>
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
                iconName="mappin"
              />
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
                iconName="phone.fill"
              />
              <TextField
                label={TEXT.NOTICE_REPAIR_FORM_REMARK}
                value={remark}
                onChangeText={setRemark}
                placeholder={TEXT.NOTICE_REPAIR_FORM_REMARK_PLACEHOLDER}
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
              onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.submitInner}>
                  {submitIconName ? <IconSymbol name={submitIconName} size={18} color="#fff" /> : null}
                  <ThemedText style={styles.submitText}>{submitLabel}</ThemedText>
                </View>
              )}
            </Pressable>
          </View>
        </>
      )}

      <PickerModal visible={openPicker === 'category'} title={TEXT.NOTICE_REPAIR_FORM_WORK_CATEGORY}
        items={categories} selected={selectedCategory} onSelect={setSelectedCategory} onClose={() => setOpenPicker(null)} />
      <PickerModal visible={openPicker === 'building'} title={TEXT.NOTICE_REPAIR_FORM_BUILDING}
        items={buildings} selected={selectedBuilding} onSelect={setSelectedBuilding} onClose={() => setOpenPicker(null)} />

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAE3E3',
    borderRadius: 12, padding: 16, gap: 14,
    boxShadow: '0 1px 3px rgba(17, 24, 28, 0.04)',
  },
  footer: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1EDED',
  },
  submitBtn: { backgroundColor: '#b33939', borderRadius: 10, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 90,
    backgroundColor: '#166534', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
    boxShadow: '0 6px 16px rgba(17, 24, 28, 0.18)',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

const fs = StyleSheet.create({
  field: { gap: 8 },
  label: {
    fontSize: 11, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6,
    color: '#687076', textTransform: 'uppercase',
  },
  required: { color: '#B42318', fontWeight: '700' },
  control: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F2F3F7',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 44,
  },
  controlFocused: { borderColor: '#191C1F' },
  controlMultiline: { alignItems: 'flex-start', minHeight: 80 },
  controlText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#191C1F', fontFamily: AppFonts.psuRegular },
  placeholder: { color: '#9CA3AF' },
  input: { flex: 1, fontSize: 14, lineHeight: 20, color: '#191C1F', fontFamily: AppFonts.psuRegular, paddingVertical: 0 },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 420 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  optionActive: { backgroundColor: '#FBEAEA' },
  optionText: { flex: 1, fontSize: 14, color: '#111827' },
  optionTextActive: { color: '#922124', fontWeight: '700' },
  optionCheck: { fontSize: 15, fontWeight: '700', color: '#922124' },
});

const rs = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionActive: {
    backgroundColor: '#FBEAEA',
    borderColor: '#B33939',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#B33939',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B33939',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  radioLabelActive: {
    color: '#B33939',
    fontWeight: '600',
  },
});
