import {
  PR_ROLE_INFORMER, PR_ROLE_APPROVE, PR_ROLE_ADMIN,
  PR_ROLE_HEADER, PR_ROLE_TECHNICIAN, PR_ROLE_PRIORITY,
  type NoticeRepairRole,
} from '@/constants/types';
import { TEXT } from '@/constants/text';

export const noticeRepairRoleOptions = [
  { label: TEXT.PR_ROLE_INFORMER,   value: PR_ROLE_INFORMER },
  { label: TEXT.PR_ROLE_TECHNICIAN, value: PR_ROLE_TECHNICIAN },
  { label: TEXT.PR_ROLE_HEADER,     value: PR_ROLE_HEADER },
  { label: TEXT.PR_ROLE_ADMIN,      value: PR_ROLE_ADMIN },
  { label: TEXT.PR_ROLE_APPROVE,    value: PR_ROLE_APPROVE },
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
  if (!roles.length) return PR_ROLE_INFORMER;
  return roles.reduce(
    (best, role) =>
      (PR_ROLE_PRIORITY[role] ?? 0) > (PR_ROLE_PRIORITY[best] ?? 0) ? role : best,
    PR_ROLE_INFORMER as NoticeRepairRole,
  );
}

export function getAccessiblePRRoleOptions(roles: NoticeRepairRole[]) {
  const set = new Set(roles);
  if (!set.has(PR_ROLE_INFORMER)) set.add(PR_ROLE_INFORMER);
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
    case PR_ROLE_APPROVE:     return '/notice-repair/approve-pending';
    case PR_ROLE_ADMIN:       return '/notice-repair/admin-approved';
    case PR_ROLE_HEADER:      return '/notice-repair/header-pending';
    case PR_ROLE_TECHNICIAN:  return '/notice-repair/tech-assigned';
    default:                  return '/notice-repair/inform';
  }
}
