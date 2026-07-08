import { PageHeader } from '../components/layout/PageHeader';
import { Card, EmptyState } from '../components/ui';
import { MessageSquare } from 'lucide-react';

export default function Messages() {
  return (
    <>
      <PageHeader 
        title="Messages" 
        description="WhatsApp and Email communications with candidates."
      />
      <Card>
        <div className="p-12">
          <EmptyState 
            icon={<MessageSquare className="w-8 h-8" />}
            title="Inbox Empty"
            description="You don't have any recent messages."
          />
        </div>
      </Card>
    </>
  );
}
