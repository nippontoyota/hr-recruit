import { useAuth } from '../../auth';
import type { UserRole } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { ShieldAlert } from 'lucide-react';

interface RoleRouteProps {
  allowed: UserRole[];
  children: React.ReactNode;
}

export const RoleRoute = ({ allowed, children }: RoleRouteProps) => {
  const { role, isLoading } = useAuth();

  if (isLoading) return null; // handled by ProtectedRoute usually

  if (!role || !allowed.includes(role)) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <EmptyState
          icon={<ShieldAlert className="w-12 h-12 text-red-500" />}
          title="Access Denied"
          description="You do not have permission to view this page."
          className="max-w-md w-full"
        />
      </div>
    );
  }

  return <>{children}</>;
};
