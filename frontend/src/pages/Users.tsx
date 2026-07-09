import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui';
import { UserCog } from 'lucide-react';

export default function Users() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Management" 
      />
      <EmptyState
        icon={<UserCog className="w-12 h-12 text-primary" />}
        title="User Management"
        description="User administration is currently under development by the backend team."
      />
    </div>
  );
}
