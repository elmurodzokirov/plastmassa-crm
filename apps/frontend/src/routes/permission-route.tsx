import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionRouteProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
