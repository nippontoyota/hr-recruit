import React, { useState, useEffect, useRef } from 'react';
import { Send, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { Button } from '../ui';
import { updateCandidateStage } from '../../api/candidates';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';
import { extractError } from '../../lib/utils';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';

interface CSSStageWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function CSSStageWidget({ candidate, onUpdate }: CSSStageWidgetProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    getCandidateEvaluations(candidate.id).then(data => {
      if (isMounted) {
        setEvaluations(data);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [candidate.id]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `CSS_${candidate.full_name.replace(/\s+/g, '_')}`,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Generating Candidate Summary Sheet...</div>;
  }

  return (
    <div className="space-y-8 mt-2">
      
      {/* Top Action Bar */}
      <div className="flex justify-center items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          onClick={() => handlePrint()} 
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-sm shadow-sm transition-all duration-200"
        >
          <Printer className="w-4 h-4" /> Print CSS
        </Button>
      </div>

      {/* Read-Only Generated A4 Document */}
      <div ref={printRef} className="flex flex-col items-center gap-12 overflow-x-auto pb-12 print:p-0 print:m-0">
        <CandidateSummaryDocument candidate={candidate} evaluations={evaluations} />
      </div>
    </div>
  );
}
