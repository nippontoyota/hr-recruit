import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Candidate, Evaluation } from '../../types';
import { getCandidateWorkState } from '../../lib/candidateWork';

interface QueueItem {
  label: string;
  done: boolean;
  warning?: boolean;
  hint?: string;
}

interface WorkQueueProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  className?: string;
}

export function WorkQueue({ candidate, evaluations, className }: WorkQueueProps) {
  const stage = candidate.current_stage;
  const workState = getCandidateWorkState(candidate);
  const isHOStage = [
    'SENT_TO_HO', 'HO_INTERVIEW_INTIMATION', 'HO_HR_INTERVIEW', 'HO_DEPT_INTERVIEW', 'HO_INTERVIEWS',
    'CSS', 'FINAL_APPROVAL', 'SALARY_DETAILS',
  ].includes(stage);

  if (!isHOStage) return null;

  const hoHrEval = evaluations.find(e => e.type === 'HQ_INTERVIEW_1');

  const hrSelected = hoHrEval?.verdict === 'SELECTED';
  const hrDone = !!hoHrEval?.verdict;
  const hrOnHold = hoHrEval?.verdict === 'ON_HOLD';

  const salaryUploaded = !!(candidate.salary_data && Object.keys(candidate.salary_data).length > 0);
  const blockers = (candidate.offer_blockers ?? []).filter((b) => b !== 'already offered');
  const offerReady = blockers.length === 0;
  const offerSent = candidate.offer_status === 'SENT' || candidate.offer_status === 'ACCEPTED';

  const items: QueueItem[] = [
    {
      label: 'HR Interview',
      done: hrSelected,
      warning: hrOnHold,
      hint: hrOnHold ? 'On hold' : hrDone && !hrSelected ? 'Not selected' : !hrDone ? 'Pending evaluation' : undefined,
    },
    {
      label: 'Salary Sheet',
      done: salaryUploaded,
      hint: salaryUploaded
        ? typeof candidate.salary_data?._uploaded_by === 'string'
          ? `Uploaded by ${String(candidate.salary_data._uploaded_by)}`
          : 'Uploaded'
        : 'Upload required (HO HR)',
    },
    {
      label: 'Ready for Offer',
      done: offerReady,
      hint: offerReady
        ? offerSent
          ? 'Offer sent'
          : 'All prerequisites met'
        : blockers.length
          ? `Missing: ${blockers.join(', ')}`
          : 'Requires HR ✓, Salary ✓',
    },
  ];

  const doneCount = items.filter(i => i.done).length;
  const total = items.length;

  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
      <div className="mb-3 grid gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Next action</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">{workState.next_action}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Days in stage</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">{workState.days_in_stage} day{workState.days_in_stage === 1 ? '' : 's'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Responsible team</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">{workState.responsible_team}</p>
        </div>
      </div>
      {workState.blockers.length > 0 && (
        <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Blockers:</span> {workState.blockers.join(', ')}
        </p>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary/70" />
          <span className="text-xs font-medium text-muted-foreground">Work queue</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors',
              item.done
                ? 'bg-success/10 border-success/30 text-success'
                : item.warning
                  ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-muted/50 border-border text-muted-foreground'
            )}
            title={item.hint}
          >
            {item.done ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : item.warning ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 shrink-0" />
            )}
            {item.label}
            {item.hint && (
              <span className="text-[10px] font-normal opacity-70"> ({item.hint})</span>
            )}
          </div>
        ))}
      </div>

      {offerReady && !offerSent && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs font-medium text-success">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Candidate is ready. Open Offer Letter to send.
        </div>
      )}

      {offerSent && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2 text-xs font-medium text-info">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Offer letter sent.
        </div>
      )}
    </div>
  );
}
