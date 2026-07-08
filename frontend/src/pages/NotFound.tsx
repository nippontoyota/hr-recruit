import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../components/ui';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <EmptyState 
          icon={<FileQuestion className="w-16 h-16 text-gray-400" />}
          title="Page Not Found"
          description="The page you are looking for doesn't exist or you don't have permission to view it."
          action={
            <Button onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          }
        />
      </div>
    </div>
  );
}
