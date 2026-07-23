import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { TEXT } from '@/constants/text';
import type { NoticeRepairJob } from '@/models/types';
import { getCategoryIcon } from '@/utils/category-icon';
import { formatDateOnly } from '@/utils/date-format';
import { useColors } from '@/constants/theme';

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
  const badge = statusBadge(job);
  // ID hidden for now (kept in `job.repair_id` for upcoming update/remove actions).
  // const number = job.repair_number ? `#${job.repair_number}` : `${job.repair_id}`;
  const location = [job.repair_place, job.building_name].filter(Boolean).join(' · ');
  const dateRaw = job.repair_inform_date_th || job.repair_inform_date;
  const dateText = dateRaw ? formatDateOnly(dateRaw) : '';
  const categoryIcon = getCategoryIcon(job.work_category_name);

  return (
    <ListCard
      onPress={() => onPress(job)}
      icon={<IconSymbol name={categoryIcon} size={22} color={c.primary} />}
      title={job.work_category_name || '-'}
      badge={badge.label ? { text: badge.label, bg: badge.bg, color: badge.text } : null}
      meta={[
        { text: location },
        { icon: <IconSymbol name="calendar" size={13} color={c.textMuted} />, text: dateText },
      ]}
    />
  );
}
