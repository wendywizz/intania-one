import { ThemedText } from '@/components/themed-text';
import { TEXT } from '@/constants/text';
import type { PublicRepairJob } from '@/models/types';
import { formatDateOnly } from '@/utils/date-format';
import { Pressable, StyleSheet, View } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '001': { bg: '#EFF6FF', text: '#2563EB' },
  '002': { bg: '#F0FDF4', text: '#16A34A' },
  '003': { bg: '#FFFBEB', text: '#D97706' },
  '004': { bg: '#FFF7ED', text: '#EA580C' },
  '005': { bg: '#FFF7ED', text: '#EA580C' },
  '006': { bg: '#FFF7ED', text: '#EA580C' },
  '007': { bg: '#FFF7ED', text: '#EA580C' },
  '008': { bg: '#F0FDF4', text: '#15803D' },
  '106': { bg: '#F0FDF4', text: '#15803D' },
  '200': { bg: '#FEF2F2', text: '#DC2626' },
};

function statusColor(status?: string) {
  if (!status) return { bg: '#F3F4F6', text: '#6B7280' };
  if (status.startsWith('1') && status !== '106') return { bg: '#FEF2F2', text: '#B91C1C' };
  return STATUS_COLORS[status] ?? { bg: '#F3F4F6', text: '#6B7280' };
}

function statusBadge(job: PublicRepairJob): { label: string; bg: string; text: string } {
  if (job.pending_type === 'header_rejected') {
    return { label: TEXT.PR_PENDING_HEADER_REJECTED, bg: '#FEF2F2', text: '#B91C1C' };
  }
  if (job.pending_type === 'new') {
    return { label: TEXT.PR_PENDING_NEW, bg: '#EFF6FF', text: '#2563EB' };
  }
  const sc = statusColor(job.repair_status);
  return { label: job.repair_status_name ?? job.repair_status ?? '', bg: sc.bg, text: sc.text };
}

type Props = {
  job: PublicRepairJob;
  onPress: (job: PublicRepairJob) => void;
};

export function PublicRepairJobCard({ job, onPress }: Props) {
  const badge = statusBadge(job);
  const number = job.repair_number ? `#${job.repair_number}` : `${job.repair_id}`;
  const location = [job.repair_place, job.building_name].filter(Boolean).join(' · ');
  const dateRaw = job.repair_inform_date_th || job.repair_inform_date;
  const dateText = dateRaw ? formatDateOnly(dateRaw) : null;

  return (
    <Pressable style={styles.card} onPress={() => onPress(job)} accessibilityRole="button">
      {/* Row 1: หมายเลขงาน + สถานะ */}
      <View style={styles.row}>
        <ThemedText style={styles.number}>{number}</ThemedText>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <ThemedText style={[styles.badgeText, { color: badge.text }]}>
            {badge.label}
          </ThemedText>
        </View>
      </View>

      {/* Row 2: ประเภทงาน */}
      {!!job.work_category_name && (
        <ThemedText style={styles.category}>{job.work_category_name}</ThemedText>
      )}

      {/* Row 3: สถานที่ */}
      {!!location && (
        <ThemedText style={styles.location} numberOfLines={1}>{location}</ThemedText>
      )}

      {/* Row 4: วันที่แจ้ง */}
      {!!dateText && (
        <ThemedText style={styles.date}>แจ้งเมื่อ {dateText}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 5,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  number: { fontSize: 13, fontWeight: '600', color: '#374151' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  category: { fontSize: 14, color: '#922124', fontWeight: '600' },
  location: { fontSize: 13, color: '#6B7280' },
  date: { fontSize: 12, color: '#9CA3AF' },
});
