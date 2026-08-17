import { CheckCircle2, Clock3, PauseCircle, UserRound, Building2, CircleDollarSign, AlertTriangle, ListTodo } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Candidate } from '../../types';

import { QUEUE_DEFINITIONS, type CandidateQueue, matchesQueue } from '../../lib/stages';

interface WorkQueueSummaryProps {
  candidates: Candidate[];
  selectedQueue: CandidateQueue | '';
  onQueueChange: (queue: CandidateQueue | '') => void;
}

const icons = {
  NEEDS_ACTION: ListTodo,
  DUE_TODAY: Clock3,
  WAITING_FOR_CANDIDATE: UserRound,
  WAITING_FOR_HO: Building2,
  READY_FOR_OFFER: CircleDollarSign,
  ON_HOLD: PauseCircle,
  STALLED: AlertTriangle,
} satisfies Record<CandidateQueue, typeof ListTodo>;

export function WorkQueueSummary({ candidates, selectedQueue, onQueueChange }: WorkQueueSummaryProps) {
  const knownStateCount = candidates.filter((candidate) => candidate.work_state != null).length;

  return (
    <section aria-labelledby="work-queue-heading" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <div>
          <h2 id="work-queue-heading" className="text-sm font-semibold text-text-primary">Work queues</h2>
          <p className="text-xs text-muted-foreground">Counts reflect the currently loaded candidates.</p>
        </div>
        {knownStateCount < candidates.length && candidates.length > 0 && (
          <span className="text-xs text-muted-foreground" role="status">
            {candidates.length - knownStateCount} older response{candidates.length - knownStateCount === 1 ? '' : 's'} without workflow data
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8" role="group" aria-label="Candidate work queues">
        <button
          type="button"
          aria-pressed={selectedQueue === ''}
          onClick={() => onQueueChange('')}
          className={cn(
            'flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
            selectedQueue === '' ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-muted/50'
          )}
        >
          <span className="text-xs font-semibold text-muted-foreground">All candidates</span>
          <span className="text-xl font-bold tabular-nums text-text-primary">{candidates.length}</span>
        </button>
        {QUEUE_DEFINITIONS.map(({ key, label }) => {
          const Icon = icons[key];
          const count = candidates.filter((candidate) => matchesQueue(candidate, key)).length;
          const selected = selectedQueue === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-label={`${label}: ${count} candidates`}
              onClick={() => onQueueChange(key)}
              className={cn(
                'flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
                selected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-muted/50'
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </span>
              <span className="flex items-center gap-1 text-xl font-bold tabular-nums text-text-primary">
                {count}
                {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

