import { useEffect, useRef, useState } from 'react';
import { Button, Input, LoadingSpinner, Modal, PdfViewer } from '../ui';
import { confirmOfferWhatsApp, resendOfferWhatsApp, sendOfferLetter } from '../../api/candidates';
import { getAuthHeaders } from '../../api/client';
import type { Candidate } from '../../types';
import { Mail, Pencil, MessageSquare } from 'lucide-react';
import { openWhatsAppChat } from '../../lib/whatsappTemplate';
import { buildOfferWhatsAppMessage } from '../../lib/offerLetter';
import { toast } from 'sonner';
import { useAuth } from '../../auth';
import { extractError, isAbortError } from '../../lib/utils';
import {
  canSendOfferLetter,
  defaultOfferFields,
  loadStoredOfferFields,
  offerFieldErrors,
  payloadFromOfferFields,
  storeOfferFields,
  type OfferLetterFields,
} from '../../lib/offerLetter';

interface FinalApprovalWidgetProps {
  candidate: Candidate;
  onUpdate?: () => void;
}

const FIELD_LABELS: { key: keyof OfferLetterFields; label: string; type?: string }[] = [
  { key: 'candidate_name', label: 'Candidate name' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'total_salary', label: 'Total salary' },
  { key: 'total_allowance', label: 'Total allowance' },
  { key: 'others', label: 'Others' },
  { key: 'gross_salary', label: 'Total package' },
  { key: 'joining_date', label: 'Join on or before', type: 'date' },
];

