import {
  NOTICE_REPAIR_ROLE_INFORMER, NOTICE_REPAIR_ROLE_APPROVE, NOTICE_REPAIR_ROLE_ADMIN,
  NOTICE_REPAIR_ROLE_HEADER, NOTICE_REPAIR_ROLE_TECHNICIAN, NOTICE_REPAIR_ROLE_PRIORITY,
  type NoticeRepairRole,
} from '@/constants/types';
import { TEXT } from '@/constants/text';

export const noticeRepairRoleOptions = [
  { label: TEXT.NOTICE_REPAIR_ROLE_INFORMER,   value: NOTICE_REPAIR_ROLE_INFORMER },
  { label: TEXT.NOTICE_REPAIR_ROLE_TECHNICIAN, value: NOTICE_REPAIR_ROLE_TECHNICIAN },
  { label: TEXT.NOTICE_REPAIR_ROLE_HEADER,     value: NOTICE_REPAIR_ROLE_HEADER },
  { label: TEXT.NOTICE_REPAIR_ROLE_ADMIN,      value: NOTICE_REPAIR_ROLE_ADMIN },
  { label: TEXT.NOTICE_REPAIR_ROLE_APPROVE,    value: NOTICE_REPAIR_ROLE_APPROVE },
] as const;

const privilegeCache = new Map<string, NoticeRepairRole[]>();
const selectedRoleCache = new Map<string, NoticeRepairRole>();

export function getCachedPRRoles(userId: string): NoticeRepairRole[] | undefined {
  return privilegeCache.get(userId);
}

export function setCachedPRRoles(userId: string, roles: NoticeRepairRole[]) {
  privilegeCache.set(userId, roles);
}

export function getDefaultPRRole(roles: NoticeRepairRole[]): NoticeRepairRole {
  if (!roles.length) return NOTICE_REPAIR_ROLE_INFORMER;
  return roles.reduce(
    (best, role) =>
      (NOTICE_REPAIR_ROLE_PRIORITY[role] ?? 0) > (NOTICE_REPAIR_ROLE_PRIORITY[best] ?? 0) ? role : best,
    NOTICE_REPAIR_ROLE_INFORMER as NoticeRepairRole,
  );
}

export function getAccessiblePRRoleOptions(roles: NoticeRepairRole[]) {
  const set = new Set(roles);
  if (!set.has(NOTICE_REPAIR_ROLE_INFORMER)) set.add(NOTICE_REPAIR_ROLE_INFORMER);
  return noticeRepairRoleOptions.filter((o) => set.has(o.value));
}

export function getCachedPRSelectedRole(userId: string): NoticeRepairRole | undefined {
  return selectedRoleCache.get(userId);
}

export function setCachedPRSelectedRole(userId: string, role: NoticeRepairRole) {
  selectedRoleCache.set(userId, role);
}

export function getPRDefaultRoute(role: NoticeRepairRole): string {
  switch (role) {
    case NOTICE_REPAIR_ROLE_APPROVE:     return '/notice-repair/approve-pending';
    case NOTICE_REPAIR_ROLE_ADMIN:       return '/notice-repair/admin-pending-receipt';
    case NOTICE_REPAIR_ROLE_HEADER:      return '/notice-repair/header-pending';
    case NOTICE_REPAIR_ROLE_TECHNICIAN:  return '/notice-repair/tech-assigned';
    // Informer lands on the current-job tab; the add (inform) screen is reached
    // via the floating button there.
    default:                  return '/notice-repair/informer-current';
  }
}
