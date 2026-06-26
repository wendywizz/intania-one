import {
  PR_ROLE_INFORMER, PR_ROLE_APPROVE, PR_ROLE_ADMIN,
  PR_ROLE_HEADER, PR_ROLE_TECHNICIAN, PR_ROLE_PRIORITY,
  type PublicRepairRole,
} from '@/constants/types';
import { TEXT } from '@/constants/text';

export const publicRepairRoleOptions = [
  { label: TEXT.PR_ROLE_INFORMER,   value: PR_ROLE_INFORMER },
  { label: TEXT.PR_ROLE_TECHNICIAN, value: PR_ROLE_TECHNICIAN },
  { label: TEXT.PR_ROLE_HEADER,     value: PR_ROLE_HEADER },
  { label: TEXT.PR_ROLE_ADMIN,      value: PR_ROLE_ADMIN },
  { label: TEXT.PR_ROLE_APPROVE,    value: PR_ROLE_APPROVE },
] as const;

const privilegeCache = new Map<string, PublicRepairRole[]>();
const selectedRoleCache = new Map<string, PublicRepairRole>();

export function getCachedPRRoles(userId: string): PublicRepairRole[] | undefined {
  return privilegeCache.get(userId);
}

export function setCachedPRRoles(userId: string, roles: PublicRepairRole[]) {
  privilegeCache.set(userId, roles);
}

export function getDefaultPRRole(roles: PublicRepairRole[]): PublicRepairRole {
  if (!roles.length) return PR_ROLE_INFORMER;
  return roles.reduce(
    (best, role) =>
      (PR_ROLE_PRIORITY[role] ?? 0) > (PR_ROLE_PRIORITY[best] ?? 0) ? role : best,
    PR_ROLE_INFORMER as PublicRepairRole,
  );
}

export function getAccessiblePRRoleOptions(roles: PublicRepairRole[]) {
  const set = new Set(roles);
  if (!set.has(PR_ROLE_INFORMER)) set.add(PR_ROLE_INFORMER);
  return publicRepairRoleOptions.filter((o) => set.has(o.value));
}

export function getCachedPRSelectedRole(userId: string): PublicRepairRole | undefined {
  return selectedRoleCache.get(userId);
}

export function setCachedPRSelectedRole(userId: string, role: PublicRepairRole) {
  selectedRoleCache.set(userId, role);
}

export function getPRDefaultRoute(role: PublicRepairRole): string {
  switch (role) {
    case PR_ROLE_APPROVE:     return '/public-repair/approve-pending';
    case PR_ROLE_ADMIN:       return '/public-repair/admin-approved';
    case PR_ROLE_HEADER:      return '/public-repair/header-pending';
    case PR_ROLE_TECHNICIAN:  return '/public-repair/tech-assigned';
    default:                  return '/public-repair/inform';
  }
}