export function FinalApprovalWidget({ candidate, onUpdate }: FinalApprovalWidgetProps) {
  const { user } = useAuth();
  const [sendingOffer, setSendingOffer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showWhatsAppConfirm, setShowWhatsAppConfirm] = useState(false);
  const [showWhatsAppFailure, setShowWhatsAppFailure] = useState(false);
  const [whatsAppFailure, setWhatsAppFailure] = useState<string | null>(null);
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);
  const [confirmingWhatsApp, setConfirmingWhatsApp] = useState(false);
  const [resendingWhatsApp, setResendingWhatsApp] = useState(false);
  const awaitingWhatsAppReturn = useRef(false);

  const [fields, setFields] = useState<OfferLetterFields>(() => {
    const defaults = defaultOfferFields(candidate);
    return { ...defaults, ...loadStoredOfferFields(candidate.id) };
  });
  const [draft, setDraft] = useState(fields);

  const draftErrors = offerFieldErrors(draft);
  const ready = canSendOfferLetter(fields);
  const salarySet = !!(candidate.salary_data && Object.keys(candidate.salary_data).length);
  const blockers = candidate.offer_blockers ?? [];
  const alreadyOffered = blockers.includes('already offered') || candidate.offer_status === 'SENT' || candidate.offer_status === 'ACCEPTED';
  const offerWhatsAppSent = candidate.profile?.raw_data?.offerWhatsAppStatus === 'SENT';
  const offerWhatsAppFailed = candidate.profile?.raw_data?.offerWhatsAppStatus === 'FAILED';
  const offerWhatsAppError = candidate.profile?.raw_data?.offerWhatsAppError as string | undefined;
  const pipelineReady = blockers.length === 0;

  useEffect(() => {
    const onReturn = () => {
      if (!awaitingWhatsAppReturn.current) return;
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      awaitingWhatsAppReturn.current = false;
      setShowWhatsAppConfirm(true);
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, []);

  useEffect(() => {
    const defaults = defaultOfferFields(candidate);
    if (!defaults.gross_salary) return;
    setFields((prev) => ({
      ...prev,
      total_salary: defaults.total_salary,
      total_allowance: defaults.total_allowance,
      others: defaults.others,
      gross_salary: defaults.gross_salary,
      designation: defaults.designation || prev.designation,
      department: defaults.department || prev.department,
      joining_date: prev.joining_date || defaults.joining_date,
    }));
  }, [candidate]);

  useEffect(() => {
    storeOfferFields(candidate.id, fields);
  }, [candidate.id, fields]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setGeneratingPdf(true);
    const body = JSON.stringify({
      candidate: {
        full_name: candidate.full_name,
        position_applied_for: candidate.position_applied_for,
        department: candidate.department,
        salary_data: candidate.salary_data,
      },
      ...payloadFromOfferFields(fields),
    });

    (async () => {
      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL
          || (import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : 'https://hr-recruit-api.vercel.app/api/v1');
        const response = await fetch(`${baseURL}/pdf/offer-letter`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to generate preview');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        if (isAbortError(error)) return;
        if (!cancelled) toast.error('Could not load offer letter preview.');
      } finally {
        if (!cancelled) setGeneratingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [candidate.full_name, candidate.position_applied_for, candidate.department, candidate.salary_data, fields]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const openOfferWhatsApp = () => {
    if (!candidate.phone) {
      toast.error('Candidate does not have a phone number on file.');
      return;
    }
    const opened = openWhatsAppChat(candidate.phone, buildOfferWhatsAppMessage(candidate, fields));
    if (!opened) {
      toast.error('WhatsApp did not open. Allow pop-ups, then try again.');
      return;
    }
    awaitingWhatsAppReturn.current = true;
    setWhatsAppOpened(true);
    toast.success('Opened WhatsApp with the offer message ready to send');
  };

  const confirmOfferWhatsAppSent = async () => {
    setConfirmingWhatsApp(true);
    try {
      await confirmOfferWhatsApp(candidate.id);
      setShowWhatsAppConfirm(false);
      setWhatsAppOpened(false);
      toast.success('Offer WhatsApp message recorded as sent');
      onUpdate?.();
    } catch (error) {
      toast.error(extractError(error, 'Could not record the WhatsApp message'));
    } finally {
      setConfirmingWhatsApp(false);
    }
  };

  const retryOfferWhatsApp = async () => {
    setResendingWhatsApp(true);
    try {
      await resendOfferWhatsApp(candidate.id);
      setShowWhatsAppFailure(false);
      setWhatsAppFailure(null);
      toast.success('Offer letter email sent. WhatsApp intimation sent via DoubleTick.');
      onUpdate?.();
    } catch (error) {
      const message = extractError(error, 'DoubleTick could not send the WhatsApp intimation.');
      setWhatsAppFailure(message);
      toast.error(`WhatsApp intimation failed: ${message}`);
    } finally {
      setResendingWhatsApp(false);
    }
  };

  const handleSendOffer = async () => {
    if (!candidate.email) {
      toast.error('Candidate does not have an email address on file.');
      return;
    }
    if (!pipelineReady) {
      toast.error(`Offer cannot be sent yet. Missing: ${blockers.join(', ')}`);
      return;
    }
    if (!ready) {
      toast.error('Fill name, designation, package, and joining date first.');
      return;
    }
    try {
      setSendingOffer(true);
      const updated = await sendOfferLetter(candidate.id, payloadFromOfferFields(fields));
      const whatsappStatus = updated.profile?.raw_data?.offerWhatsAppStatus;
      const whatsappError = updated.profile?.raw_data?.offerWhatsAppError as string | undefined;
      if (whatsappStatus === 'SENT') {
        toast.success('Offer letter email sent and WhatsApp intimation sent.');
      } else if (whatsappStatus === 'FAILED') {
        const message = whatsappError || 'DoubleTick could not send the WhatsApp intimation.';
        setWhatsAppFailure(message);
        setShowWhatsAppFailure(true);
        toast.error(`Offer letter email sent, but WhatsApp intimation failed: ${message}`);
      } else {
        toast.success('Offer letter email sent. WhatsApp intimation is pending.');
      }
      onUpdate?.();
    } catch (error: unknown) {
      toast.error(extractError(error, 'Failed to send offer letter.'));
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {alreadyOffered && !offerWhatsAppSent && user?.role !== 'LOCAL_HR' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-950">
            Offer email sent. {offerWhatsAppFailed ? 'WhatsApp intimation failed.' : 'WhatsApp intimation still needs confirmation.'}
          </p>
          {offerWhatsAppFailed && offerWhatsAppError && <p className="text-xs text-amber-900">Reason: {offerWhatsAppError}</p>}
          <p className="text-xs text-amber-900">Choose DoubleTick retry or open WhatsApp and send the prepared message yourself.</p>
          <div className="flex flex-wrap gap-2">
            {offerWhatsAppFailed && <Button type="button" onClick={() => { setWhatsAppFailure(offerWhatsAppError || 'DoubleTick could not send the WhatsApp intimation.'); setShowWhatsAppFailure(true); }}>Retry options</Button>}
            <Button type="button" variant="secondary" onClick={openOfferWhatsApp} disabled={!candidate.phone}>
              <MessageSquare className="mr-2 h-4 w-4" /> Open WhatsApp to send
            </Button>
          </div>
          {whatsAppOpened && (
            <Button type="button" onClick={() => void confirmOfferWhatsAppSent()} isLoading={confirmingWhatsApp}>
              I sent this on WhatsApp
            </Button>
          )}
        </div>
      )}
      {!salarySet && (
        <p className="text-center text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {user?.role === 'HO_HR'
            ? 'Upload the salary setting sheet above to fill this offer letter.'
            : 'Waiting for Head Office HR to upload the salary setting sheet.'}
        </p>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button variant="secondary" onClick={() => { setDraft(fields); setEditing(true); }} className="w-full sm:w-auto">
          <Pencil className="h-4 w-4 mr-2" />
          Edit letter
        </Button>
        {user?.role !== 'LOCAL_HR' && (
          <Button onClick={() => setShowSendConfirm(true)} disabled={sendingOffer || !ready || !pipelineReady} className="w-full sm:w-auto">
            {sendingOffer ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {sendingOffer ? 'Sending…' : 'Send offer letter'}
          </Button>
        )}
      </div>
      {user?.role !== 'LOCAL_HR' && alreadyOffered && (
        <div className={`rounded-xl border p-4 space-y-2.5 ${offerWhatsAppFailed ? 'border-red-200 bg-red-50/80' : 'border-emerald-200 bg-emerald-50/80'}`}>
          <div className={`flex items-center gap-2 font-bold text-sm ${offerWhatsAppFailed ? 'text-red-950' : 'text-emerald-950'}`}>
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${offerWhatsAppFailed ? 'bg-red-600' : 'bg-emerald-600'}`} />
            Offer letter delivery status
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 font-semibold text-emerald-900 shadow-2xs">
              <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Offer email: Sent <strong className="text-foreground">{candidate.email || 'Candidate Email'}</strong>
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white font-semibold shadow-2xs ${offerWhatsAppFailed ? 'border border-red-200 text-red-900' : 'border border-emerald-200 text-emerald-900'}`}>
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${offerWhatsAppFailed ? 'text-red-600' : 'text-emerald-600'}`} />
              WhatsApp intimation: {offerWhatsAppSent ? 'Sent' : offerWhatsAppFailed ? 'Failed' : 'Pending'} <strong className="text-foreground">{candidate.phone}</strong>
            </span>
          </div>
        </div>
      )}
      {user?.role !== 'LOCAL_HR' && !alreadyOffered && blockers.length > 0 && (
        <div className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="font-semibold">Offer cannot be sent yet</p>
          <p>Missing: {blockers.join(', ')}</p>
        </div>
      )}

      <div className="relative min-h-[85vh]">
        {generatingPdf && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        )}
        {pdfUrl ? <PdfViewer url={pdfUrl} /> : <div className="min-h-[85vh] border border-border rounded-lg bg-surface" />}
      </div>

      <Modal isOpen={showWhatsAppConfirm && !offerWhatsAppSent} onClose={() => setShowWhatsAppConfirm(false)} title="Did you send the offer WhatsApp message?" size="sm">
        <div className="space-y-4 p-6">
          <p className="text-sm text-foreground">WhatsApp opened with the offer intimation ready. Confirm only if you actually sent it to {candidate.full_name}.</p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setShowWhatsAppConfirm(false)} disabled={confirmingWhatsApp}>Not yet</Button>
            <Button onClick={() => void confirmOfferWhatsAppSent()} isLoading={confirmingWhatsApp}>Yes, I sent it</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showWhatsAppFailure} onClose={() => setShowWhatsAppFailure(false)} title="WhatsApp intimation needs attention" size="sm">
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Offer letter email sent</p>
            <p className="mt-1">DoubleTick could not send the WhatsApp intimation.</p>
            {whatsAppFailure && <p className="mt-2 text-xs">Reason: {whatsAppFailure}</p>}
          </div>
          <p className="text-sm text-muted-foreground">Retry through DoubleTick, or open WhatsApp to send the prepared message manually.</p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setShowWhatsAppFailure(false)} disabled={resendingWhatsApp}>Close</Button>
            <Button variant="secondary" onClick={() => { setShowWhatsAppFailure(false); openOfferWhatsApp(); }} disabled={!candidate.phone || resendingWhatsApp}>
              <MessageSquare className="mr-2 h-4 w-4" /> Open WhatsApp
            </Button>
            <Button onClick={() => void retryOfferWhatsApp()} isLoading={resendingWhatsApp}>Retry via DoubleTick</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSendConfirm} onClose={() => setShowSendConfirm(false)} title="Send offer letter" description="Confirm the external communication before sending." size="sm">
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            Send the offer letter for <strong className="text-foreground">{candidate.full_name}</strong> to <strong className="text-foreground">{candidate.email}</strong>.
            The candidate will receive the PDF by email. If the address or package is wrong, edit the letter or correct the record before sending; an already sent offer is not withdrawn by this screen.
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setShowSendConfirm(false)}>Review again</Button>
            <Button onClick={() => { setShowSendConfirm(false); void handleSendOffer(); }} isLoading={sendingOffer}><Mail className="mr-2 h-4 w-4" /> Send offer letter</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit offer letter" size="md">
        <div className="p-4 space-y-3">
          {FIELD_LABELS.map(({ key, label, type }) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <Input
                type={type || 'text'}
                value={draft[key]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                error={Boolean(draftErrors[key])}
                className="mt-1"
              />
              {draftErrors[key] && <p className="text-xs text-danger mt-1">{draftErrors[key]}</p>}
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setFields(draft);
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
