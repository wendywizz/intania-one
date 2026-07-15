import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import type { NoticeRepairJob } from '@/models/types';
import { getCategoryIcon } from '@/utils/category-icon';
import { formatDateOnly } from '@/utils/date-format';
import { Pressable, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

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

function statusBadge(job: NoticeRepairJob): { label: string; bg: string; text: string } {
  if (job.pending_type === 'header_rejected') {
    return { label: TEXT.NOTICE_REPAIR_PENDING_HEADER_REJECTED, bg: '#FEF2F2', text: '#B91C1C' };
  }
  if (job.pending_type === 'new') {
    return { label: TEXT.NOTICE_REPAIR_PENDING_NEW, bg: '#EFF6FF', text: '#2563EB' };
  }
  const sc = statusColor(job.repair_status);
  return { label: job.repair_status_name ?? job.repair_status ?? '', bg: sc.bg, text: sc.text };
}

type Props = {
  job: NoticeRepairJob;
  onPress: (job: NoticeRepairJob) => void;
};

export function NoticeRepairJobCard({ job, onPress }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const badge = statusBadge(job);
  // ID hidden for now (kept in `job.repair_id` for upcoming update/remove actions).
  // const number = job.repair_number ? `#${job.repair_number}` : `${job.repair_id}`;
  const location = [job.repair_place, job.building_name].filter(Boolean).join(' · ');
  const dateRaw = job.repair_inform_date_th || job.repair_inform_date;
  const dateText = dateRaw ? formatDateOnly(dateRaw) : null;
  const categoryIcon = getCategoryIcon(job.work_category_name);

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(job)}>
      <ThemedView style={styles.card} lightColor="#FFFFFF" darkColor="#151718">
        <View style={styles.cardRow}>
          {/* Leading category icon */}
          <View style={styles.iconBox}>
            <IconSymbol name={categoryIcon} size={22} color={c.primary} />
          </View>

          <View style={styles.content}>
            {/* Header: ประเภทงาน + สถานะ (หมายเลขงาน/ID ซ่อนไว้) */}
            <View style={styles.header}>
              <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
                {job.work_category_name || '-'}
              </ThemedText>
              {!!badge.label && (
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <ThemedText style={[styles.statusText, { color: badge.text }]} numberOfLines={1}>
                    {badge.label}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* สถานที่ */}
            {!!location && (
              <View style={styles.metaRow}>
                <ThemedText style={styles.metaValue} numberOfLines={1}>{location}</ThemedText>
              </View>
            )}

            {/* วันที่แจ้ง */}
            {!!dateText && (
              <View style={styles.dateRow}>
                <IconSymbol name="calendar" size={13} color={c.textMuted} />
                <ThemedText style={styles.metaText}>{dateText}</ThemedText>
              </View>
            )}
          </View>

          {/* Navigable indicator */}
          <IconSymbol name="chevron.right" size={18} color={c.textFaint} style={styles.chevron} />
        </View>
      </ThemedView>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chevron: { alignSelf: 'center' },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
  },
  content: { flex: 1, gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
    marginTop: 1,
    maxWidth: '45%',
  },
  statusText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaLabel: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
  metaValue: { color: c.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '500', flexShrink: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
});
