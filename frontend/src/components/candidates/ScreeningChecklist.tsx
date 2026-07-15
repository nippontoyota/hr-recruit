import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { getScreening, submitScreening } from '../../api/candidates';
import { AlertCircle, CheckCircle2, XCircle, Clock, Pencil, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover';
import { Calendar } from '../ui/Calendar';


interface ScreeningChecklistProps {
  candidateId: string;
  onUpdate: () => void;
}

export function ScreeningChecklist({ candidateId, onUpdate }: ScreeningChecklistProps) {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [hasSavedData, setHasSavedData] = useState(false);

  // Local state for editing
  const [status, setStatus] = useState('PENDING');
  const [remarks, setRemarks] = useState('');
  
  // New Follow up fields
  const [pendingReason, setPendingReason] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchScreening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const fetchScreening = async () => {
    setLoading(true);
    try {
      const data = await getScreening(candidateId);
      setStatus(data.status);
      setRemarks(data.remarks || '');
      
      let hasPending = false;
      if (data.pending_reason) {
        setPendingReason(data.pending_reason);
        hasPending = true;
      } else {
        setPendingReason('');
      }
      
      if (data.follow_up_date) {
        setFollowUpDate(new Date(data.follow_up_date));
      } else {
        setFollowUpDate(undefined);
      }

      const isFilled = data.status === 'QUALIFIED' || data.status === 'REJECTED' || (data.status === 'PENDING' && hasPending);
      setHasSavedData(isFilled);
      setIsEditing(!isFilled);
    } catch (err) {
      console.error(err);
      setHasSavedData(false);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (status === 'PENDING') {
      if (!pendingReason.trim()) {
        toast.error('Select a pending reason.');
        return;
      }
      if (!followUpDate) {
        toast.error('Pick a follow-up date.');
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (followUpDate < today) {
        toast.error('Follow-up date cannot be in the past.');
        return;
      }
    }
    if (remarks.length > 2000) {
      toast.error('Remarks must be 2000 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitScreening(candidateId, {
        status,
        remarks: remarks || undefined,
        pending_reason: status === 'PENDING' && pendingReason ? pendingReason : undefined,
        follow_up_date: status === 'PENDING' && followUpDate ? followUpDate.toISOString() : undefined,
      });
      onUpdate();
      setHasSavedData(true);
      setIsEditing(false);
      if (res?.candidate) {
        toast.success('Candidate accepted — form link ready. Send WhatsApp invite from the sidebar.');
      } else {
        toast.success('Screening checklist updated');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save screening data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse h-[400px] bg-muted/20 border border-dashed border-border rounded-2xl" />;

  const STATUSES = [
    { value: 'QUALIFIED', label: 'Accepted', color: 'bg-muted/50 text-muted-foreground hover:bg-muted', activeColor: 'bg-success/15 text-success border-success/30' },
    { value: 'PENDING', label: 'Pending', color: 'bg-muted/50 text-muted-foreground hover:bg-muted', activeColor: 'bg-warning/15 text-warning-foreground border-warning/30' },
    { value: 'REJECTED', label: 'Rejected', color: 'bg-muted/50 text-muted-foreground hover:bg-muted', activeColor: 'bg-danger/15 text-danger border-danger/30' },
  ];

  const PENDING_REASONS = [
    "Ring heard, no response",
    "Phone switched off",
    "Candidate will call back"
  ];
  
  const handlePendingReasonToggle = (reason: string) => {
    setPendingReason(prev => prev === reason ? '' : reason);
  };

  if (!isEditing) {
    const isAccepted = status === 'QUALIFIED';
    const isRejected = status === 'REJECTED';
    const isPending = status === 'PENDING';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="py-6 max-w-2xl mx-auto w-full"
      >
        <div className="bg-background border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1.5",
              isAccepted && "bg-gradient-to-r from-success/50 to-success",
              isRejected && "bg-gradient-to-r from-danger/50 to-danger",
              isPending && "bg-gradient-to-r from-warning/50 to-warning"
            )}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border",
                  isAccepted && "bg-success/10 border-success/20 text-success",
                  isRejected && "bg-danger/10 border-danger/20 text-danger",
                  isPending && "bg-warning/10 border-warning/20 text-warning-foreground"
                )}
              >
                {isAccepted && <CheckCircle2 className="w-6 h-6" />}
                {isRejected && <XCircle className="w-6 h-6" />}
                {isPending && <Clock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Screening Verdict Saved</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The initial call screening is complete.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-extrabold border self-start sm:self-center shadow-sm uppercase tracking-wider",
                isAccepted && "bg-success/15 text-success border-success/30",
                isRejected && "bg-danger/15 text-danger border-danger/30",
                isPending && "bg-warning/15 text-warning-foreground border-warning/30"
              )}
            >
              {isAccepted && "Accepted"}
              {isRejected && "Rejected"}
              {isPending && "Pending Follow-up"}
            </div>
          </div>

          <div className="space-y-4">
            {isPending && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 border border-border/50 rounded-xl p-4">
                {pendingReason && (
                  <div>
                    <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Reason
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {pendingReason}
                    </span>
                  </div>
                )}
                {followUpDate && (
                  <div>
                    <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Follow-up Date
                    </span>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      {format(followUpDate, "EEEE, d MMMM yyyy")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {remarks && (
              <div className="border border-border/60 bg-muted/5 rounded-xl p-4">
                <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Remarks
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {remarks}
                </p>
              </div>
            )}

            {!remarks && !isPending && (
              <div className="text-center py-4 border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">No remarks provided.</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 hover:bg-muted/80 transition-colors px-4 py-2 border border-border text-sm font-bold text-foreground rounded-lg"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              Edit screening verdict
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      <div className="flex flex-col">
        {/* Status & Remarks */}
        <div className="flex flex-col">
          <div className="flex-1 flex flex-col">
            
            <div className="mb-6">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                Screening Verdict
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "px-2 py-2.5 flex items-center justify-center rounded-xl text-sm font-extrabold transition-all duration-200 border shadow-sm",
                      status === s.value ? s.activeColor : `border-transparent ${s.color} hover:opacity-80`
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            
            <AnimatePresence>
              {status === 'PENDING' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-3">Pending Reason</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PENDING_REASONS.map(reason => (
                          <div 
                            key={reason}
                            onClick={() => handlePendingReasonToggle(reason)}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm font-medium",
                              pendingReason === reason 
                                ? "bg-warning/20 border-warning text-warning-foreground" 
                                : "bg-background border-border hover:bg-muted text-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center",
                              pendingReason === reason ? "bg-warning border-warning" : "border-muted-foreground bg-background"
                            )}>
                              {pendingReason === reason && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Follow-up Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full h-11 px-4 justify-start text-left font-normal rounded-xl border border-border bg-background shadow-sm hover:bg-muted text-sm",
                              !followUpDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {followUpDate ? format(followUpDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={followUpDate}
                            onSelect={setFollowUpDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>



            <div className="mb-6 flex-1 flex flex-col">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Remarks</label>
              <textarea 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSave();
                  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-full flex-1 bg-background border border-border rounded-xl p-4 text-base md:text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[160px] resize-none placeholder:text-muted-foreground/50 shadow-inner shadow-black/[0.02]"
                placeholder="Document key findings... (Press Enter to save, Shift+Enter for new line)" 
              />
            </div>
            
            <div className="pt-2 flex justify-end gap-3 mt-auto">
              {hasSavedData && (
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="h-12 px-6 rounded-xl border border-border"
                >
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} isLoading={isSubmitting} className="!bg-success hover:!bg-success/90 text-white !text-base !font-extrabold w-full sm:w-auto h-12 px-10 rounded-xl shadow-[0_4px_14px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.4)] hover:-translate-y-[1px] transition-all duration-300">
                Save
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
