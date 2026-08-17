import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { usePrint } from '../../hooks/usePrint';
import { Button } from '../ui';
import type { Candidate, Evaluation } from '../../types';
import { CandidateSummarySheet } from './CandidateSummarySheet';

interface CSSStageWidgetProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  onUpdate: () => void;
}

export function CSSStageWidget({ candidate, evaluations }: CSSStageWidgetProps) {

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint({
    contentRef: printRef,
    documentTitle: `CSS_${candidate.full_name.replace(/\s+/g, '_')}`,
    pageStyle: `@page { size: A4 portrait; margin: 0; } html, body { margin: 0; padding: 0; } .css-sheet { width: 210mm !important; }`,
  });

  return (
    <div className="space-y-8 mt-2">
      
      {/* Top Action Bar */}
      <div className="flex justify-center items-center gap-4 mb-4">
        <Button 
          variant="outline" 
          onClick={() => handlePrint()} 
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-sm shadow-sm transition-all duration-200"
        >
          <Printer className="w-4 h-4" /> Print CSS
        </Button>
      </div>

      <div className="iaf-screen-wrap">
        <div ref={printRef} className="w-[210mm] mx-auto shadow-md">
          <CandidateSummarySheet candidate={candidate} evaluations={evaluations} />
        </div>
      </div>
    </div>
  );
}
