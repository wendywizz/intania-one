import { createContext, useContext, type ReactNode } from 'react';
import { REPAIR_COMPUTER_DEFAULT_ROLE, type RepairComputerRole } from '@/constants/type-repair-computer';

type RepairComputerRoleContextValue = {
  currentRole: RepairComputerRole;
  roleSwitcher?: ReactNode;
};

const RepairComputerRoleContext = createContext<RepairComputerRoleContextValue>({
  currentRole: REPAIR_COMPUTER_DEFAULT_ROLE,
});

export function RepairComputerRoleProvider({
  children,
  currentRole,
  roleSwitcher,
}: {
  children: ReactNode;
  currentRole: RepairComputerRole;
  roleSwitcher?: ReactNode;
}) {
  return (
    <RepairComputerRoleContext.Provider value={{ currentRole, roleSwitcher }}>
      {children}
    </RepairComputerRoleContext.Provider>
  );
}

export function useRepairComputerRole() {
  return useContext(RepairComputerRoleContext);
}
