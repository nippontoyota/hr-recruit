import { Clipboard, Clock3, ShieldAlert, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Candidate } from '../../types';
import { stageLabel, formatSource } from '../../lib/stages';
import { toast } from 'sonner';

interface CandidateHeaderProps {
  candidate: Candidate;
}

export function CandidateHeader({ candidate }: CandidateHeaderProps) {
  const workState = candidate.work_state;
  const copyId = () => {
    void navigator.clipboard?.writeText(candidate.candidate_id);
    toast.success('Candidate ID copied');
  };
  const stageAge = workState?.days_in_stage;
  const stageAgeLabel = stageAge == null ? 'Unknown' : `${stageAge} day${stageAge === 1 ? '' : 's'}`;

  return (
    <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="candidate-profile-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <button
              type="button"
              onClick={copyId}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              title="Copy candidate ID"
            >
              <Clipboard className="h-3.5 w-3.5" /> {candidate.candidate_id}
            </button>
            <span aria-hidden="true">·</span>
            <span>{stageLabel(candidate.current_stage)}</span>
          </div>
          <h1 id="candidate-profile-title" className="mt-1.5 text-2xl font-semibold tracking-tight text-text-primary">
            {candidate.full_name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {candidate.position_applied_for || 'Position not specified'}
            {candidate.department ? ` · ${candidate.department}` : ''}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:min-w-[28rem]">
          <Meta label="Days in stage" value={stageAgeLabel} icon={<Clock3 className="h-3.5 w-3.5" />} />
          <Meta label="Team" value={workState?.responsible_team || 'Unknown'} icon={<Users className="h-3.5 w-3.5" />} />
          <Meta label="Source" value={formatSource(candidate.source)} className="col-span-2 sm:col-span-1" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-text-secondary">Next action</p>
          <p className="mt-1 font-medium text-text-primary">{workState?.next_action || 'Work state unavailable'}</p>
        </div>
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
            <ShieldAlert className="h-3.5 w-3.5" /> Blockers
          </p>
          {workState?.blockers?.length ? (
            <ul className="mt-1 flex flex-wrap gap-2" aria-label="Candidate blockers">
              {workState.blockers.map((blocker) => (
                <li key={blocker} className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  {blocker}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-success">No recorded blockers</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Meta({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg bg-muted/50 p-2.5 ${className ?? ''}`}>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 flex items-center gap-1 truncate text-sm font-medium text-text-primary" title={value}>
        {icon}
        {value}
      </p>
    </div>
  );
}
