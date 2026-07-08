import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Button, StageBadge } from '../../components/ui';
import { getCandidates } from '../../api/candidates';
import type { Candidate } from '../../types';
import { Plus } from 'lucide-react';

export default function CandidatesList() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getCandidates().then(setCandidates);
  }, []);

  const columns = [
    { header: 'ID', accessorKey: 'candidate_id' as keyof Candidate },
    { 
      header: 'Name', 
      cell: (item: Candidate) => (
        <div className="font-medium text-gray-900">{item.full_name}</div>
      )
    },
    { header: 'Phone', accessorKey: 'phone' as keyof Candidate },
    { header: 'Source', accessorKey: 'source_channel' as keyof Candidate },
    { 
      header: 'Stage',
      cell: (item: Candidate) => <StageBadge stage={item.current_stage} />
    },
    { 
      header: 'Applied Date', 
      cell: (item: Candidate) => new Date(item.applied_at).toLocaleDateString()
    },
    {
      header: 'Actions',
      cell: (item: Candidate) => (
        <Button variant="secondary" size="sm" onClick={() => navigate(`/candidates/${item.id}`)}>
          View
        </Button>
      )
    }
  ];

  return (
    <>
      <PageHeader 
        title="Candidates" 
        description="Manage and track all candidate applications."
        action={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        }
      />
      
      <DataTable
        columns={columns}
        data={candidates}
        keyExtractor={(item) => item.id}
      />
    </>
  );
}
