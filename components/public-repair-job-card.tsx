import { ThemedText } from '@/components/themed-text';
import type { PublicRepairJob } from '@/models/types';
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

type Props = {
  job: PublicRepairJob;
  onPress: (job: PublicRepairJob) => void;
};

export function PublicRepairJobCard({ job, onPress }: Props) {
  const sc = statusColor(job.repair_status);
  const number = job.repair_number ? `#${job.repair_number}` : `ID ${job.repair_id}`;
  const location = [job.repair_place, job.building_name].filter(Boolean).join(' · ');

  return (
    <Pressable style={styles.card} onPress={() => onPress(job)} accessibilityRole="button">
      <View style={styles.row}>
        <ThemedText style={styles.number}>{number}</ThemedText>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <ThemedText style={[styles.badgeText, { color: sc.text }]}>
            {job.repair_status_name ?? job.repair_status}
          </ThemedText>
        </View>
      </View>

      {!!job.work_category_name && (
        <ThemedText style={styles.category}>{job.work_category_name}</ThemedText>
      )}

      <ThemedText style={styles.description} numberOfLines={2}>
        {job.repair_inform ?? '—'}
      </ThemedText>

      <View style={styles.footer}>
        {!!location && (
          <ThemedText style={styles.meta} numberOfLines={1}>{location}</ThemedText>
        )}
        {!!job.repair_inform_date_th && (
          <ThemedText style={styles.date}>{job.repair_inform_date_th}</ThemedText>
        )}
      </View>
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
    gap: 6,
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
  category: { fontSize: 12, color: '#922124', fontWeight: '500' },
  description: { fontSize: 14, color: '#111827', lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  meta: { flex: 1, fontSize: 12, color: '#6B7280' },
  date: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
});
