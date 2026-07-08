import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui';
import { Plus } from 'lucide-react';

export default function CandidatesList() {
  return (
    <>
      <PageHeader 
        title="Candidates" 
        action={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        }
      />
      
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-secondary">Candidates list goes here</p>
      </div>
    </>
  );
}
