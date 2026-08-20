import { useEffect, useState } from 'react';
import { Phone, MessageCircle, Mail, ArrowRightLeft, FileText, Monitor, StickyNote, Clock } from 'lucide-react';
import { getActivityLogs } from '../../api/candidates';
import type { ActivityLog, ActivityType } from '../../types';
import { LoadingSpinner } from '../ui';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/dateTime';

interface ActivityTimelineProps {
  candidateId: string;
}

function activityIcon(type: ActivityType) {
  switch (type) {
    case 'CALL':          return <Phone className="w-3.5 h-3.5" />;
    case 'WHATSAPP':      return <MessageCircle className="w-3.5 h-3.5" />;
    case 'EMAIL':         return <Mail className="w-3.5 h-3.5" />;
    case 'STAGE_CHANGE':  return <ArrowRightLeft className="w-3.5 h-3.5" />;
    case 'FORM':          return <FileText className="w-3.5 h-3.5" />;
    case 'NOTE':          return <StickyNote className="w-3.5 h-3.5" />;
    case 'SYSTEM':
    default:              return <Monitor className="w-3.5 h-3.5" />;
  }
}

function activityColor(type: ActivityType): string {
  switch (type) {
    case 'CALL':          return 'bg-info/10 text-info border-info/20';
    case 'WHATSAPP':      return 'bg-success/10 text-success border-success/20';
    case 'EMAIL':         return 'bg-muted text-text-secondary border-border';
    case 'STAGE_CHANGE':  return 'bg-primary/10 text-primary border-primary/20';
    case 'FORM':          return 'bg-muted text-text-secondary border-border';
    case 'NOTE':          return 'bg-warning/10 text-warning border-warning/20';
    case 'SYSTEM':
    default:              return 'bg-muted text-muted-foreground border-border';
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return formatDate(dateStr);
}

export function ActivityTimeline({ candidateId }: ActivityTimelineProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetch() {
      try {
        const data = await getActivityLogs(candidateId);
        if (active) setLogs(data);
      } catch {
        // silently fail — timeline is supplemental
      } finally {
        if (active) setLoading(false);
      }
    }

    fetch();

    return () => {
      active = false;
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Loading activity history">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 px-4 text-sm text-muted-foreground" role="status">
        <Clock className="w-4 h-4 shrink-0" />
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pt-2 pb-4 pl-2">
      {/* Vertical line */}
      <div className="absolute left-6 top-4 bottom-4 w-px bg-border z-0" aria-hidden="true" />

      <ol className="space-y-6 relative z-10" aria-label="Candidate activity history">
        {logs.map((log) => (
          <li
            key={log.id}
            className="relative flex gap-4 pl-12 pr-2 group"
          >
            {/* Icon bubble */}
            <div className="absolute left-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background ring-4 ring-background z-10">
              <div
                className={cn(
                  'flex h-full w-full items-center justify-center rounded-full border shadow-sm',
                  activityColor(log.activity_type)
                )}
              >
                {activityIcon(log.activity_type)}
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground leading-tight">{log.title}</p>
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(log.created_at)}
                </span>
              </div>
              {log.description && (
                <p className="text-sm text-muted-foreground leading-relaxed break-words">
                  {log.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
