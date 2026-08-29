import { CheckCircle2, PauseCircle, UserRound, Building2, CircleDollarSign, AlertTriangle, ListTodo, LayoutGrid } from 'lucide-react';
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
  WAITING_FOR_CANDIDATE: UserRound,
  WAITING_FOR_HO: Building2,
  READY_FOR_OFFER: CircleDollarSign,
  ON_HOLD: PauseCircle,
  STALLED: AlertTriangle,
} satisfies Record<CandidateQueue, typeof ListTodo>;

const tones = {
  OVERVIEW: {
    idle: 'border-red-400 bg-red-100 hover:bg-red-200',
    selected: 'border-red-600 bg-red-200 ring-2 ring-red-600/35',
    label: 'text-red-900',
    count: 'text-red-950',
    icon: 'text-red-700',
  },
  NEEDS_ACTION: {
    idle: 'border-orange-400 bg-orange-100 hover:bg-orange-200',
    selected: 'border-orange-600 bg-orange-200 ring-2 ring-orange-600/35',
    label: 'text-orange-900',
    count: 'text-orange-950',
    icon: 'text-orange-700',
  },
  WAITING_FOR_CANDIDATE: {
    idle: 'border-sky-400 bg-sky-100 hover:bg-sky-200',
    selected: 'border-sky-600 bg-sky-200 ring-2 ring-sky-600/35',
    label: 'text-sky-900',
    count: 'text-sky-950',
    icon: 'text-sky-700',
  },
  WAITING_FOR_HO: {
    idle: 'border-violet-400 bg-violet-100 hover:bg-violet-200',
    selected: 'border-violet-600 bg-violet-200 ring-2 ring-violet-600/35',
    label: 'text-violet-900',
    count: 'text-violet-950',
    icon: 'text-violet-700',
  },
  READY_FOR_OFFER: {
    idle: 'border-emerald-400 bg-emerald-100 hover:bg-emerald-200',
    selected: 'border-emerald-600 bg-emerald-200 ring-2 ring-emerald-600/35',
    label: 'text-emerald-900',
    count: 'text-emerald-950',
    icon: 'text-emerald-700',
  },
  ON_HOLD: {
    idle: 'border-amber-400 bg-amber-100 hover:bg-amber-200',
    selected: 'border-amber-600 bg-amber-200 ring-2 ring-amber-600/35',
    label: 'text-amber-900',
    count: 'text-amber-950',
    icon: 'text-amber-700',
  },
  STALLED: {
    idle: 'border-rose-400 bg-rose-100 hover:bg-rose-200',
    selected: 'border-rose-600 bg-rose-200 ring-2 ring-rose-600/35',
    label: 'text-rose-900',
    count: 'text-rose-950',
    icon: 'text-rose-700',
  },
} as const;

export function WorkQueueSummary({ candidates, selectedQueue, onQueueChange }: WorkQueueSummaryProps) {
  const knownStateCount = candidates.filter((candidate) => candidate.work_state != null).length;
  const overviewSelected = selectedQueue === '';
  const overviewTone = tones.OVERVIEW;

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" role="group" aria-label="Candidate work queues">
        <button
          type="button"
          aria-pressed={overviewSelected}
          onClick={() => onQueueChange('')}
          className={cn(
            'flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            overviewSelected ? overviewTone.selected : overviewTone.idle
          )}
        >
          <span className={cn('flex items-center gap-1.5 text-xs font-semibold leading-tight', overviewTone.label)}>
            <LayoutGrid className={cn('h-3.5 w-3.5 shrink-0', overviewTone.icon)} aria-hidden="true" />
            Candidate Overview
          </span>
          <span className={cn('flex items-center gap-1 text-xl font-bold tabular-nums', overviewTone.count)}>
            {candidates.length}
            {overviewSelected && <CheckCircle2 className={cn('h-3.5 w-3.5', overviewTone.icon)} aria-hidden="true" />}
          </span>
        </button>
        {QUEUE_DEFINITIONS.map(({ key, label }) => {
          const Icon = icons[key];
          const tone = tones[key];
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
                'flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                selected ? tone.selected : tone.idle
              )}
            >
              <span className={cn('flex items-center gap-1.5 text-xs font-semibold leading-tight', tone.label)}>
                <Icon className={cn('h-3.5 w-3.5 shrink-0', tone.icon)} aria-hidden="true" />
                {label}
              </span>
              <span className={cn('flex items-center gap-1 text-xl font-bold tabular-nums', tone.count)}>
                {count}
                {selected && <CheckCircle2 className={cn('h-3.5 w-3.5', tone.icon)} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
