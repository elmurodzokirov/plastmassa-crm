import { useAuthStore } from '@/stores/auth.store';

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);

  const can = (permission: string) => permissions.includes(permission);
  const canAny = (...ps: string[]) => ps.some((p) => permissions.includes(p));

  return { can, canAny, permissions };
}
