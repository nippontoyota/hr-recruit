import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, MapPin, Send, Video } from 'lucide-react';
import { toast } from 'sonner';

import type { Candidate, Evaluation, InterviewMode } from '../../types';
import { scheduleEvaluation, sendEvaluationWhatsAppInvite } from '../../api/evaluations';
import { updateCandidateStage } from '../../api/candidates';
import { Button, Input, Select } from '../ui';
import { WhatsAppSendChoices } from './WhatsAppSendChoices';
import { buildHeadOfficeInterviewWhatsAppMessage, openWhatsAppChat } from '../../lib/whatsappTemplate';
import { extractError } from '../../lib/utils';
import { formatDate, formatTime } from '../../lib/dateTime';
import { useAuth } from '../../auth';

interface HeadOfficeInvitePanelProps {
  candidate: Candidate;
  evaluation: Evaluation;
  onUpdate: (opts?: { candidate?: boolean }) => void;
  onSent?: () => void;
  isReadOnly?: boolean;
}

function localDateTimeValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function HeadOfficeInvitePanel({ candidate, evaluation, onUpdate, onSent, isReadOnly = false }: HeadOfficeInvitePanelProps) {
  const { user } = useAuth();
  const [scheduledTime, setScheduledTime] = useState(() => localDateTimeValue(evaluation.scheduled_time));
  const [mode, setMode] = useState<InterviewMode | ''>(evaluation.interview_mode || '');
  const [location, setLocation] = useState(evaluation.location_or_link || '');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);
  const [confirmingWhatsApp, setConfirmingWhatsApp] = useState(false);
  const evaluationScheduledTime = evaluation.scheduled_time;
  const evaluationMode = evaluation.interview_mode;
  const evaluationLocation = evaluation.location_or_link;

  useEffect(() => {
    setScheduledTime(localDateTimeValue(evaluationScheduledTime));
    setMode(evaluationMode || '');
    setLocation(evaluationLocation || '');
  }, [evaluation.id, evaluation.updated_at, evaluationScheduledTime, evaluationMode, evaluationLocation]);

  const isValid = Boolean(candidate.phone && scheduledTime && mode && location.trim());
  const isSaved =
    scheduledTime === localDateTimeValue(evaluationScheduledTime) &&
    mode === (evaluationMode || '') &&
    location.trim() === (evaluationLocation || '').trim();
  const schedule = scheduledTime ? new Date(scheduledTime) : null;
  const dateLabel = schedule && !Number.isNaN(schedule.getTime()) ? formatDate(schedule) : 'Date not set';
  const timeLabel = schedule && !Number.isNaN(schedule.getTime()) ? formatTime(schedule) : 'Time not set';
  const modeLabel = mode === 'PHYSICAL' ? 'Walk-in' : mode === 'ONLINE' ? 'Online' : 'Mode not set';
  const message = useMemo(
    () => buildHeadOfficeInterviewWhatsAppMessage({
      candidateName: candidate.full_name,
      position: candidate.position_applied_for || candidate.department || 'the role',
      date: dateLabel,
      time: timeLabel,
      mode: modeLabel,
      locationOrLink: location.trim() || 'Location or link not set',
      recruiterName: user?.full_name || 'Head Office HR',
    }),
    [candidate.full_name, candidate.position_applied_for, candidate.department, dateLabel, timeLabel, modeLabel, location, user?.full_name]
  );

  const saveSchedule = async () => {
    const iso = toIso(scheduledTime);
    if (!candidate.phone) {
      toast.error('Candidate phone number is missing');
      return false;
    }
    if (!iso || !mode || !location.trim()) {
      toast.error('Set the interview date, time, mode, and location or link first');
      return false;
    }
    setSaving(true);
    try {
      await scheduleEvaluation(evaluation.id, {
        interview_mode: mode,
        scheduled_time: iso,
        location_or_link: location.trim(),
      });
      toast.success('Head Office interview schedule saved');
      onUpdate({ candidate: false });
      return true;
    } catch (err) {
      toast.error(extractError(err, 'Failed to save interview schedule'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const sendViaDoubleTick = async () => {
    if (!isValid || !isSaved || sending) return;
    setSending(true);
    try {
      await sendEvaluationWhatsAppInvite(evaluation.id, {
        to_phone: candidate.phone,
        recipient_type: 'CANDIDATE',
        variables: {
          candidateName: candidate.full_name,
          position: candidate.position_applied_for || candidate.department || 'the role',
          date: dateLabel,
          time: timeLabel,
          mode: modeLabel,
          locationOrLink: location.trim(),
          recruiterName: user?.full_name || 'Head Office HR',
        },
      });
      await markInvitationSent('DoubleTick');
    } catch (err) {
      toast.error(extractError(err, 'Failed to send Head Office invitation'));
    } finally {
      setSending(false);
    }
  };

  const markInvitationSent = async (method: string) => {
    await updateCandidateStage(candidate.id, 'HO_INTERVIEWS', `Head Office interview invitation sent via ${method}.`);
    toast.success('Head Office invitation recorded; candidate moved to Interviews');
    onUpdate({ candidate: true });
    onSent?.();
  };

  const openDirectWhatsApp = () => {
    if (!isValid || !isSaved) return;
    const opened = openWhatsAppChat(candidate.phone, message);
    if (!opened) {
      toast.error('WhatsApp did not open. Allow pop-ups, then try again.');
      return;
    }
    toast.success('Opened WhatsApp with the invitation ready to send');
    setWhatsAppOpened(true);
  };

  const confirmWhatsAppSent = async () => {
    setConfirmingWhatsApp(true);
    try {
      await markInvitationSent('WhatsApp');
      setWhatsAppOpened(false);
    } catch (err) {
      toast.error(extractError(err, 'Failed to record that the WhatsApp invitation was sent'));
    } finally {
      setConfirmingWhatsApp(false);
    }
  };

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface/40 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Send className="h-4 w-4 text-primary" />
            Head Office interview invitation
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Preview the candidate message, then send it by WhatsApp.</p>
        </div>
        {isSaved && isValid && <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" />Ready to send</span>}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-foreground">
              Interview date and time
              <Input type="datetime-local" value={scheduledTime} disabled={isReadOnly || saving} onChange={(e) => setScheduledTime(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-foreground">
              Interview mode
              <Select value={mode} disabled={isReadOnly || saving} onChange={(e) => setMode(e.target.value as InterviewMode)}>
                <option value="">Select mode</option>
                <option value="PHYSICAL">Walk-in at Head Office</option>
                <option value="ONLINE">Online</option>
              </Select>
            </label>
          </div>
          <label className="block space-y-1.5 text-xs font-semibold text-foreground">
            {mode === 'ONLINE' ? 'Meeting link' : 'Head Office location'}
            <Input placeholder={mode === 'ONLINE' ? 'https://...' : 'Nippon Toyota Head Office'} value={location} disabled={isReadOnly || saving} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateLabel}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{timeLabel}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{modeLabel}</span>
            {mode === 'ONLINE' && <Video className="h-3.5 w-3.5" aria-label="Online interview" />}
          </div>
          {!isReadOnly && <Button type="button" onClick={() => void saveSchedule()} isLoading={saving} disabled={!isValid || isSaved}>Save interview schedule</Button>}
          {!candidate.phone && <p className="text-xs font-medium text-danger" role="alert">Add a candidate phone number before sending.</p>}
          {!isSaved && isValid && <p className="text-xs font-medium text-warning" role="status">Save the updated schedule before sending.</p>}
        </div>

        <div className="overflow-hidden rounded-[22px] border-[5px] border-[#18181b] bg-[#efeae2] shadow-[0_12px_28px_rgba(17,24,39,0.16)]">
          <div className="flex h-12 items-center gap-2 bg-[#075E54] px-3 text-white">
            <div className="h-7 w-7 overflow-hidden rounded-full bg-white"><img src="/toyota-HR-profile.jpeg" alt="" className="h-full w-full object-cover" /></div>
            <div><p className="text-xs font-semibold leading-tight">Nippon Toyota HR</p><p className="text-[10px] text-white/80">Official Business Account</p></div>
          </div>
          <div className="min-h-[240px] bg-[#efeae2] p-3">
            <div className="mx-auto mb-3 w-fit rounded-md bg-[#E1F3FB] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#55656E]">Today</div>
            <div className="whitespace-pre-wrap break-words rounded-xl rounded-tl-sm bg-white px-3 py-2.5 text-[12px] leading-[1.35] text-[#111b21] shadow-sm">{message}</div>
          </div>
          {!isReadOnly && <div className="border-t border-border bg-background p-3 space-y-2"><WhatsAppSendChoices onDoubleTick={() => void sendViaDoubleTick()} onOpenWhatsApp={openDirectWhatsApp} doubleTickLoading={sending || confirmingWhatsApp} disabled={!isValid || !isSaved} openWhatsAppDisabled={!candidate.phone} stacked />{whatsAppOpened && <Button type="button" variant="secondary" className="w-full" onClick={() => void confirmWhatsAppSent()} isLoading={confirmingWhatsApp}>I sent this on WhatsApp</Button>}</div>}
        </div>
      </div>
    </section>
  );
}
