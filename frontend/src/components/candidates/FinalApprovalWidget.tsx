import { useState, useEffect } from 'react';
import { Send, FileText, CheckCircle2, Link } from 'lucide-react';
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
      toast.success('Information form link generated and Activity Log updated.');
      onUpdate();
    } catch (error) {
      toast.error('Failed to send Candidate Information Form.');
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
              <h3 className="text-lg font-semibold text-gray-900">Candidate Information Form</h3>
              <p className="text-sm text-gray-500">
                Status: <span className="font-medium text-gray-900">{candidate.post_form_status?.replace('_', ' ') || 'NOT SENT'}</span>
              </p>
            </div>
          </div>
          
          {(!candidate.post_form_status || candidate.post_form_status === 'NOT_SENT') && (
            <Button onClick={handleSendPostForm} disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Information Form'}
            </Button>
          )}
          {(candidate.post_form_status === 'SENT' || candidate.post_form_status === 'VIEWED') && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-yellow-600 font-medium bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
                Awaiting Candidate Submission
              </div>
              {candidate.post_share_url && (
                <Button variant="secondary" size="sm" onClick={() => {
                  navigator.clipboard.writeText(candidate.post_share_url!);
                  toast.success('Form link copied to clipboard!');
                }} className="gap-2 text-sm">
                  <Link className="w-4 h-4" /> Copy Link
                </Button>
              )}
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
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Candidate Summary Sheet (CSS)</h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
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
