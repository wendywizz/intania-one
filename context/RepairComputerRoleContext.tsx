import { createContext, useContext, type ReactNode } from 'react';

type RepairComputerRoleContextValue = {
  roleSwitcher?: ReactNode;
};

const RepairComputerRoleContext = createContext<RepairComputerRoleContextValue>({});

export function RepairComputerRoleProvider({
  children,
  roleSwitcher,
}: {
  children: ReactNode;
  roleSwitcher?: ReactNode;
}) {
  return (
    <RepairComputerRoleContext.Provider value={{ roleSwitcher }}>
      {children}
    </RepairComputerRoleContext.Provider>
  );
}

export function useRepairComputerRole() {
  return useContext(RepairComputerRoleContext);
}
