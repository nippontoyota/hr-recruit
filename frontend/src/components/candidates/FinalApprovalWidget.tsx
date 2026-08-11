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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 pb-4">
        <Button 
          variant="secondary"
          onClick={handlePreviewOffer} 
          disabled={generatingPdf}
          size="lg"
          className="!bg-white !rounded-[10px] shadow-sm !font-bold tracking-wide w-full sm:w-auto sm:min-w-[240px] h-12 border border-border"
        >
          {generatingPdf ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
          {generatingPdf ? 'Generating Preview...' : 'View Offer Letter'}
        </Button>
        {user?.role !== 'LOCAL_HR' && (
          <Button 
            onClick={handleSendOffer} 
            disabled={sendingOffer}
            size="lg"
            className="!bg-green-700 hover:!bg-green-800 !text-white !border-none !rounded-[10px] shadow-sm !font-bold tracking-wide w-full sm:w-auto sm:min-w-[240px] h-12"
          >
            {sendingOffer ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {sendingOffer ? 'Sending Offer Letter...' : 'Send Offer Letter'}
          </Button>
        )}
      </div>

      <div className="bg-white border border-border shadow-sm rounded-xl p-8 max-w-3xl mx-auto mt-2">
        <div className="flex flex-col items-center mb-8 border-b border-border pb-6">
           <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
             <FileText className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-bold text-foreground">Offer of Employment</h3>
           <p className="text-muted-foreground mt-1 text-center max-w-md">
             An official offer letter document will be generated and emailed to the candidate containing the following details.
           </p>
        </div>

        <div className="space-y-6">
          <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 text-primary">1. Position & Reporting</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The candidate will be offered the position of <strong className="text-foreground">{candidate.experience || 'TBD'}</strong> operating out of the <strong className="text-foreground">{candidate.branch_location || '[Branch]'}</strong> branch.
            </p>
          </div>
          <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 text-primary">2. Remuneration & Benefits</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Subject to standard company Annexure A structure. Includes standard health insurance, PF, and Gratuity as per company policy.
            </p>
          </div>
          <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 text-primary">3. Probation & Hours</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
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
