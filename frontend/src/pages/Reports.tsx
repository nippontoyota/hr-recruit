import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui';
import { FileText } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports" 
      />
      <EmptyState
        icon={<FileText className="w-12 h-12 text-primary" />}
        title="Analytics & Reports"
        description="The reporting module is currently under development by the backend team."
      />
    </div>
  );
}
