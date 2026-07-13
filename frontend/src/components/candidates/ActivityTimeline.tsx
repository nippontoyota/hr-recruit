import { useEffect, useState } from 'react';
import { getActivityLogs } from '../../api/candidates';
import { LoadingSpinner } from '../ui';
import { Phone, Mail, FileText, Settings, ArrowRightCircle, RefreshCw } from 'lucide-react';

interface ActivityTimelineProps {
  candidateId: string;
  refreshTrigger?: number; // pass a count to refresh logs
}

export function ActivityTimeline({ candidateId, refreshTrigger = 0 }: ActivityTimelineProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await getActivityLogs(candidateId);
        if (isMounted) setLogs(data);
      } catch (err) {
        console.error('Failed to load activity logs', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLogs();
    return () => { isMounted = false; };
  }, [candidateId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center p-8 text-text-secondary border border-border rounded-[12px] bg-surface">
        <RefreshCw className="w-8 h-8 opacity-20 mx-auto mb-2" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'CALL': return <Phone className="w-4 h-4 text-primary" />;
      case 'EMAIL': return <Mail className="w-4 h-4 text-primary" />;
      case 'FORM': return <FileText className="w-4 h-4 text-primary" />;
      case 'STAGE_CHANGE': return <ArrowRightCircle className="w-4 h-4 text-warning" />;
      default: return <Settings className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-text-primary mb-4">
        Activity Timeline
      </h3>
      <div className="relative border-l border-border ml-3 space-y-6 pb-4">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-6">
            <div className="absolute -left-[13px] top-1 bg-surface border border-border p-1 rounded-full shadow-sm z-10">
              {getIcon(log.activity_type)}
            </div>
            <div className="bg-surface border border-border p-3 rounded-[10px] shadow-sm flex flex-col gap-1">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-text-primary">{log.title}</p>
                <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{log.description}</p>
              {log.created_by && (
                <div className="text-[11px] font-medium text-text-secondary mt-1 flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold">
                    {log.created_by.charAt(0).toUpperCase()}
                  </div>
                  {log.created_by}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
