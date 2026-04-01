import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permissions, children, fallback = null }: PermissionGateProps) {
  const { canAny } = usePermissions();

  if (!canAny(...permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
