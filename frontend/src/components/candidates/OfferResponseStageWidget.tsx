import { AlertCircle, CheckCircle2, Clock3, Mail, Send, XCircle } from 'lucide-react';
import { Button } from '../ui';
import type { Candidate } from '../../types';
import { sendOfferAcceptanceEmail, updateOfferResponse } from '../../api/candidates';
import { extractError } from '../../lib/utils';
import { defaultOfferFields, formatOfferJoinDate } from '../../lib/offerLetter';
import { useState } from 'react';
import { toast } from 'sonner';

type OfferResponse = 'ACCEPTED' | 'DECLINED';

interface OfferResponseStageWidgetProps {
  candidate: Candidate;
  onUpdate?: () => void;
  isReadOnly?: boolean;
}

export function OfferResponseStageWidget({ candidate, onUpdate, isReadOnly = false }: OfferResponseStageWidgetProps) {
  const currentResponse = candidate.offer_status === 'ACCEPTED' || candidate.offer_status === 'DECLINED'
    ? candidate.offer_status
    : null;
  const [selectedResponse, setSelectedResponse] = useState<OfferResponse | null>(currentResponse);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const offerFields = defaultOfferFields(candidate);
  const candidateName = offerFields.candidate_name || candidate.full_name || 'Candidate';
  const role = offerFields.designation || candidate.position_applied_for || candidate.department || 'the offered position';
  const joiningDate = offerFields.joining_date ? formatOfferJoinDate(offerFields.joining_date) : '';
  const acceptanceEmailStatus = String(candidate.profile?.raw_data?.offerAcceptanceEmailStatus || '');
  const acceptanceEmailError = String(candidate.profile?.raw_data?.offerAcceptanceEmailError || '');
  const acceptanceEmailSent = acceptanceEmailStatus === 'SENT';

  const sendAcceptanceEmail = async () => {
    if (!candidate.email) {
      toast.error('Candidate does not have an email address on file.');
      return;
    }
    if (!joiningDate) {
      toast.error('Add the joining date to the offer before sending joining instructions.');
      return;
    }

    setSendingEmail(true);
    try {
      await sendOfferAcceptanceEmail(candidate.id);
      toast.success('Joining instructions sent to the candidate.');
      onUpdate?.();
    } catch (error) {
      toast.error(extractError(error, 'Could not send the joining instructions email.'));
      onUpdate?.();
    } finally {
      setSendingEmail(false);
    }
  };

  const saveResponse = async () => {
    if (!selectedResponse) {
      toast.error('Select whether the candidate accepted or rejected the offer.');
      return;
    }
    if (selectedResponse === 'DECLINED' && !reason.trim()) {
      toast.error('Add a reason when the offer is rejected.');
      return;
    }

    setSaving(true);
    try {
      await updateOfferResponse(candidate.id, selectedResponse, reason.trim() || undefined);
      toast.success(`Offer marked as ${selectedResponse === 'ACCEPTED' ? 'accepted' : 'rejected'}.`);
      onUpdate?.();
    } catch (error) {
      toast.error(extractError(error, 'Could not save the offer response.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-info/20 bg-info/5 p-5 sm:p-6" aria-labelledby="offer-response-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-info">Offer response</p>
          <h2 id="offer-response-title" className="mt-1 text-xl font-bold text-text-primary">Record the candidate's decision</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            The home view will show this outcome to the whole HR team.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary">
          <Clock3 className="h-3.5 w-3.5" />
          {currentResponse ? `Currently ${currentResponse === 'ACCEPTED' ? 'accepted' : 'rejected'}` : 'Awaiting response'}
        </div>
      </div>

      {isReadOnly ? (
        <div className="mt-5 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary">
          Head Office HR records the offer response.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Offer response">
            <button
              type="button"
              aria-pressed={selectedResponse === 'ACCEPTED'}
              onClick={() => { setSelectedResponse('ACCEPTED'); setReason(''); }}
              className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 ${selectedResponse === 'ACCEPTED' ? 'border-success bg-success/10 text-success' : 'border-border bg-surface text-text-secondary hover:border-success/40 hover:text-success'}`}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Candidate accepted
            </button>
            <button
              type="button"
              aria-pressed={selectedResponse === 'DECLINED'}
              onClick={() => setSelectedResponse('DECLINED')}
              className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 ${selectedResponse === 'DECLINED' ? 'border-danger bg-danger/10 text-danger' : 'border-border bg-surface text-text-secondary hover:border-danger/40 hover:text-danger'}`}
            >
              <XCircle className="h-5 w-5 shrink-0" />
              Candidate rejected
            </button>
          </div>

          {selectedResponse === 'DECLINED' && (
            <div className="mt-4">
              <label htmlFor="offer-response-reason" className="form-label">Reason for rejection</label>
              <textarea
                id="offer-response-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Add a short reason for the record"
                className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm text-foreground focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
              />
            </div>
          )}

          <div className="mt-5 flex justify-end border-t border-info/15 pt-4">
            <Button onClick={() => void saveResponse()} isLoading={saving} disabled={!selectedResponse}>
              Save offer response
            </Button>
          </div>
        </>
      )}

      {candidate.offer_status === 'ACCEPTED' && (
        <div className="mt-6 rounded-xl border border-success/25 bg-success/5 p-5 sm:p-6" aria-labelledby="acceptance-email-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-success">
                <Mail className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Accepted offer email</p>
              </div>
              <h3 id="acceptance-email-title" className="mt-1 text-lg font-bold text-text-primary">Joining instructions</h3>
              <p className="mt-1 text-sm text-text-secondary">Send the document checklist from the approved acceptance template.</p>
            </div>
            <span className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${acceptanceEmailSent ? 'border-success/30 bg-success/10 text-success' : acceptanceEmailStatus === 'FAILED' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-border bg-surface text-text-secondary'}`}>
              {acceptanceEmailSent ? <CheckCircle2 className="h-3.5 w-3.5" /> : acceptanceEmailStatus === 'FAILED' ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
              {acceptanceEmailSent ? 'Email sent' : acceptanceEmailStatus === 'FAILED' ? 'Send failed' : 'Ready to send'}
            </span>
          </div>

          {acceptanceEmailStatus === 'FAILED' && acceptanceEmailError && (
            <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
              {acceptanceEmailError}
            </div>
          )}
          {!joiningDate && (
            <div className="mt-4 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
              Set the joining date in the offer-letter stage before sending this email.
            </div>
          )}

          <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">To</p>
            <p className="mt-1 font-medium text-text-primary">{candidate.email || 'Candidate email missing'}</p>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Subject</p>
            <p className="mt-1 font-semibold text-text-primary">Offer Acceptance Confirmation &amp; Documents Required for Joining</p>
            <div className="mt-4 space-y-3 border-t border-border pt-4 leading-6">
              <p>Dear {candidateName},</p>
              <p>We are pleased to confirm your acceptance of the employment offer for the position of <strong>{role}</strong> at Nippon Toyota.</p>
              <p>We look forward to welcoming you to our organization on your joining date, <strong>{joiningDate || 'joining date not set'}</strong>, at Nippon Toyota, Kalamassery.</p>
              <p><strong>Location:</strong> Nippon Toyota, Kalamassery - Google Maps<br /><strong>Reporting Location:</strong> 3rd Floor - Sales Training Room / HR Department</p>
              <p>Please carry the following documents and information with you on the day of joining:</p>
              <div>
                <p className="font-semibold text-text-primary">Documents to be Carried</p>
                <ul className="ml-5 list-disc">
                  <li>Passport-size photographs - 5 Nos. (white background; coat/blazer preferred)</li>
                  <li>Educational Certificate Copies - 1 Set</li>
                  <li>Experience Certificates - 1 Copy Each, if applicable</li>
                  <li>ID Proof Copies - 4 Sets Each: Voter ID, Driving Licence, Passport, PAN Card, Aadhaar Card</li>
                </ul>
                <p className="mt-3 font-semibold text-text-primary">Family Member Details</p>
                <ul className="ml-5 list-disc"><li>Date of Birth of family members</li><li>Aadhaar Number of family members</li></ul>
                <p className="mt-3 font-semibold text-text-primary">Family Documents</p>
                <ul className="ml-5 list-disc"><li>Family photograph</li><li>Ration Card copy</li></ul>
                <p className="mt-3 font-semibold text-text-primary">PF &amp; ESI Details</p>
                <ul className="ml-5 list-disc"><li>PF UAN Number</li><li>ESI Number, if available</li></ul>
              </div>
              <p>For further details or any queries, please feel free to contact us at 8606986060.</p>
              <p>Best regards,<br />Mathew Paul<br />Talent Acquisition Team<br />Nippon Toyota<br />8606986060, 9544286099</p>
            </div>
          </div>

          {isReadOnly ? (
            <p className="mt-4 text-xs font-medium text-text-secondary">Head Office HR sends this acceptance email.</p>
          ) : (
            <div className="mt-5 flex justify-end border-t border-success/15 pt-4">
              <Button onClick={() => void sendAcceptanceEmail()} isLoading={sendingEmail} disabled={!candidate.email || !joiningDate}>
                <Send className="mr-2 h-4 w-4" />
                {acceptanceEmailSent ? 'Send again' : 'Send joining instructions'}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
