import { useState } from 'react';
import { Button } from '../ui';
import { sendPreForm } from '../../api/candidates';
import { Send, CheckCircle2 } from 'lucide-react';
import type { Candidate } from '../../types';
import { toast } from 'sonner';
import { ResumeButton } from './ResumeButton';

interface PreFormStatusProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function PreFormStatus({ candidate, onUpdate }: PreFormStatusProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSendForm = async () => {
    setIsSending(true);
    try {
      await sendPreForm(candidate.id);
      toast.success('Pre-interview form link generated');
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate link');
    } finally {
      setIsSending(false);
    }
  };

  const status = candidate.pre_form_status || 'NOT_SENT';

  if (status === 'SUBMITTED') {
    return (
      <div className="py-8 w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <CheckCircle2 className="w-10 h-10 text-success mb-3" />
          <h3 className="text-2xl font-bold text-foreground">Form Submitted Successfully</h3>
          <p className="text-text-secondary mt-1">Candidate's pre-interview form responses</p>
          {candidate.has_resume && (
            <div className="mt-4">
              <ResumeButton
                candidateId={candidate.id}
                candidateName={candidate.full_name}
                hasResume={candidate.has_resume}
              />
            </div>
          )}
        </div>
        
        {candidate.profile ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b border-border">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Candidate Details</h4>
            </div>
            
            {candidate.profile.raw_data && Object.keys(candidate.profile.raw_data).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 p-6">
                {Object.entries(candidate.profile.raw_data).map(([key, value]) => {
                  if (value === null || value === undefined || value === '' || typeof value === 'object' || key === 'resumeFileObject') return null;
                  
                  // Make keys readable: "permHouseName" -> "Perm House Name"
                  const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  
                  return (
                    <div key={key}>
                      <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">{readableKey}</p>
                      <p className="text-sm text-foreground font-medium">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-6">
                <div>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Current Location</p>
                  <p className="text-sm text-foreground font-medium">{candidate.profile.current_location || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Experience Level</p>
                  <p className="text-sm text-foreground font-medium">{candidate.profile.experience_level || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Total Experience</p>
                  <p className="text-sm text-foreground font-medium">{candidate.profile.total_experience || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Current/Previous Company</p>
                  <p className="text-sm text-foreground font-medium">{candidate.profile.current_company || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Expected Salary</p>
                  <p className="text-sm text-foreground font-medium">{candidate.profile.expected_salary || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Expected Joining Date</p>
                  <p className="text-sm text-foreground font-medium">{candidate.profile.joining_date || '—'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-text-secondary text-center">Candidate's pre-interview form responses are missing.</p>
        )}
      </div>
    );
  }

  return (
    <div className="py-12 max-w-2xl mx-auto flex flex-col items-center justify-center">
      {(!candidate.pre_form_status || candidate.pre_form_status === 'NOT_SENT') && !candidate.share_url && (
        <Button variant="primary" onClick={handleSendForm} isLoading={isSending} className="rounded-full px-8 shadow-md h-12 text-base font-bold">
          <Send className="w-5 h-5 mr-2" />
          Generate Form Link
        </Button>
      )}
      
      {candidate.share_url && (
        <div className="w-full max-w-lg">
          <label className="block text-sm font-bold text-foreground mb-4 text-center">Copy and share this link with the candidate</label>
          <div className="flex items-center gap-2 w-full bg-background border-2 border-border p-1.5 rounded-xl shadow-sm">
            <input 
              type="text" 
              readOnly 
              value={candidate.share_url}
              className="flex-1 bg-transparent border-none px-4 text-sm font-mono text-muted-foreground focus:outline-none min-w-0"
            />
            <Button 
              variant="secondary" 
              onClick={() => {
                navigator.clipboard.writeText(candidate.share_url!);
                toast.success('Copied to clipboard');
              }}
              className="h-10 px-6 rounded-lg font-bold shrink-0 bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm"
            >
              Copy Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
