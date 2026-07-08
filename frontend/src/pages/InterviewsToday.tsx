import { PageHeader } from '../components/layout/PageHeader';
import { Card, EmptyState } from '../components/ui';
import { Calendar } from 'lucide-react';

export default function InterviewsToday() {
  return (
    <>
      <PageHeader 
        title="Interviews Today" 
        description="Schedule and candidate details for today's interviews."
      />
      <Card>
        <div className="p-12">
          <EmptyState 
            icon={<Calendar className="w-8 h-8" />}
            title="No Interviews Scheduled"
            description="There are no candidates scheduled for an interview today."
          />
        </div>
      </Card>
    </>
  );
}
