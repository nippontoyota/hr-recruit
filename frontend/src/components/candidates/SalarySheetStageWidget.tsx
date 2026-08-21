import { useRef } from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';
import { usePrint } from '../../hooks/usePrint';
import { Button } from '../ui';
import type { Candidate } from '../../types';
import { SalarySheetUpload } from './SalarySheetUpload';
import { SalaryProposalSheetDocument } from './SalaryProposalSheetDocument';

interface SalarySheetStageWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
  isReadOnly?: boolean;
}

export function SalarySheetStageWidget({ candidate, onUpdate, isReadOnly = false }: SalarySheetStageWidgetProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint({
    contentRef: printRef,
    documentTitle: `Salary_Proposal_${candidate.full_name.replace(/\s+/g, '_')}`,
    pageStyle: `@page { size: A4 portrait; margin: 0; } html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .iaf-sheet { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; max-height: 297mm !important; box-sizing: border-box !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; border: none !important; }`,
  });

  const salaryUploaded = !!(candidate.salary_data && Object.keys(candidate.salary_data).length);

  return (
    <div className="space-y-6 mt-2">
      {!isReadOnly && (
        <SalarySheetUpload candidateId={candidate.id} onDone={onUpdate} variant="banner" />
      )}

      {salaryUploaded ? (
        <>
          <div className="flex justify-center no-print">
            <Button
              variant="outline"
              onClick={() => handlePrint()}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-sm shadow-xs transition-all duration-200"
            >
              <Printer className="w-4 h-4" /> Print Salary Proposal
            </Button>
          </div>
          <div className="iaf-screen-wrap">
            <div ref={printRef} className="w-[210mm] mx-auto">
              <SalaryProposalSheetDocument candidate={candidate} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          {isReadOnly
            ? 'Waiting for Head Office HR to upload the salary setting sheet.'
            : 'Upload the salary setting sheet above to generate the salary proposal.'}
        </div>
      )}
    </div>
  );
}
