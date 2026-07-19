import { useState, useEffect } from 'react';
import { getCandidateEvaluations, createEvaluation, submitScorecardDirect, deleteEvaluation } from '../../api/evaluations';
import type { Candidate, Evaluation } from '../../types';
import { Button, LoadingSpinner } from '../ui';
import { toast } from 'sonner';
import { cn, extractError } from '../../lib/utils';
import { Star, CheckCircle2, Plus, UserCircle2, Trash2, IndianRupee } from 'lucide-react';

const evalTitles: Record<string, string> = {
  BRANCH_HR: "HR INTERVIEW",
  DEPT_HEAD: "DEPARTMENT INTERVIEW",
  GM_LEVEL: "GM LEVEL INTERVIEW",
  HQ_INTERVIEW: "HQ INTERVIEW",
  TECHNICAL_TEST: "TECHNICAL TEST",
};

interface BranchInterviewDashboardProps {
  candidate: Candidate;
  onUpdate: () => void;
}

const StarRating = ({ label, value, onChange, disabled }: { label: string, value: number, onChange: (v: number) => void, disabled?: boolean }) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  return (
    <div className={cn("flex items-center justify-between py-1.5 border-b border-border/30 last:border-0", disabled && "opacity-60")}>
      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider w-[120px] shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1 justify-start ml-4" onMouseLeave={() => setHoverValue(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = hoverValue !== null ? star <= hoverValue : star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => !disabled && onChange(star)}
              onMouseEnter={() => !disabled && setHoverValue(star)}
              disabled={disabled}
              className="p-1 transition-transform hover:scale-125 focus:outline-none disabled:pointer-events-none"
            >
              <Star
                className={cn(
                  "w-5 h-5 transition-all duration-300 ease-out",
                  isFilled 
                    ? "fill-amber-400 text-amber-500 drop-shadow-sm scale-110" 
                    : "fill-muted text-muted-foreground/30"
                )}
              />
            </button>
          )
        })}
      </div>
      <span className="text-sm font-semibold text-muted-foreground w-12 text-right">{value}/5</span>
    </div>
  );
};

