import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../components/ui';
import { FileQuestion } from 'lucide-react';
import { PublicShell } from '../components/layout/PublicShell';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <PublicShell maxWidth="md">
      <EmptyState
        icon={<FileQuestion className="w-12 h-12" />}
        title="Page not found"
        description="This page does not exist or you may not have permission to view it."
        action={
          <Button onClick={() => navigate('/candidates')}>
            Go to Candidates
          </Button>
        }
      />
    </PublicShell>
  );
}
