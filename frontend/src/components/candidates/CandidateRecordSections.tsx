import type { ReactNode } from 'react';

interface CandidateRecordSectionsProps {
  taskContent: ReactNode;
  communicationContent?: ReactNode;
  activityContent?: ReactNode;
  administrativeContent?: ReactNode;
}

export function CandidateRecordSections({ taskContent, communicationContent, activityContent, administrativeContent }: CandidateRecordSectionsProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="candidate-task-record-title">
        <SectionHeading id="candidate-task-record-title" title="Current task" />
        {taskContent}
      </section>
      {communicationContent && (
        <section aria-labelledby="candidate-communication-title">
          <SectionHeading id="candidate-communication-title" title="Communication" />
          {communicationContent}
        </section>
      )}
      {activityContent && (
        <section aria-labelledby="candidate-activity-title">
          <SectionHeading id="candidate-activity-title" title="Activity history" />
          {activityContent}
        </section>
      )}
      {administrativeContent && (
        <section aria-labelledby="candidate-administration-title" className="border-t-2 border-dashed border-border pt-5">
          <SectionHeading id="candidate-administration-title" title="Administrative actions" subdued />
          {administrativeContent}
        </section>
      )}
    </div>
  );
}

function SectionHeading({ id, title, subdued = false }: { id: string; title: string; subdued?: boolean }) {
  return <h2 id={id} className={`mb-3 text-xs font-bold uppercase tracking-[0.16em] ${subdued ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</h2>;
}
