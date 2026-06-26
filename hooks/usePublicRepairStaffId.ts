import { useAuth } from '@/context/AuthContext';

export function usePublicRepairStaffId(): string {
  const { user } = useAuth();
  return user?.staffId ?? '';
}
