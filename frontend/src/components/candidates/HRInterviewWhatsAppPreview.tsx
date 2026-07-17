import { useState } from 'react';
import { Send, CheckCheck, Smile, Paperclip, Camera, Video, Phone, MoreVertical, ArrowLeft, Pencil, MapPin, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { sendHRInterviewInvite } from '../../api/candidates';
import type { Candidate, InterviewMode } from '../../types';
import { useAuth } from '../../auth';
import { Button, Modal, Input } from '../ui';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface HRInterviewWhatsAppPreviewProps {
  candidate: Candidate;
  scheduledTime: string;
  setScheduledTime: (val: string) => void;
  interviewMode: InterviewMode | '';
  setInterviewMode: (val: InterviewMode) => void;
  locationOrLink: string;
  setLocationOrLink: (val: string) => void;
  onSaveSchedule: () => Promise<void>;
  isSavingSchedule: boolean;
}

export function HRInterviewWhatsAppPreview({
  candidate,
  scheduledTime,
  setScheduledTime,
  interviewMode,
  setInterviewMode,
  locationOrLink,
  setLocationOrLink,
  onSaveSchedule,
  isSavingSchedule,
}: HRInterviewWhatsAppPreviewProps) {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);




  const parsedDate = scheduledTime ? new Date(scheduledTime) : null;
  const dateStr = parsedDate && !isNaN(parsedDate.getTime()) ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsedDate) : 'TBD';
  const timeStr = parsedDate && !isNaN(parsedDate.getTime()) ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parsedDate).toLowerCase() : 'TBD';
  const defaultMode = interviewMode === 'PHYSICAL' ? 'Walk-in' : (interviewMode === 'ONLINE' ? 'Online' : 'TBD');

  // Text overrides for WhatsApp message
  const [vars, setVars] = useState({
    candidateName: candidate.full_name || '',
    position: candidate.position_applied_for || '',
    recruiterName: user?.full_name || 'Nippon Toyota HR',
  });

  const [draft, setDraft] = useState(vars);

  const openEditor = () => {
    setDraft(vars);
    setIsEditing(true);
  };

  const updateDraft = (key: keyof typeof vars, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSaveDetails = async () => {
    try {
      await onSaveSchedule(); // Save to database first
      setVars(draft);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const message = `Dear *${vars.candidateName}*,

Your HR interview for the position of *${vars.position}* is scheduled.

*Date:* ${dateStr}
*Time:* ${timeStr}
*Mode:* ${defaultMode}
*Location/Link:* ${locationOrLink || 'TBD'}

Please be on time.

Best Regards,
*${vars.recruiterName}*
Nippon Toyota`;

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendHRInterviewInvite(candidate.id, {
        candidateName: vars.candidateName,
        position: vars.position,
        date: dateStr,
        time: timeStr,
        mode: defaultMode,
        locationOrLink: locationOrLink || 'TBD',
        recruiterName: vars.recruiterName,
      });
      toast.success('WhatsApp invite sent successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to send WhatsApp invite');
    } finally {
      setIsSending(false);
    }
  };

  // Date and Time split logic
  const splitDateTime = (dt: string) => {
    if (!dt) return { d: '', t: '09:00' };
    const parts = dt.split('T');
    if (parts.length === 2) return { d: parts[0], t: parts[1].substring(0, 5) };
    return { d: '', t: '09:00' };
  };

  const { d: inputDate, t: inputTime } = splitDateTime(scheduledTime);

  const handleDateChange = (val: string) => {
    setScheduledTime(val ? `${val}T${inputTime}` : '');
  };

  const handleTimeChange = (val: string) => {
    if (inputDate) {
      setScheduledTime(`${inputDate}T${val}`);
    } else {
      // If time is changed but no date is set, we can't form a valid datetime-local string
      // Just temporarily keep it in a state or ignore it. Let's force date today if they pick time first
      const today = new Date().toLocaleDateString('en-CA');
      setScheduledTime(`${today}T${val}`);
    }
  };

  // Location/Link prefix logic
  const isOnline = interviewMode === 'ONLINE';

  const handleLocationChange = (val: string) => {
    setLocationOrLink(val);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* WhatsApp Mockup Container */}
      <div className="mx-auto flex min-h-[600px] w-full max-w-[340px] flex-col overflow-hidden rounded-[38px] border-[6px] border-[#18181b] bg-[#efeae2] shadow-[0_20px_40px_rgba(17,24,39,0.2)] relative shrink-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[20px] w-[110px] bg-[#18181b] rounded-b-[16px] z-20"></div>

        <div className="flex h-[64px] shrink-0 items-center justify-between gap-1 bg-[#075E54] px-2 pt-4 text-white z-10 shadow-sm relative">
          <div className="flex items-center gap-1 cursor-pointer">
            <div className="flex items-center text-white ml-0.5" aria-label="Back">
              <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ml-0.5 border border-white/20">
              <img src="/toyota-HR-profile.jpeg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 text-left ml-2">
              <p className="truncate text-[15px] font-medium leading-tight">Nippon Toyota HR</p>
              <p className="text-[11px] leading-tight text-white/90">Official Business Account</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 text-white mr-2">
            <Video className="h-5 w-5" fill="currentColor" strokeWidth={0} />
            <Phone className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#efeae2]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
              backgroundSize: '300px',
              backgroundRepeat: 'repeat',
            }}
          />
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 flex flex-col gap-3">
            <div className="mx-auto w-fit rounded-lg bg-[#E1F3FB] px-3 py-1.5 text-[11px] uppercase tracking-wide font-medium text-[#55656E] shadow-sm">
              TODAY
            </div>

            <div className="relative max-w-[88%] rounded-xl rounded-tl-sm bg-white px-2.5 py-2 text-left text-[14.5px] leading-[1.3] text-[#111b21] shadow-sm mt-1">
              <span className="absolute -left-2 top-0 h-0 w-0 border-r-[10px] border-t-[12px] border-r-white border-t-transparent" />
              <div className="whitespace-pre-wrap break-words pb-4">
                {message.split('\n').map((line, i) => (
                  <span key={i}>
                    {line.split(/\*(.*?)\*/g).map((part, j) => 
                      j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : (
                        part.startsWith('http') ? (
                          <a key={j} href={part} target="_blank" rel="noreferrer" className="text-[#027eb5] underline hover:text-[#026aa3] break-all">{part}</a>
                        ) : <span key={j}>{part}</span>
                      )
                    )}
                    <br />
                  </span>
                ))}
              </div>
              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                <p className="text-[10px] text-[#667781] whitespace-nowrap">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toLowerCase()}</p>
                <CheckCheck className="h-[15px] w-[15px] text-[#34B7F1]" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-end gap-1.5 p-2 bg-transparent pb-3">
            <div className="flex min-h-[42px] flex-1 items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm">
              <div className="p-1.5 text-[#8696A0]"><Smile className="h-[22px] w-[22px]" /></div>
              <div className="flex-1 text-[15px] text-[#8696A0] px-1 py-1">Message</div>
              <div className="p-1.5 text-[#8696A0]"><Paperclip className="h-5 w-5" /></div>
              <div className="p-1.5 text-[#8696A0]"><Camera className="h-[22px] w-[22px]" /></div>
            </div>
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm mb-[2px]">
              <Send className="h-[18px] w-[18px] mr-0.5" fill="currentColor" strokeWidth={0} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-1 flex shrink-0 items-center justify-center py-1">
        <button
          type="button"
          onClick={openEditor}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="h-4 w-4" />
          Edit content
        </button>
      </div>

      <Button onClick={handleSend} isLoading={isSending} className="w-full !bg-[#08796b] hover:!bg-[#06685c] h-12 text-base shadow-md">
        <Send className="w-5 h-5 mr-2" /> Send via WhatsApp
      </Button>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Schedule Interview & Edit Message"
        description="Save details to update the schedule and the WhatsApp preview."
        size="md"
      >
        <div className="max-h-[72vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            <h4 className="sm:col-span-2 text-sm font-bold text-foreground border-b border-border pb-2">Scheduling Details</h4>
            
            {/* Interview Mode Toggle */}
            <div className="sm:col-span-2">
              <label className="form-label mb-2 block">Interview Mode</label>
              <div className="flex bg-muted/30 p-1 rounded-xl border border-border relative">
                {['PHYSICAL', 'ONLINE'].map((mode) => {
                  const isSelected = interviewMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setInterviewMode(mode as InterviewMode)}
                      className={cn(
                        "flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors relative z-10",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="mode-indicator-modal"
                          className="absolute inset-0 bg-primary rounded-lg shadow-sm -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      {mode === 'PHYSICAL' ? <MapPin className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      {mode === 'PHYSICAL' ? 'Physical' : 'Online'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Separated */}
            <div>
              <label className="form-label mb-2 block">Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="form-label mb-2 block">Time</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="time"
                  value={inputTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Location / Link */}
            <div className="sm:col-span-2 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={interviewMode || 'empty'}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label !mb-0">
                      {isOnline ? 'Meeting Link' : 'Branch / Location'}
                    </label>
                    {isOnline && (
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md"
                        title="Open Google Meet in a new tab"
                      >
                        <Video className="w-4 h-4" />
                        Create Google Meet
                      </a>
                    )}
                  </div>
                  {isOnline ? (
                    <div className="flex bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 overflow-hidden">
                      <input
                        type="text"
                        value={locationOrLink}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="w-full p-2.5 text-sm text-foreground focus:outline-none bg-transparent"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={locationOrLink}
                      onChange={(e) => setLocationOrLink(e.target.value)}
                      placeholder="e.g. Enchakkal Branch, 2nd Floor"
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <h4 className="sm:col-span-2 text-sm font-bold text-foreground border-b border-border pb-2 mt-2">WhatsApp Overrides</h4>
            <div>
              <label className="form-label">Candidate Name</label>
              <Input value={draft.candidateName} onChange={(e) => updateDraft('candidateName', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Position</label>
              <Input value={draft.position} onChange={(e) => updateDraft('position', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Recruiter Name</label>
              <Input value={draft.recruiterName} onChange={(e) => updateDraft('recruiterName', e.target.value)} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveDetails} isLoading={isSavingSchedule}>Save Details</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
