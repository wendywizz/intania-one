import { MaterialItemCard } from '@/components/notice-repair/material-item-card';
import { InfinityLoader } from '@/components/infinity-loader';
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
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

function todayISO() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function RequisitionScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
      <NavTopBar title="ใบขอจัดหา" backHref={backHref} showHomeButton tone="primary" />

      {isLoading ? (
        <InfinityLoader size={60} style={styles.loader} />
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
                  <IconSymbol name="chevron.down" size={18} color={c.textMuted} />
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

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceAlt },
  flex: { flex: 1 },
  // Centred both ways: ActivityIndicator centred itself inside a flex:1 box,
  // the infinity mark is a plain view and has to be told.
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: c.danger, textAlign: 'center' },
  scroll: { padding: 16, gap: 12 },
  subhead: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginTop: 4 },
  matList: { gap: 10 },
  empty: { fontSize: 14, color: c.textFaint, textAlign: 'center', paddingVertical: 12 },

  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 14, marginTop: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  input: {
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text,
  },
  select: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 46,
  },
  selectText: { flex: 1, fontSize: 15, color: c.text },
  placeholder: { color: c.textFaint },

  remarkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remarkName: { flex: 1, fontSize: 13, color: c.text },
  remarkInput: {
    width: 150, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text,
  },

  footer: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
    backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
  },
  submitBtn: { backgroundColor: c.pomegranate, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: c.textOnPrimary, fontSize: 16, fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, width: '100%', maxWidth: 420 },
  pickerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, color: c.text },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  pickerOptionActive: { backgroundColor: c.primarySoft },
  pickerOptionText: { flex: 1, fontSize: 14, color: c.text },
  pickerOptionTextActive: { color: c.primary, fontWeight: '700' },
  pickerCheck: { fontSize: 15, fontWeight: '700', color: c.primary },
});
