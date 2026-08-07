import React, { useState, useEffect, useRef } from 'react';
import { Send, Building2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { Button, Modal } from '../ui';
import { updateCandidateStage } from '../../api/candidates';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, PipelineStage, Evaluation } from '../../types';
import { extractError } from '../../lib/utils';
import { useAuth } from '../../auth/AuthContext';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';
import { BackgroundVerificationDocument } from './BackgroundVerificationDocument';

interface ApplicationStageWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function ApplicationStageWidget({ candidate, onUpdate }: ApplicationStageWidgetProps) {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const handleSendToHO = async () => {
    setIsSending(true);
    try {
      await updateCandidateStage(candidate.id, 'SENT_TO_HO' as PipelineStage, 'Sent to Head Office HR for final review.');
      toast.success('Application sent to Head Office successfully!');
      setShowConfirmModal(false);
      onUpdate(); 
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to send to Head Office'));
      setIsSending(false);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Application_${candidate.full_name.replace(/\s+/g, '_')}`,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Generating final application documents...</div>;
  }

  return (
    <div className="space-y-8 mt-2">
      
      {/* Top Action Bar */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={() => handlePrint()} 
          className="rounded-none px-6 py-2 border border-black font-semibold text-sm transition-none"
        >
          <Printer className="w-4 h-4 mr-2" /> Print Application
        </Button>

        {user?.role === 'LOCAL_HR' && (
          <Button 
            variant="primary" 
            onClick={() => setShowConfirmModal(true)} 
            className="bg-black hover:bg-gray-800 text-white rounded-none px-6 py-2 border border-black font-semibold text-sm transition-none"
          >
            Send to Head Office
          </Button>
        )}
      </div>

      {/* Read-Only Generated A4 Documents (No decorative wrapper, just the documents) */}
      <div ref={printRef} className="flex flex-col items-center gap-12 overflow-x-auto pb-12 print:p-0 print:m-0">
        <CandidateSummaryDocument candidate={candidate} evaluations={evaluations} />
        <BackgroundVerificationDocument candidate={candidate} />
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Send to Head Office HR" size="md">
        <div className="p-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-center text-foreground mb-2">Final Submission</h3>
          <p className="text-center text-muted-foreground mb-8">
            Are you sure you want to send this candidate's application to the Head Office HR for final approval and onboarding? 
            <br/><br/>
            <strong>Once sent, this candidate will be handed over to the Head Office and you will no longer be able to modify their profile.</strong>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSendToHO} isLoading={isSending} className="bg-blue-600 hover:bg-blue-700 text-white">
              Yes, Send to HO
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
