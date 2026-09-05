import { CalendarDays } from 'lucide-react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { UserAvatar } from '@/components/user-avatar';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_HAJJ,
  TYPE_ABSENCE_HELPMATE,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from '@/constants/types';
import type { absence } from '@/models/types';
import { formatDateRange } from '@/utils/date-format';

const absenceTypeLabels: Record<string, string> = {
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_HELPMATE]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeFields = ['absentType', 'absenceType', 'ABSENCE_type', 'typeabsence', 'type_absence', 'leaveType', 'leave_type', 'type'];
const absenceTypeNameFields = ['absentTypeName', 'absenceTypeName', 'ABSENCE_type_name', 'typeName', 'type_name', 'leaveTypeName', 'leave_type_name'];
const startDateFields = ['startDate', 'start_date', 'dateStart', 'date_start'];
const endDateFields = ['endDate', 'end_date', 'dateEnd', 'date_end'];
const statusNameFields = ['statusName', 'status_name', 'approvalStatusName', 'requestStatusName', 'flowStatusName'];
const statusCodeFields = ['status', 'requestStatus', 'request_status', 'approvalStatus', 'approval_status', 'flowStatus', 'flow_status'];

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export function getAbsenceId(item: absence) {
  return getText(item, ['id', 'absenceId', 'ABSENCE_id', 'requestId', 'request_id']);
}

export function getAbsenceType(item: absence) {
  return getText(item, absenceTypeFields);
}

function getAbsenceTypeLabel(item: absence) {
  const typeName = getText(item, absenceTypeNameFields);
  const type = getAbsenceType(item);
  return typeName || absenceTypeLabels[type] || (type ? `Absence type ${type}` : 'Absence');
}

function getDateRange(item: absence) {
  return formatDateRange(getText(item, startDateFields), getText(item, endDateFields));
}

const reasonFields = ['reason', 'detail', 'description'];
const approverFields = ['approveName', 'approverName', 'approver_name', 'approverPositionName', 'approver_position_name', 'approver'];
const agentFields = ['agentName', 'agent_name', 'agentNames', 'agent_names', 'selectedAgents', 'selected_agents', 'agents'];

type MetaRow = { label: string; value: string };

// Extra label/value rows (reason, approver, delegate) surfaced when a list wants
// to show more than the summary — only the fields that are present are returned.
function getMetaRows(item: absence): MetaRow[] {
  const rows: MetaRow[] = [];
  const reason = getText(item, reasonFields);
  if (reason) rows.push({ label: 'เหตุผล', value: reason });
  const approver = getText(item, approverFields);
  if (approver) rows.push({ label: 'ผู้อนุมัติ', value: approver });
  const agent = getText(item, agentFields);
  if (agent) rows.push({ label: 'ผู้ปฏิบัติงานแทน', value: agent });
  return rows;
}

// Mirrors the same field probing in app/absence/approve-detail.tsx, which is
// what the raw queue/history item's shape is built to answer.
function getStaffName(staff: object): string {
  const s = staff as absence;
  const fullName = getText(s, ['staffFullName', 'staff_full_name', 'fullname', 'fullName', 'staffName', 'staff_name', 'name']);
  if (fullName) return fullName;
  const prefix = getText(s, ['prefixNameTH', 'prefix_name_th', 'PREFIX_NAME_TH', 'prefix']);
  const firstName = getText(s, ['firstNameTH', 'first_name_th', 'FIRST_NAME_TH', 'firstName', 'first_name']);
  const lastName = getText(s, ['lastNameTH', 'last_name_th', 'LAST_NAME_TH', 'lastName', 'last_name']);
  return [prefix, firstName, lastName].filter(Boolean).join(' ');
}

// Profile photos are keyed by UNI_STAFF_ID.
function getStaffId(staff: object): string {
  return getText(staff as absence, ['uniStaffId', 'uni_staff_id', 'UNI_STAFF_ID']);
}

type Requester = { name: string; staffId?: string };

function getRequesterInfo(item: absence): Requester {
  const record = item as Record<string, unknown>;
  const req = record.requester;
  if (req && typeof req === 'object' && !Array.isArray(req)) {
    return { name: getStaffName(req), staffId: getStaffId(req) };
  }
  return {
    name: getText(item, ['name', 'fullname', 'staffName', 'staff_name']),
    // requestStaffId: what /approving and /approving-history return — those
    // list endpoints carry no nested `requester` object, only a flat name and
    // (as of the Phoenix-side fix) this one id field.
    staffId: getText(item, ['requestStaffId', 'request_staff_id', 'uniStaffId', 'uni_staff_id']),
  };
}

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child' | 'doc.text.fill';

