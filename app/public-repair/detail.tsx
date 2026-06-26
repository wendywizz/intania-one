import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { PublicRepairDetail } from '@/models/types';
import { getDetail } from '@/services/publicRepairService';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

const STATUS_COLORS: Record<string, string> = {
  '001': '#2563EB', '002': '#16A34A', '003': '#D97706',
  '004': '#EA580C', '005': '#EA580C', '006': '#EA580C',
  '007': '#EA580C', '008': '#15803D', '106': '#15803D', '200': '#DC2626',
};
function statusColor(s?: string) {
  if (!s) return '#6B7280';
  if (s.startsWith('1') && s !== '106') return '#B91C1C';
  return STATUS_COLORS[s] ?? '#6B7280';
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

export default function PublicRepairDetailScreen() {
  const { repair_id, staff_id: paramStaff } = useLocalSearchParams<{ repair_id: string; staff_id: string }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';

  const [detail, setDetail] = useState<PublicRepairDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!repair_id) return;
    setIsLoading(true);
    getDetail(Number(repair_id), staffId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดรายละเอียดได้'))
      .finally(() => setIsLoading(false));
  }, [repair_id, staffId]);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.PR_DETAIL_TITLE} backHref="/public-repair" showHomeButton />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#922124" />
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : detail ? (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {detail.repair_number ? (
                <ThemedText style={styles.repairNumber}>เลขที่ {detail.repair_number}</ThemedText>
              ) : (
                <ThemedText style={styles.repairNumber}>ID {detail.repair_id}</ThemedText>
              )}
              {detail.repair_status && (
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor(detail.repair_status)}20` }]}>
                  <ThemedText style={[styles.statusText, { color: statusColor(detail.repair_status) }]}>
                    {detail.repair_status_name ?? detail.repair_status}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Basic info */}
          <Section title="ข้อมูลการแจ้งซ่อม">
            <Row label={TEXT.PR_DETAIL_CATEGORY}  value={detail.work_category_name} />
            <Row label={TEXT.PR_DETAIL_PLACE}      value={detail.repair_place} />
            <Row label={TEXT.PR_DETAIL_BUILDING}   value={detail.building_name} />
            <Row label={TEXT.PR_DETAIL_DESCRIPTION} value={detail.repair_inform} />
            <Row label={TEXT.PR_DETAIL_INFORMER}   value={detail.informer_name} />
            <Row label={TEXT.PR_DETAIL_POSITION}   value={detail.informer_position} />
            <Row label={TEXT.PR_DETAIL_DEPARTMENT} value={detail.repair_inform_dept_name} />
            <Row label={TEXT.PR_DETAIL_DATE}       value={detail.repair_inform_date_th ?? detail.repair_inform_date} />
            {detail.repair_tel ? <Row label="โทรศัพท์" value={detail.repair_tel} /> : null}
            {detail.repair_remark ? <Row label="หมายเหตุ" value={detail.repair_remark} /> : null}
          </Section>

          {/* Work assignment */}
          {detail.header && (
            <Section title="การมอบหมายงาน">
              <Row label="หัวหน้างาน"        value={detail.header.header_name} />
              <Row label="วันที่เริ่มดำเนินการ" value={detail.header.header_date_start} />
              <Row label="วันที่สิ้นสุด"       value={detail.header.header_date_end} />
              <Row label={TEXT.PR_DETAIL_PROBLEM}      value={detail.header.repair_problem} />
              <Row label={TEXT.PR_DETAIL_WORK_RESULT}  value={detail.header.repair_detail} />
              <Row label="วันที่แล้วเสร็จ"     value={detail.header.repair_finish_date} />
            </Section>
          )}

          {/* Technicians */}
          {detail.technicians && detail.technicians.length > 0 && (
            <Section title={TEXT.PR_DETAIL_TECHNICIANS}>
              {detail.technicians.map((t, i) => (
                <View key={i} style={styles.techRow}>
                  <ThemedText style={styles.value}>• {t.name}</ThemedText>
                </View>
              ))}
            </Section>
          )}

          {/* Materials */}
          {detail.requisition && detail.requisition.length > 0 && (
            <Section title={TEXT.PR_DETAIL_MATERIALS}>
              {detail.requisition.map((r, i) => (
                <View key={i} style={styles.materialRow}>
                  <ThemedText style={styles.value}>{r.requisition_equipment}</ThemedText>
                  <ThemedText style={styles.label}>
                    {r.requisition_equipment_number} {r.requisition_equipment_unit}
                    {r.requisition_equipment_price ? ` · ฿${r.requisition_equipment_price}` : ''}
                  </ThemedText>
                </View>
              ))}
            </Section>
          )}

        </ScrollView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#EF4444', textAlign: 'center' },
  scroll: { padding: 16, gap: 12 },
  header: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  repairNumber: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#922124', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 13, color: '#6B7280', width: 120, flexShrink: 0 },
  value: { fontSize: 13, color: '#111827', flex: 1 },
  techRow: { paddingVertical: 2 },
  materialRow: { paddingVertical: 4, gap: 2 },
});
