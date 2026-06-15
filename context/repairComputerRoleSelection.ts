import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_USER,
  PRIVILEGE_RC_WORKER,
  type RepairComputerRole,
} from '@/constants/types';
import { TEXT } from '@/constants/text';

export const repairComputerRoleOptions = [
  { label: 'User', value: PRIVILEGE_RC_USER },
  { label: TEXT.REPAIR_COMPUTER_WORKER, value: PRIVILEGE_RC_WORKER },
  { label: TEXT.REPAIR_COMPUTER_FOREMAN, value: PRIVILEGE_RC_FOREMAN },
] as const;

const privilegeRoleCache = new Map<string, RepairComputerRole>();
const selectedRoleCache = new Map<string, RepairComputerRole>();

export function getCachedRepairComputerPrivilege(userId: string): RepairComputerRole | undefined {
  return privilegeRoleCache.get(userId);
}

export function setCachedRepairComputerPrivilege(userId: string, role: RepairComputerRole) {
  privilegeRoleCache.set(userId, role);
}

export function getAccessibleRepairComputerRoleOptions(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_FOREMAN) {
    return repairComputerRoleOptions;
  }

  if (role === PRIVILEGE_RC_WORKER) {
    return repairComputerRoleOptions.filter((option) => option.value !== PRIVILEGE_RC_FOREMAN);
  }

  return repairComputerRoleOptions.filter((option) => option.value === PRIVILEGE_RC_USER);
}

export function canAccessRepairComputerRole(privilegeRole: RepairComputerRole, role: RepairComputerRole) {
  return getAccessibleRepairComputerRoleOptions(privilegeRole).some((option) => option.value === role);
}

export function getRepairComputerSelectedRole(userId: string, privilegeRole: RepairComputerRole) {
  const selectedRole = selectedRoleCache.get(userId);

  if (selectedRole && canAccessRepairComputerRole(privilegeRole, selectedRole)) {
    return selectedRole;
  }

  return privilegeRole;
}

export function setRepairComputerSelectedRole(userId: string, role: RepairComputerRole) {
  selectedRoleCache.set(userId, role);
}