function getTypeIcon(type: string): IconName {
  switch (type) {
    case TYPE_ABSENCE_SICK: return 'cross.fill';
    case TYPE_ABSENCE_BUSINESS: return 'briefcase.fill';
    case TYPE_ABSENCE_RELAX: return 'sun.max.fill';
    case TYPE_ABSENCE_BIRTH: return 'figure.child';
    case TYPE_ABSENCE_HELPMATE: return 'figure.child';
    default: return 'doc.text.fill';
  }
}

export type AbsenceBadge = { text: string; bg: string; color: string };

// Flat UI (Defo) swatches with white text: Sun Flower (pending), Emerald
// (approved), Alizarin (rejected).
export const PENDING_BADGE: AbsenceBadge = { text: TEXT.ABSENCE_PENDING_BADGE, bg: '#F1C40F', color: '#FFFFFF' };

function statusBadgeColors(label: string): { bg: string; color: string } {
  const lower = label.toLowerCase();
  if (lower.includes('อนุมัติแล้ว') || lower.includes('approved') || lower.includes('completed') || lower.includes('success')) {
    return { bg: '#2ECC71', color: '#FFFFFF' }; // Emerald
  }
  if (lower.includes('รออนุมัติ') || lower.includes('pending') || lower.includes('waiting') || lower.includes('processing')) {
    return { bg: '#F1C40F', color: '#FFFFFF' }; // Sun Flower
  }
  if (lower.includes('ไม่อนุมัติ') || lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
    return { bg: '#E74C3C', color: '#FFFFFF' }; // Alizarin
  }
  return { bg: '#E74C3C', color: '#FFFFFF' }; // Alizarin (fallback)
}

// Status badge derived from a leave record — used by the history & approval
// lists. Returns null when the record has no meaningful status.
export function getStatusBadge(item: absence): AbsenceBadge | null {
  const name = getText(item, statusNameFields);
  const code = getText(item, statusCodeFields);
  const label = name || (code && code !== '0' ? code : '');
  if (!label) return null;
  return { text: label, ...statusBadgeColors(label) };
}

type AbsenceListItemProps = {
  item: absence;
  badge?: AbsenceBadge | null;
  onPress?: (item: absence) => void;
  /** Show extra detail rows (reason, approver, delegate) beneath the date. */
  showDetails?: boolean;
  /**
   * Lead with the requester's photo + name instead of the leave type — for an
   * approver looking through other people's requests, whose leave it is
   * matters more than what kind it is. The leave type moves down into a meta
   * row above the date instead of disappearing. Own-leave lists (my-leave,
   * pending, history) leave this off since there the requester is always the
   * viewer.
   */
  showRequester?: boolean;
};

// Shared file-upload style leave row used by the pending, history and approval
// lists so every leave item renders identically: monochrome type icon, leave
// type, date range and a trailing status badge (or a chevron when there is no
// badge).
export function AbsenceListItem({ item, badge, onPress, showDetails, showRequester }: AbsenceListItemProps) {
  const c = useColors();
  const type = getAbsenceType(item);
  const typeLabel = getAbsenceTypeLabel(item);
  const dateRange = getDateRange(item);
  const typeIcon = getTypeIcon(type);
  const metaRows = showDetails ? getMetaRows(item) : [];

  const requester = showRequester ? getRequesterInfo(item) : null;
  // Falls back to the plain type-icon row when the item carries no requester
  // info at all (e.g. an older record shaped without it).
  const hasRequester = Boolean(requester?.name || requester?.staffId);

  return (
    <ListCard
      onPress={onPress ? () => onPress(item) : undefined}
      icon={
        hasRequester ? (
          <UserAvatar staffId={requester!.staffId} size={40} />
        ) : (
          <IconSymbol name={typeIcon} size={22} color={c.text} />
        )
      }
      iconBackground={hasRequester ? undefined : c.surfaceMuted}
      title={hasRequester ? requester!.name || typeLabel : typeLabel}
      badge={badge ? { text: badge.text, bg: badge.bg, color: badge.color } : null}
      showChevron={!badge}
      meta={[
        ...(hasRequester ? [{ icon: <IconSymbol name={typeIcon} size={13} color={c.textMuted} />, text: typeLabel }] : []),
        ...(dateRange ? [{ icon: <CalendarDays size={13} color={c.textMuted} />, text: dateRange }] : []),
        ...metaRows.map((m) => ({ label: m.label, text: m.value })),
      ]}
    />
  );
}
