import { AppToast } from '@/components/app-toast';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { usePublicRepairRole } from '@/context/PublicRepairRoleContext';
import type { PublicRepairReference } from '@/models/types';
import { createRepair, getReference } from '@/services/publicRepairService';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, TextInput, View,
} from 'react-native';

type RefItem = { id: number; name: string };

function toRefItems(list: PublicRepairReference[], idKey: string, nameKey: string): RefItem[] {
  return list.map((r) => ({
    id: Number((r as Record<string, unknown>)[idKey]),
    name: String((r as Record<string, unknown>)[nameKey] ?? ''),
  }));
}

function PickerModal({
  visible, title, items, onSelect, onClose,
}: {
  visible: boolean; title: string; items: RefItem[];
  onSelect: (item: RefItem) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.backdrop} onPress={onClose}>
        <Pressable>
          <View style={ms.modal}>
            <View style={ms.header}>
              <ThemedText style={ms.title}>{title}</ThemedText>
              <Pressable accessibilityRole="button" onPress={onClose} style={ms.closeBtn}>
                <ThemedText>{TEXT.CLOSE}</ThemedText>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {items.map((item) => (
                <Pressable key={item.id} accessibilityRole="button"
                  onPress={() => { onSelect(item); onClose(); }}
                  style={ms.option}>
                  <ThemedText style={ms.optionText}>{item.name}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectField({
  label, value, placeholder, onPress, required,
}: {
  label: string; value: string; placeholder: string;
  onPress: () => void; required?: boolean;
}) {
  return (
    <View style={fs.field}>
      <ThemedText style={fs.label}>{label}</ThemedText>
      <Pressable accessibilityRole="button" onPress={onPress} style={fs.selectBtn}>
        <ThemedText style={value ? fs.selectValue : fs.selectPlaceholder}>
          {value || placeholder}
        </ThemedText>
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
  return (
    <View style={fs.field}>
      <ThemedText style={fs.label}>{label}</ThemedText>
      <TextInput
        style={[fs.input, multiline && fs.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function InformScreen() {
  const { staffId, roleSwitcher } = usePublicRepairRole();

  const [categories, setCategories] = useState<RefItem[]>([]);
  const [workTypes, setWorkTypes] = useState<RefItem[]>([]);
  const [buildings, setBuildings] = useState<RefItem[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<RefItem | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<RefItem | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<RefItem | null>(null);
  const [place, setPlace] = useState('');
  const [detail, setDetail] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');

  const [openPicker, setOpenPicker] = useState<'category' | 'workType' | 'building' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const loadRefs = useCallback(async () => {
    try {
      const [cats, types, blds] = await Promise.all([
        getReference('work_categories'),
        getReference('work_types'),
        getReference('buildings'),
      ]);
      setCategories(toRefItems(cats, 'work_category_id', 'work_category_name'));
      setWorkTypes(toRefItems(types, 'work_type_id', 'work_type_name'));
      setBuildings(toRefItems(blds, 'building_id', 'building_name'));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadRefs(); }, [loadRefs]);

  useFocusEffect(useCallback(() => {
    setSelectedCategory(null);
    setSelectedWorkType(null);
    setSelectedBuilding(null);
    setPlace('');
    setDetail('');
    setPhone('');
    setRemark('');
  }, []));

  const handleSubmit = async () => {
    if (!selectedCategory || !place.trim() || !detail.trim()) {
      setToast(TEXT.PR_FORM_REQUIRED);
      setToastType('error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRepair(staffId, {
        work_category: selectedCategory.id,
        repair_place: place.trim(),
        repair_inform: detail.trim(),
        work_type: selectedWorkType?.id,
        repair_tel: phone.trim() || undefined,
        repair_building: selectedBuilding?.id,
        repair_remark: remark.trim() || undefined,
      });
      setToast(TEXT.PR_FORM_SUCCESS);
      setToastType('success');
      setSelectedCategory(null);
      setSelectedWorkType(null);
      setSelectedBuilding(null);
      setPlace('');
      setDetail('');
      setPhone('');
      setRemark('');
    } catch (e) {
      setToast(e instanceof Error ? e.message : TEXT.PR_FORM_ERROR);
      setToastType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.PR_TAB_INFORM} showHomeButton rightContent={roleSwitcher} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SelectField
          label={TEXT.PR_FORM_WORK_CATEGORY}
          value={selectedCategory?.name ?? ''}
          placeholder={TEXT.PR_FORM_SELECT_CATEGORY}
          onPress={() => setOpenPicker('category')}
        />
        <TextField
          label={TEXT.PR_FORM_PLACE}
          value={place}
          onChangeText={setPlace}
          placeholder="เช่น ห้อง 201 ชั้น 2"
        />
        <TextField
          label={TEXT.PR_FORM_DETAIL}
          value={detail}
          onChangeText={setDetail}
          placeholder="อธิบายปัญหาที่พบ"
          multiline
        />
        <SelectField
          label={TEXT.PR_FORM_WORK_TYPE}
          value={selectedWorkType?.name ?? ''}
          placeholder={TEXT.PR_FORM_SELECT_WORK_TYPE}
          onPress={() => setOpenPicker('workType')}
        />
        <TextField
          label={TEXT.PR_FORM_PHONE}
          value={phone}
          onChangeText={setPhone}
          placeholder="08X-XXX-XXXX"
          keyboardType="phone-pad"
        />
        <SelectField
          label={TEXT.PR_FORM_BUILDING}
          value={selectedBuilding?.name ?? ''}
          placeholder={TEXT.PR_FORM_SELECT_BUILDING}
          onPress={() => setOpenPicker('building')}
        />
        <TextField
          label={TEXT.PR_FORM_REMARK}
          value={remark}
          onChangeText={setRemark}
          multiline
        />

        <Pressable accessibilityRole="button" style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <ThemedText style={styles.submitText}>{TEXT.PR_FORM_SUBMIT}</ThemedText>}
        </Pressable>
      </ScrollView>

      <PickerModal visible={openPicker === 'category'} title={TEXT.PR_FORM_WORK_CATEGORY}
        items={categories} onSelect={setSelectedCategory} onClose={() => setOpenPicker(null)} />
      <PickerModal visible={openPicker === 'workType'} title={TEXT.PR_FORM_WORK_TYPE}
        items={workTypes} onSelect={setSelectedWorkType} onClose={() => setOpenPicker(null)} />
      <PickerModal visible={openPicker === 'building'} title={TEXT.PR_FORM_BUILDING}
        items={buildings} onSelect={setSelectedBuilding} onClose={() => setOpenPicker(null)} />

      {!!toast && (
        <AppToast message={toast} type={toastType} onHide={() => setToast('')} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  submitBtn: { backgroundColor: '#922124', borderRadius: 10, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const fs = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, color: '#374151', fontWeight: '500' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  selectValue: { fontSize: 14, color: '#111827' },
  selectPlaceholder: { fontSize: 14, color: '#9CA3AF' },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 420 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  option: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 14, color: '#111827' },
});
