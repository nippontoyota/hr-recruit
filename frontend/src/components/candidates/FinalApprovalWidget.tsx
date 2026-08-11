import { useState } from 'react';
import { Button, LoadingSpinner, Modal } from '../ui';
import { sendOfferLetter } from '../../api/candidates';
import type { Candidate } from '../../types';
import { Mail, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../auth/AuthContext';

interface FinalApprovalWidgetProps {
  candidate: Candidate;
  onUpdate?: () => void; // Keeping as optional since it might be passed by parent
}

export function FinalApprovalWidget({ candidate, onUpdate }: FinalApprovalWidgetProps) {
  const { user } = useAuth();
  const [sendingOffer, setSendingOffer] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handlePreviewOffer = async () => {
    try {
      setGeneratingPdf(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${baseURL}/pdf/offer-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: {
            full_name: candidate.full_name,
            experience: candidate.experience || 'Unknown Position',
            branch_location: candidate.branch_location,
            department: candidate.department,
          }
        })
      });
      if (!response.ok) throw new Error('Failed to generate preview');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsPdfOpen(true);
    } catch (err) {
      toast.error('Could not load offer letter preview.');
    } finally {
      setGeneratingPdf(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-2">
        <Button 
          variant="secondary"
          onClick={handlePreviewOffer} 
          disabled={generatingPdf}
          className="!bg-white !rounded-md shadow-sm !font-medium w-full sm:w-auto sm:min-w-[180px] h-10 border border-border"
        >
          {generatingPdf ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
          {generatingPdf ? 'Generating...' : 'View Offer Letter'}
        </Button>
        {user?.role !== 'LOCAL_HR' && (
          <Button 
            onClick={handleSendOffer} 
            disabled={sendingOffer}
            className="!bg-green-700 hover:!bg-green-800 !text-white !border-none !rounded-md shadow-sm !font-medium w-full sm:w-auto sm:min-w-[180px] h-10"
          >
            {sendingOffer ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {sendingOffer ? 'Sending...' : 'Send Offer Letter via Email'}
          </Button>
        )}
      </div>

      <div className="bg-white border border-border shadow-sm rounded-lg p-10 max-w-3xl mx-auto mt-4">
        <div className="mb-10 border-b border-border/60 pb-6 text-center">
           <h3 className="text-2xl font-serif font-bold text-foreground tracking-wide">OFFER OF EMPLOYMENT</h3>
           <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto italic">
             An official offer letter document will be generated and emailed to the candidate containing the following details.
           </p>
        </div>

        <div className="space-y-8 px-4">
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest mb-1">1. Position & Reporting</h4>
            <p className="text-muted-foreground text-base leading-relaxed">
              The candidate will be offered the position of <strong className="text-foreground font-semibold">{candidate.experience || 'TBD'}</strong> operating out of the <strong className="text-foreground font-semibold">{candidate.branch_location || '[Branch]'}</strong> branch.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest mb-1">2. Remuneration & Benefits</h4>
            <p className="text-muted-foreground text-base leading-relaxed">
              Subject to standard company Annexure A structure. Includes standard health insurance, PF, and Gratuity as per company policy.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest mb-1">3. Probation & Hours</h4>
            <p className="text-muted-foreground text-base leading-relaxed">
              Standard 6-month probation period applies before permanent confirmation. Working hours are from 9:30 AM to 6:00 PM, Monday through Saturday.
            </p>
          </div>
        </div>
      </div>

      <Modal isOpen={isPdfOpen} onClose={() => setIsPdfOpen(false)} title="Offer Letter Preview" size="lg">
        <div className="w-full h-full min-h-[70vh] bg-muted/20">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-[70vh] border-none" title="Offer Letter Preview" />
          ) : (
            <div className="flex items-center justify-center h-[70vh]">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
