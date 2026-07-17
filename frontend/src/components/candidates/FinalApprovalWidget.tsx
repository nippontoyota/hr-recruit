import { useState, useEffect } from 'react';
import { Send, FileText, CheckCircle2 } from 'lucide-react';
import { Button, LoadingSpinner } from '../ui';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';
import { EvaluationStageWidget } from './EvaluationStageWidget';
import { sendPostForm } from '../../api/candidates';
import { toast } from 'sonner';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';

interface FinalApprovalWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function FinalApprovalWidget({ candidate, onUpdate }: FinalApprovalWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getCandidateEvaluations(candidate.id)
      .then(setEvaluations)
      .finally(() => setFetching(false));
  }, [candidate.id]);

  const handleSendPostForm = async () => {
    setLoading(true);
    try {
      await sendPostForm(candidate.id);
      toast.success('Post-Interview form link generated and Activity Log updated.');
      onUpdate();
    } catch (error) {
      toast.error('Failed to send Post-Interview form.');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitted = candidate.post_form_status === 'SUBMITTED';

  return (
    <div className="space-y-8">
      {/* 1. HQ Interview Evaluation (if needed) */}
      <EvaluationStageWidget
        candidate={candidate}
        evalTypes={['HQ_INTERVIEW']}
        title="HQ Online Interview"
        onUpdate={onUpdate}
      />

      {/* 2. Post Form & Candidate Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Post-Interview Form</h3>
              <p className="text-sm text-gray-500">
                Status: <span className="font-medium text-gray-900">{candidate.post_form_status?.replace('_', ' ') || 'NOT SENT'}</span>
              </p>
            </div>
          </div>
          
          {(!candidate.post_form_status || candidate.post_form_status === 'NOT_SENT') && (
            <Button onClick={handleSendPostForm} disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send Post Form'}
            </Button>
          )}
          {(candidate.post_form_status === 'SENT' || candidate.post_form_status === 'VIEWED') && (
            <div className="text-sm text-yellow-600 font-medium bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
              Awaiting Candidate Submission
            </div>
          )}
          {isSubmitted && (
            <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Submitted Successfully
            </div>
          )}
        </div>

        {isSubmitted && (
          <div className="mt-8 border rounded-xl overflow-hidden bg-gray-50">
            <div className="bg-gray-800 text-white px-4 py-3 text-sm font-medium flex justify-between items-center">
              <span>Candidate Summary Sheet (CSS)</span>
              <span className="text-gray-400">Scroll to view</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 custom-scrollbar">
              <div className="scale-90 origin-top-center transition-all">
                {fetching ? (
                  <div className="flex justify-center p-12"><LoadingSpinner /></div>
                ) : (
                  <CandidateSummaryDocument 
                    candidate={candidate} 
                    evaluations={evaluations} 
                    hidePrintButton={true} 
                  />
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
