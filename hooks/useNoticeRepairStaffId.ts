import { useAuth } from '@/context/AuthContext';

export function useNoticeRepairStaffId(): string {
  const { user } = useAuth();
  return user?.staffId ?? '';
}
