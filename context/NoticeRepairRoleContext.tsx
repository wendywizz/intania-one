import { createContext, useContext, type ReactNode } from 'react';
import { PR_DEFAULT_ROLE, type NoticeRepairRole } from '@/constants/types';

type ContextValue = {
  currentRole: NoticeRepairRole;
  availableRoles: NoticeRepairRole[];
  roleSwitcher?: ReactNode;
  staffId: string;
};

const Ctx = createContext<ContextValue>({
  currentRole: PR_DEFAULT_ROLE,
  availableRoles: [PR_DEFAULT_ROLE],
  staffId: '',
});

export function NoticeRepairRoleProvider({
  children,
  currentRole,
  availableRoles,
  roleSwitcher,
  staffId,
}: {
  children: ReactNode;
  currentRole: NoticeRepairRole;
  availableRoles: NoticeRepairRole[];
  roleSwitcher?: ReactNode;
  staffId: string;
}) {
  return (
    <Ctx.Provider value={{ currentRole, availableRoles, roleSwitcher, staffId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNoticeRepairRole() {
  return useContext(Ctx);
}
