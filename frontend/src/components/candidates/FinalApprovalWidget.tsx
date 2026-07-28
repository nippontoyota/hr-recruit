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

  const handleViewOffer = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${baseURL}/pdf/offer-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: {
            full_name: candidate.full_name,
            position_applied_for: candidate.position_applied_for || 'Unknown Position',
          }
        })
      });
      if (!response.ok) throw new Error('Failed to generate preview');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error('Could not load offer letter preview.');
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={handleViewOffer} className="!bg-white !rounded-sm !font-semibold">
          <FileText className="h-3.5 w-3.5 mr-2" />
          View Offer Letter
        </Button>
        {user?.role !== 'LOCAL_HR' && (
          <Button 
            onClick={handleSendOffer} 
            disabled={sendingOffer}
            size="sm"
            className="!bg-green-700 hover:!bg-green-800 !text-white !border-none !rounded-sm shadow-sm !font-bold tracking-wide"
          >
            {sendingOffer ? <LoadingSpinner className="h-3.5 w-3.5 mr-2" /> : <Mail className="h-3.5 w-3.5 mr-2" />}
            {sendingOffer ? 'Sending...' : 'Send Offer Letter'}
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
