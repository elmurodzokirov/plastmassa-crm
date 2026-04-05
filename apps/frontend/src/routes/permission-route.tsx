import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionRouteProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { can } = usePermissions();
  const location = useLocation();

  if (!can(permission)) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ from, requiredPermission: permission }}
      />
    );
  }

  return <>{children}</>;
}
