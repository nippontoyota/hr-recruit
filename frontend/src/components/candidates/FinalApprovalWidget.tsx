import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '../ui';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';
import { EvaluationStageWidget } from './EvaluationStageWidget';
import { PostFormStatus } from './PostFormStatus';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';
import { cn } from '../../lib/utils';
import { AlertTriangle } from 'lucide-react';

interface FinalApprovalWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
}

type TabId = 'HQ_INTERVIEW' | 'POST_FORM' | 'CSS';

const TABS: { id: TabId; label: string }[] = [
  { id: 'HQ_INTERVIEW', label: 'HQ Online Interview' },
  { id: 'POST_FORM', label: 'Candidate Information Form' },
  { id: 'CSS', label: 'Candidate Summary Sheet' }
];

export function FinalApprovalWidget({ candidate, onUpdate }: FinalApprovalWidgetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('HQ_INTERVIEW');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getCandidateEvaluations(candidate.id)
      .then(setEvaluations)
      .finally(() => setFetching(false));
  }, [candidate.id]);

  const isSubmitted = candidate.post_form_status === 'SUBMITTED';

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex bg-muted/30 p-1 rounded-xl mb-6 relative border border-border/50 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex-1 min-w-[200px] px-4 py-3 text-sm font-semibold rounded-lg transition-colors z-10",
              activeTab === tab.id
                ? "text-white"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="final-approval-tab-toggle"
                className="absolute inset-0 bg-primary shadow-md border border-primary rounded-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden min-h-[500px]">
        {activeTab === 'HQ_INTERVIEW' && (
          <div className="p-6">
            <EvaluationStageWidget
              candidate={candidate}
              evalTypes={['HQ_INTERVIEW']}
              title="HQ Online Interview"
              onUpdate={onUpdate}
            />
          </div>
        )}

        {activeTab === 'POST_FORM' && (
          <div className="p-6 bg-muted/10 h-full">
            <PostFormStatus 
              candidate={candidate} 
              onUpdate={onUpdate} 
            />
          </div>
        )}

        {activeTab === 'CSS' && (
          <div className="min-h-[80vh]">
            {!isSubmitted && (
              <div className="mx-6 mt-6 mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm max-w-4xl">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Incomplete Data Warning</h4>
                  <p className="text-sm mt-1">
                    The candidate has not submitted their final Information Form yet. 
                    The Candidate Summary Sheet generated below will be missing key final details.
                  </p>
                </div>
              </div>
            )}
            
            <div className="w-full">
              <div className="bg-white">
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
