import { CalendarDays, MapPin } from 'lucide-react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { TEXT } from '@/constants/text';
import type { NoticeRepairJob } from '@/models/types';
import { getCategoryIcon } from '@/utils/category-icon';
import { formatDateOnly } from '@/utils/date-format';
import { useColors } from '@/constants/theme';

// Same solid Flat UI swatches (white text) the absence rows use, so a status
// badge reads identically across modules — see components/absence/absence-list-item.tsx.
const DONE = { bg: '#2ECC71', text: '#FFFFFF' }; // Emerald  — approved / finished
const PENDING = { bg: '#F1C40F', text: '#FFFFFF' }; // Sun Flower — waiting / in progress
const REJECTED = { bg: '#E74C3C', text: '#FFFFFF' }; // Alizarin — rejected / cancelled

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '001': PENDING,
  '002': DONE,
  '003': PENDING,
  '004': PENDING,
  '005': PENDING,
  '006': PENDING,
  '007': PENDING,
  '008': DONE,
  '106': DONE,
  '200': REJECTED,
};

function statusColor(status?: string) {
  if (!status) return PENDING;
  if (status.startsWith('1') && status !== '106') return REJECTED;
  return STATUS_COLORS[status] ?? PENDING;
}

function statusBadge(job: NoticeRepairJob): { label: string; bg: string; text: string } {
  if (job.pending_type === 'header_rejected') {
    return { label: TEXT.NOTICE_REPAIR_PENDING_HEADER_REJECTED, ...REJECTED };
  }
  if (job.pending_type === 'new') {
    return { label: TEXT.NOTICE_REPAIR_PENDING_NEW, ...PENDING };
  }
  const sc = statusColor(job.repair_status);
  return { label: job.repair_status_name ?? job.repair_status ?? '', ...sc };
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
      icon={<IconSymbol name={categoryIcon} size={22} color={c.text} />}
      iconBackground={c.surfaceMuted}
      title={job.work_category_name || '-'}
      badge={badge.label ? { text: badge.label, bg: badge.bg, color: badge.text } : null}
      showChevron={!badge.label}
      meta={[
        { icon: <CalendarDays size={13} color={c.textMuted} />, text: dateText },
        { icon: <MapPin size={13} color={c.textMuted} />, text: location },
      ]}
    />
  );
}
