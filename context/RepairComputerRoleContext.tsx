import { createContext, useContext, type ReactNode } from 'react';
import { REPAIR_COMPUTER_DEFAULT_ROLE, type RepairComputerRole } from '@/constants/types';

type RepairComputerRoleContextValue = {
  currentRole: RepairComputerRole;
};

const RepairComputerRoleContext = createContext<RepairComputerRoleContextValue>({
  currentRole: REPAIR_COMPUTER_DEFAULT_ROLE,
});

export function RepairComputerRoleProvider({
  children,
  currentRole,
}: {
  children: ReactNode;
  currentRole: RepairComputerRole;
}) {
  return (
    <RepairComputerRoleContext.Provider value={{ currentRole }}>
      {children}
    </RepairComputerRoleContext.Provider>
  );
}

export function useRepairComputerRole() {
  return useContext(RepairComputerRoleContext);
}
