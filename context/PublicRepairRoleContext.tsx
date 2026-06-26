import { createContext, useContext, type ReactNode } from 'react';
import { PR_DEFAULT_ROLE, type PublicRepairRole } from '@/constants/types';

type ContextValue = {
  currentRole: PublicRepairRole;
  availableRoles: PublicRepairRole[];
  roleSwitcher?: ReactNode;
  staffId: string;
};

const Ctx = createContext<ContextValue>({
  currentRole: PR_DEFAULT_ROLE,
  availableRoles: [PR_DEFAULT_ROLE],
  staffId: '',
});

export function PublicRepairRoleProvider({
  children,
  currentRole,
  availableRoles,
  roleSwitcher,
  staffId,
}: {
  children: ReactNode;
  currentRole: PublicRepairRole;
  availableRoles: PublicRepairRole[];
  roleSwitcher?: ReactNode;
  staffId: string;
}) {
  return (
    <Ctx.Provider value={{ currentRole, availableRoles, roleSwitcher, staffId }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePublicRepairRole() {
  return useContext(Ctx);
}
