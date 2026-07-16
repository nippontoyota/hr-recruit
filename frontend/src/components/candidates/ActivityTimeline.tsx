import { useEffect, useState } from 'react';
import { Phone, MessageCircle, Mail, ArrowRightLeft, FileText, Monitor, StickyNote, Clock } from 'lucide-react';
import { getActivityLogs } from '../../api/candidates';
import type { ActivityLog, ActivityType } from '../../types';
import { LoadingSpinner } from '../ui';
import { cn } from '../../lib/utils';

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
    case 'CALL':          return 'bg-sky-100 text-sky-600 border-sky-200';
    case 'WHATSAPP':      return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    case 'EMAIL':         return 'bg-violet-100 text-violet-600 border-violet-200';
    case 'STAGE_CHANGE':  return 'bg-primary/10 text-primary border-primary/20';
    case 'FORM':          return 'bg-purple-100 text-purple-600 border-purple-200';
    case 'NOTE':          return 'bg-amber-100 text-amber-600 border-amber-200';
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
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

    const intervalId = setInterval(fetch, 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 px-4 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 shrink-0" />
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />

      <ol className="space-y-0">
        {logs.map((log, idx) => (
          <li
            key={log.id}
            className={cn(
              'relative flex gap-3 py-3 pl-10 pr-3 group',
              idx < logs.length - 1 && 'border-b border-border/50'
            )}
          >
            {/* Icon bubble */}
            <div
              className={cn(
                'absolute left-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-xs',
                activityColor(log.activity_type)
              )}
            >
              {activityIcon(log.activity_type)}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight">{log.title}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">
                  {formatRelativeTime(log.created_at)}
                </span>
              </div>
              {log.description && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug line-clamp-2">
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
