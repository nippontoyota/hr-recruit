import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../ui';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';

interface FinalApprovalWidgetProps {
  candidate: Candidate;
  onUpdate?: () => void; // Keeping as optional since it might be passed by parent
}

export function FinalApprovalWidget({ candidate }: FinalApprovalWidgetProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getCandidateEvaluations(candidate.id)
      .then(setEvaluations)
      .finally(() => setFetching(false));
  }, [candidate.id]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden min-h-[500px]">
        <div className="min-h-[80vh]">
          <div className="w-full">
            <div className="bg-white">
              {fetching ? (
                <div className="flex justify-center p-12"><LoadingSpinner /></div>
              ) : (
                <CandidateSummaryDocument 
                  candidate={candidate} 
                  evaluations={evaluations} 
                  hidePrintButton={false} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
