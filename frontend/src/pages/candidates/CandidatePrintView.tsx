import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicGetBasicCandidate } from '../../api/candidates';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { FileX } from 'lucide-react';
import { CandidateSummaryDocument } from '../../components/candidates/CandidateSummaryDocument';

export default function CandidatePrintView() {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [cand, evals] = await Promise.all([
          publicGetBasicCandidate(id),
          getCandidateEvaluations(id)
        ]);
        setCandidate(cand);
        setEvaluations(evals);
      } catch (error) {
        console.error('Error fetching data for print:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;
  }

  if (!candidate) {
    return (
      <div className="bg-white text-black p-8">
        <EmptyState 
          icon={<FileX className="w-12 h-12 text-muted-foreground" />}
          title="Not Found" 
          description="Candidate data could not be loaded for printing." 
        />
      </div>
    );
  }

  return <CandidateSummaryDocument candidate={candidate} evaluations={evaluations} />;
}
