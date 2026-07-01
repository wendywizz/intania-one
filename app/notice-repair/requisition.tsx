import { MaterialItemCard } from '@/components/notice-repair/material-item-card';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/context/AuthContext';
import type { NoticeRepairDetail } from '@/models/types';
import {
  getFullDetail, getRequisitionRequesters, saveRequisitionSupply,
  type RequisitionRequester,
} from '@/services/noticeRepairService';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

function todayISO() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function RequisitionScreen() {
  const { repair_id, staff_id: paramStaff, role, source } = useLocalSearchParams<{
    repair_id: string; staff_id: string; role?: string; source?: string;
  }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';
  const { showToast } = useToast();

  const [detail, setDetail] = useState<NoticeRepairDetail | null>(null);
  const [requesters, setRequesters] = useState<RequisitionRequester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [date, setDate] = useState(todayISO());
  const [receiveDate, setReceiveDate] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!repair_id) return;
    setIsLoading(true);
    Promise.all([
      getFullDetail(Number(repair_id), staffId),
      getRequisitionRequesters(staffId).catch(() => [] as RequisitionRequester[]),
    ])
      .then(([d, r]) => { setDetail(d); setRequesters(r); })
      .catch((e) => setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดข้อมูลได้'))
      .finally(() => setIsLoading(false));
  }, [repair_id, staffId]);

  const requisitions = useMemo(() => detail?.requisitions ?? [], [detail]);
  const requesterName = requesters.find((r) => r.staff_id === requesterId)?.name ?? '';

  const handleSave = async () => {
    if (!date.trim()) { showToast('กรุณาเลือกวันที่', 'error'); return; }
    if (!requesterId) { showToast('กรุณาเลือกผู้ขอให้จัดหา', 'error'); return; }
    if (!repair_id || !staffId) { showToast('ไม่พบข้อมูลใบแจ้งซ่อม', 'error'); return; }

    setSubmitting(true);
    try {
      await saveRequisitionSupply(repair_id, staffId, {
        requisition_date: date.trim(),
        requisition_name: requesterId,
        requisition_receive_date: receiveDate.trim() || undefined,
        remarks,
      });
      showToast('บันทึกใบขอจัดหาเรียบร้อยแล้ว', 'success');
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const backHref = useMemo(() => {
    const p = new URLSearchParams();
    if (repair_id) p.set('repair_id', repair_id);
    if (staffId) p.set('staff_id', staffId);
    if (role) p.set('role', role);
    if (source) p.set('source', source);
    return `/notice-repair/detail?${p.toString()}`;
  }, [repair_id, staffId, role, source]);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="ใบขอจัดหา" backHref={backHref} showHomeButton />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#B33939" />
      ) : error ? (
        <View style={styles.center}><ThemedText style={styles.errorText}>{error}</ThemedText></View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {!!detail?.repair_number && (
              <ThemedText style={styles.subhead}>จัดหาเพื่อ ตามเลขที่ใบแจ้งซ่อม {detail.repair_number}</ThemedText>
            )}

            {/* รายการวัสดุที่ใช้ */}
            <ThemedText style={styles.sectionLabel}>รายการวัสดุที่ใช้ ({requisitions.length})</ThemedText>
            {requisitions.length > 0 ? (
              <View style={styles.matList}>
                {requisitions.map((r, i) => (
                  <MaterialItemCard
                    key={r.requisition_equipment_id ?? i}
                    index={i + 1}
                    name={r.name ?? ''}
                    priceUnit={r.price_unit}
                    amount={r.number}
                    unit={r.unit}
                    total={r.price}
                    statusLabel={r.status === 'd' ? 'จัดหาเอง' : r.status === 'c' ? 'หน่วยอาคารฯ' : undefined}
                  />
                ))}
              </View>
            ) : (
              <ThemedText style={styles.empty}>ไม่มีรายการวัสดุ</ThemedText>
            )}

            {/* ใบขอจัดหา form */}
            <View style={styles.card}>
              <ThemedText style={styles.cardTitle}>ใบขอจัดหา</ThemedText>

              <View style={styles.field}>
                <ThemedText style={styles.label}>วันที่ *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>ผู้ขอให้จัดหา *</ThemedText>
                <Pressable style={styles.select} onPress={() => setPickerOpen(true)}>
                  <ThemedText style={[styles.selectText, !requesterName && styles.placeholder]} numberOfLines={1}>
                    {requesterName || 'เลือกผู้ขอให้จัดหา'}
                  </ThemedText>
                  <IconSymbol name="chevron.down" size={18} color="#687076" />
                </Pressable>
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>วันที่รับของ</ThemedText>
                <TextInput
                  style={styles.input}
                  value={receiveDate}
                  onChangeText={setReceiveDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* per-item remarks */}
              {requisitions.length > 0 && (
                <View style={styles.field}>
                  <ThemedText style={styles.label}>หมายเหตุรายการ</ThemedText>
                  {requisitions.map((r, i) => {
                    const id = String(r.requisition_equipment_id ?? '');
                    return (
                      <View key={id || i} style={styles.remarkRow}>
                        <ThemedText style={styles.remarkName} numberOfLines={1}>{`${i + 1}. ${r.name ?? ''}`}</ThemedText>
                        <TextInput
                          style={styles.remarkInput}
                          value={remarks[id] ?? ''}
                          editable={!!id}
                          onChangeText={(t) => setRemarks((prev) => ({ ...prev, [id]: t }))}
                          placeholder="หมายเหตุ"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={handleSave}
              style={[styles.submitBtn, submitting && styles.submitDisabled]}>
              {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.submitText}>บันทึก</ThemedText>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerCard}>
            <ThemedText style={styles.pickerTitle}>ผู้ขอให้จัดหา</ThemedText>
            <ScrollView style={{ maxHeight: 360 }}>
              {requesters.length === 0 ? (
                <ThemedText style={styles.empty}>ไม่มีรายชื่อ</ThemedText>
              ) : (
                requesters.map((r) => {
                  const active = r.staff_id === requesterId;
                  return (
                    <Pressable
                      key={r.staff_id}
                      onPress={() => { setRequesterId(r.staff_id); setPickerOpen(false); }}
                      style={[styles.pickerOption, active && styles.pickerOptionActive]}>
                      <ThemedText style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>
                        {r.name}
                      </ThemedText>
                      {active && <ThemedText style={styles.pickerCheck}>✓</ThemedText>}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  flex: { flex: 1 },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center' },
  scroll: { padding: 16, gap: 12 },
  subhead: { fontSize: 14, fontWeight: '700', color: '#374151' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 4 },
  matList: { gap: 10 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 14, marginTop: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  select: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 46,
  },
  selectText: { flex: 1, fontSize: 15, color: '#111827' },
  placeholder: { color: '#9CA3AF' },

  remarkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remarkName: { flex: 1, fontSize: 13, color: '#1F2937' },
  remarkInput: {
    width: 150, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827',
  },

  footer: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1EDED',
  },
  submitBtn: { backgroundColor: '#b33939', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 420 },
  pickerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, color: '#111827' },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  pickerOptionActive: { backgroundColor: '#FBEAEA' },
  pickerOptionText: { flex: 1, fontSize: 14, color: '#111827' },
  pickerOptionTextActive: { color: '#922124', fontWeight: '700' },
  pickerCheck: { fontSize: 15, fontWeight: '700', color: '#922124' },
});
