import { useState } from 'react';
import { Button, LoadingSpinner } from '../ui';
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
    </div>
  );
}
