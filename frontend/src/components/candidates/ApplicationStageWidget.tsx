import { useState, useRef, useEffect } from 'react';
import { Send, Printer } from 'lucide-react';
import { usePrint } from '../../hooks/usePrint';
import { toast } from 'sonner';
import { Button, Modal } from '../ui';
import { updateCandidateStage } from '../../api/candidates';
import type { Candidate, PipelineStage, Evaluation } from '../../types';
import { extractError } from '../../lib/utils';
import { useAuth } from '../../auth';
import { HoReviewPacket } from './HoReviewPacket';

interface ApplicationStageWidgetProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  onUpdate: () => void;
  isReadOnly?: boolean;
}

export function ApplicationStageWidget({ candidate, evaluations, onUpdate, isReadOnly = false }: ApplicationStageWidgetProps) {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [evals, setEvals] = useState<Evaluation[]>(evaluations);

  useEffect(() => {
    setEvals(evaluations);
  }, [evaluations]);

  const handleSendToHO = async () => {
    setIsSending(true);
    try {
      await updateCandidateStage(candidate.id, 'HO_INTERVIEW_INTIMATION' as PipelineStage, 'Application transferred to Head Office for interview intimation.');
      toast.success('Application sent to Head Office successfully!');
      setShowConfirmModal(false);
      onUpdate(); 
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to send to Head Office'));
      setIsSending(false);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint({
    contentRef: printRef,
    documentTitle: `Application_${candidate.full_name.replace(/\s+/g, '_')}`,
    pageStyle: `@page { size: A4 portrait; margin: 0; } html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .css-sheet, .iaf-sheet, .iaf-page { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; max-height: 297mm !important; box-sizing: border-box !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; border: none !important; }`,
  });

  return (
    <div className="space-y-8 mt-2">
      
      {/* Top Action Bar */}
      <div className="flex justify-center items-center gap-4 mb-8">
        <Button 
          variant="secondary"
          onClick={() => handlePrint()} 
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-sm shadow-sm transition-all duration-200"
        >
          <Printer className="w-4 h-4" /> Print Application
        </Button>

        {user?.role === 'LOCAL_HR' && !isReadOnly && !['REJECTED', 'HIRED', 'ON_HOLD'].includes(candidate.current_stage) && (
          <Button
            id="send-to-ho"
            variant="primary"
            onClick={() => setShowConfirmModal(true)} 
            className="flex items-center gap-2 px-5 py-2 font-semibold text-sm rounded-sm shadow-sm"
          >
            <Send className="w-4 h-4" /> Send to Head Office
          </Button>
        )}
        {user?.role === 'LOCAL_HR' && isReadOnly && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2 text-sm font-medium text-info">
            <Send className="w-4 h-4" /> Already sent to Head Office
          </span>
        )}
      </div>

      <div className="iaf-screen-wrap">
        <div ref={printRef} className="w-[210mm] mx-auto">
          <HoReviewPacket
            key={candidate.id}
            candidate={candidate}
            evaluations={evals}
            includeCss={false}
            includeSalaryProposal={false}
          />
        </div>
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Send to Head Office HR" size="md">
        <div className="p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-center text-foreground mb-2">Final Submission</h3>
          <p className="text-center text-muted-foreground mb-8">
            You are about to send <strong>{candidate.full_name}</strong> to Head Office HR for final review.
            <br/><br/>
            <strong>This hands ownership to Head Office and locks branch edits. The application and history remain available for review; contact Head Office if a correction is required.</strong>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSendToHO} isLoading={isSending}>
              Send {candidate.full_name} to Head Office
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
