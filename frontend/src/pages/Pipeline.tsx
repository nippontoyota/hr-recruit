import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui';
import { Kanban } from 'lucide-react';

export default function Pipeline() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pipeline" 
      />
      <EmptyState
        icon={<Kanban className="w-12 h-12 text-primary" />}
        title="Recruitment Pipeline"
        description="The pipeline view is currently under development by the backend team."
      />
    </div>
  );
}