const EvaluationBlock = ({ evalData, fetchData, onUpdate }: { evalData: Evaluation, fetchData: () => void, onUpdate: () => void }) => {
  const isSubmitted = evalData.status === 'EVALUATED';
  const [localScores, setLocalScores] = useState<Record<string, any>>(evalData.scores || { attitude: 0, communication: 0, knowledge: 0 });
  const [localRemarks, setLocalRemarks] = useState(evalData.remarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if evalData changes (e.g. from parent refresh)
  useEffect(() => {
    setLocalScores(evalData.scores || { attitude: 0, communication: 0, knowledge: 0 });
    setLocalRemarks(evalData.remarks || '');
  }, [evalData]);

  const handleUpdateScore = (key: string, value: any) => {
    setLocalScores(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitScorecardDirect(evalData.id, {
        verdict: 'SELECTED',
        remarks: localRemarks,
        scores: localScores
      });
      toast.success(`${evalTitles[evalData.type] || evalData.type} evaluation submitted`);
      fetchData();
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this evaluation round?")) return;
    setIsSubmitting(true);
    try {
      await deleteEvaluation(evalData.id);
      toast.success(`Deleted evaluation round`);
      fetchData();
    } catch (err) {
      toast.error(extractError(err, 'Failed to delete evaluation'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const iName = evalData.scores?.interviewer_name;
  const iDesig = evalData.scores?.interviewer_designation;
  const isMandatory = evalData.type === 'BRANCH_HR' || evalData.type === 'DEPT_HEAD';

  return (
    <div className="border border-border bg-card rounded-xl p-6 shadow-sm relative group">
      {!isMandatory && !isSubmitted && (
        <button 
          onClick={handleDelete}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Delete this round"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pr-10">
        <div className="flex items-center gap-2">
          {isSubmitted && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          <h3 className="text-lg font-bold text-foreground">
            {evalTitles[evalData.type] || evalData.type.replace('_', ' ')}
          </h3>
        </div>
        {(iName || iDesig) && (
          <div className="bg-muted/30 px-4 py-2 rounded-lg border border-border/50 text-sm">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <UserCircle2 className="w-4 h-4 text-primary" />
              {iName || 'Unknown Interviewer'}
            </div>
            {iDesig && <div className="text-muted-foreground text-xs pl-6">{iDesig}</div>}
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="flex flex-col gap-0 border border-border/50 rounded-xl px-4 py-1 bg-background/50">
          <StarRating label="Attitude" value={localScores.attitude || 0} onChange={(v) => handleUpdateScore('attitude', v)} disabled={isSubmitted} />
          <StarRating label="Communication" value={localScores.communication || 0} onChange={(v) => handleUpdateScore('communication', v)} disabled={isSubmitted} />
          <StarRating label="Knowledge" value={localScores.knowledge || 0} onChange={(v) => handleUpdateScore('knowledge', v)} disabled={isSubmitted} />
        </div>
        
        {evalData.type === 'BRANCH_HR' && (
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Salary Expectation</label>
            <div className="relative max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={localScores.salary_expectation || ''}
                onChange={(e) => handleUpdateScore('salary_expectation', e.target.value)}
                disabled={isSubmitted}
                placeholder="e.g. 7 LPA"
                className="w-full bg-background border border-border rounded-xl pl-10 p-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all shadow-sm disabled:opacity-60"
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-2">Remarks / Detailed Feedback</label>
          <textarea
            value={localRemarks}
            onChange={(e) => setLocalRemarks(e.target.value)}
            disabled={isSubmitted}
            placeholder={`Enter your serious and detailed feedback here...`}
            className="w-full min-h-[160px] bg-muted/20 border border-border rounded-xl p-5 text-base leading-relaxed text-foreground shadow-inner focus:ring-2 focus:ring-primary/30 focus:bg-background resize-y transition-all disabled:opacity-60"
          />
        </div>
        {!isSubmitted && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="secondary" 
              className="w-full sm:w-auto py-6 px-6 text-base font-semibold border-amber-400 text-amber-500 hover:bg-amber-400/10 hover:text-amber-600 transition-colors" 
              onClick={() => setLocalScores(prev => ({ ...prev, attitude: 5, communication: 5, knowledge: 5 }))}
              type="button"
            >
              <Star className="w-5 h-5 mr-2 fill-amber-400 text-amber-500" />
              Give Full Stars
            </Button>
            <Button variant="primary" className="flex-1 py-6 text-base font-semibold" onClick={handleSubmit} isLoading={isSubmitting}>
              Submit {evalTitles[evalData.type] || evalData.type.replace('_', ' ')} Scorecard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export function BranchInterviewDashboard({ candidate, onUpdate }: BranchInterviewDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  // Dynamic additions
  const [addingInterviewType, setAddingInterviewType] = useState<string>('');
  const [addingInterviewerName, setAddingInterviewerName] = useState<string>('');
  const [addingInterviewerDesignation, setAddingInterviewerDesignation] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [candidate.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const evals = await getCandidateEvaluations(candidate.id);
      const branchEvals = evals.filter(e => !['TECHNICAL_TEST', 'GM_LEVEL', 'HQ_INTERVIEW'].includes(e.type));
      setEvaluations(branchEvals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInterview = async () => {
    if (!addingInterviewType) return;
    setIsSubmitting(true);
    try {
      await createEvaluation(candidate.id, addingInterviewType, addingInterviewerName, addingInterviewerDesignation);
      toast.success("Interview stage added");
      setAddingInterviewType('');
      setAddingInterviewerName('');
      setAddingInterviewerDesignation('');
      setIsAddModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(extractError(err, 'Failed to add interview'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="w-full mx-auto py-4 sm:py-8 px-2 sm:px-4 relative">

      {/* Evaluations Stack */}
      <div className="space-y-8 mb-10">
        {evaluations.map(e => (
          <EvaluationBlock key={e.id} evalData={e} fetchData={fetchData} onUpdate={onUpdate} />
        ))}
      </div>

      {/* Add Interview Button */}
      <div className="flex justify-center mt-12 mb-8">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgb(5,150,105,0.4)] border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all hover:scale-105 focus:outline-none"
          title="Add Another Round"
        >
          <Plus className="w-8 h-8 drop-shadow-md" />
        </button>
      </div>

      {/* Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Add Another Round</h3>
              
              <div className="flex flex-col gap-4 w-full">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Interview Type</label>
                  <select
                    value={addingInterviewType}
                    onChange={(e) => setAddingInterviewType(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground shadow-sm focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Round...</option>
                    <option value="BRANCH_HR">Additional HR Round</option>
                    <option value="DEPT_HEAD">Additional Department Round</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Interviewer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={addingInterviewerName}
                    onChange={(e) => setAddingInterviewerName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground shadow-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. General Manager"
                    value={addingInterviewerDesignation}
                    onChange={(e) => setAddingInterviewerDesignation(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground shadow-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
            <div className="bg-muted p-4 border-t border-border flex justify-end gap-3">
              <Button variant="secondary" className="font-semibold" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleAddInterview} 
                disabled={!addingInterviewType}
                isLoading={isSubmitting}
              >
                Add Round
              </Button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
