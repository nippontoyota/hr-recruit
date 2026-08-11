import { useState, useEffect } from 'react';
import { Button, LoadingSpinner } from '../ui';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';
import { getCandidateEvaluations } from '../../api/evaluations';
import { sendOfferLetter } from '../../api/candidates';
import type { Candidate, Evaluation } from '../../types';
import { Mail, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../auth/AuthContext';

interface FinalApprovalWidgetProps {
  candidate: Candidate;
  onUpdate?: () => void; // Keeping as optional since it might be passed by parent
}

export function FinalApprovalWidget({ candidate, onUpdate }: FinalApprovalWidgetProps) {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sendingOffer, setSendingOffer] = useState(false);

  useEffect(() => {
    getCandidateEvaluations(candidate.id)
      .then(setEvaluations)
      .finally(() => setFetching(false));
  }, [candidate.id]);

  const handleSendOffer = async () => {
    if (!candidate.email) {
      toast.error('Candidate does not have an email address on file.');
      return;
    }
    try {
      setSendingOffer(true);
      await sendOfferLetter(candidate.id);
      toast.success('Offer letter sent successfully!');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send offer letter.');
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-center pt-2 pb-4">
        {user?.role !== 'LOCAL_HR' && (
          <Button 
            onClick={handleSendOffer} 
            disabled={sendingOffer}
            size="lg"
            className="!bg-green-700 hover:!bg-green-800 !text-white !border-none !rounded-[10px] shadow-sm !font-bold tracking-wide w-full max-w-sm h-12"
          >
            {sendingOffer ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {sendingOffer ? 'Sending Offer Letter...' : 'Send Offer Letter'}
          </Button>
        )}
      </div>

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
  );
}
