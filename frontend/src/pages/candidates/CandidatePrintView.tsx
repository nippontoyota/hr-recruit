import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidateById } from '../../api/candidates';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { FileX, Home, ArrowLeft } from 'lucide-react';
import { HoReviewPacket } from '../../components/candidates/HoReviewPacket';
import { isAbortError } from '../../lib/utils';

export default function CandidatePrintView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const [cand, evals] = await Promise.all([
          getCandidateById(id, controller.signal),
          getCandidateEvaluations(id)
        ]);
        if (controller.signal.aborted) return;
        setCandidate(cand ?? null);
        setEvaluations(evals);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        console.error('Error fetching data for print:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchData();
    return () => controller.abort();
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

  return (
    <div>
      <div className="no-print p-3 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/candidates')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold text-xs shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold hover:bg-muted text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{candidate.full_name} — Print Review</span>
      </div>
      <HoReviewPacket
        candidate={candidate}
        evaluations={evaluations}
        includeCss={true}
        includeSalaryProposal={true}
      />
    </div>
  );
}
