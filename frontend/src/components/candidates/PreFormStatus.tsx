import { useState, useRef, useEffect } from 'react';
import { usePrint } from '../../hooks/usePrint';
import { Button, Modal } from '../ui';
import { CheckCircle2, Pencil, Printer, RefreshCw, Link } from 'lucide-react';
import type { Candidate } from '../../types';
import { toast } from 'sonner';
import { updateCandidateRawData, sendPreForm, uploadCandidatePhoto, uploadCandidateResume } from '../../api/candidates';
import { WhatsAppPreviewPanel } from './WhatsAppPreviewPanel';
import { InterviewApplicationFormDocument } from './InterviewApplicationFormDocument';
import { EditableApplicationFormDocument } from './EditableApplicationFormDocument';
import { cn, extractError, copyTextToClipboard } from '../../lib/utils';
import { formatDate, formatDateTime } from '../../lib/dateTime';

interface PreFormStatusProps {
  candidate: Candidate;
  onUpdate?: () => void;
  isReadOnly?: boolean;
}

export function PreFormStatus({ candidate, onUpdate, isReadOnly = false }: PreFormStatusProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint({
    contentRef: componentRef,
    documentTitle: `ApplicationForm_${candidate.full_name}`,
    pageStyle: `@page { size: A4 portrait; margin: 0; } html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .css-sheet, .iaf-sheet, .iaf-page { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; max-height: 297mm !important; box-sizing: border-box !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; border: none !important; }`,
  });

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const status = candidate.pre_form_status || 'NOT_SENT';
  const [localRawData, setLocalRawData] = useState<Record<string, unknown>>(candidate.profile?.raw_data ?? {});
  
  useEffect(() => {
    setLocalRawData(candidate.profile?.raw_data ?? {});
  }, [candidate.profile?.raw_data]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async (
    updatedRawData: Record<string, unknown>,
    newPhotoFile?: File,
    newResumeFile?: File
  ) => {
    try {
      setIsSaving(true);
      if (newPhotoFile) {
        toast.loading('Uploading candidate photo...', { id: 'save-flow' });
        await uploadCandidatePhoto(candidate.id, newPhotoFile);
      }
      if (newResumeFile) {
        toast.loading('Uploading candidate resume...', { id: 'save-flow' });
        await uploadCandidateResume(candidate.id, newResumeFile);
      }
      toast.loading('Saving application form details...', { id: 'save-flow' });
      await updateCandidateRawData(candidate.id, updatedRawData);
      toast.success('Application form updated successfully!', { id: 'save-flow' });
      setLocalRawData({ ...updatedRawData });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to update application form'), { id: 'save-flow' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'SUBMITTED') {
    return (
      <div className="py-6 w-full print-container">
        {/* View Mode Header */}
        {!isEditing && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 no-print">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="w-7 h-7 text-success shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground">Interview Application Form</h3>
                <p className="text-sm text-text-secondary">Filled by the candidate</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                className="h-8.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold shadow-2xs"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print
              </Button>
              {!isReadOnly && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEditToggle}
                  className="h-8.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-bold shadow-2xs"
                >
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Edit Form
                </Button>
              )}
            </div>
          </div>
        )}

        {/* In-Place Interactive Form Editor */}
        {isEditing ? (
          <div className="iaf-screen-wrap">
            <div className="w-[210mm] mx-auto">
              <EditableApplicationFormDocument
                candidate={candidate}
                onSave={handleSave}
                onCancel={handleEditToggle}
                isSaving={isSaving}
              />
            </div>
          </div>
        ) : (
          <div className="iaf-screen-wrap">
            <div ref={componentRef} className="w-[210mm] mx-auto">
              <InterviewApplicationFormDocument candidate={candidate} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto w-full space-y-6">
      <div className="py-2">
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Candidate form</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {status === 'EXPIRED'
                ? 'This form link has expired. Generate a new link and send it to the candidate.'
                : status === 'SENT' || status === 'VIEWED'
                ? 'Call letter issued, waiting for candidate response.'
                : status === 'NOT_SENT' && candidate.share_url
                ? 'Link generated. Send via WhatsApp or DoubleTick to issue the call letter.'
                : 'Call letter to be sent.'}
            </p>
          </div>
        </div>

        {candidate.share_url ? (
          <div className="space-y-3">
            <label className="form-label flex items-center gap-1.5">
              <Link className="w-4 h-4" />
              INITIAL REVIEW link
            </label>
            <div className="flex items-center gap-2 w-full bg-background border border-border p-1.5 rounded-xl">
              <input
                type="text"
                readOnly
                value={candidate.share_url}
                className="flex-1 bg-transparent border-none px-3 text-sm font-mono text-muted-foreground focus:outline-none min-w-0"
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  const ok = await copyTextToClipboard(candidate.share_url || '');
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } else {
                    toast.error('Failed to copy link.');
                  }
                }}
                className="h-9 px-4 shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            {candidate.pre_form_sent_at && (
              <p className="text-xs text-muted-foreground">
                Sent {formatDateTime(candidate.pre_form_sent_at)}
                {candidate.pre_form_expires_at && status !== 'EXPIRED' && (
                  <> · Expires {formatDate(candidate.pre_form_expires_at)}</>
                )}
              </p>
            )}
            {status === 'EXPIRED' && candidate.pre_form_expires_at && (
              <p className="text-sm text-danger">
                Expired on {formatDate(candidate.pre_form_expires_at)}.
                Resend to issue a new 3-day link.
              </p>
            )}
            {!isReadOnly && (status === 'SENT' || status === 'VIEWED' || status === 'EXPIRED') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowResendModal(true)}
                className="w-fit gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {status === 'EXPIRED' ? 'Resend form' : 'Resend Link'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Form link will appear here.</p>
            {!isReadOnly && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={isGeneratingLink}
              onClick={async () => {
                try {
                  setIsGeneratingLink(true);
                  await sendPreForm(candidate.id);
                  toast.success('Form link generated successfully');
                  if (onUpdate) onUpdate();
                } catch (err: any) {
                  toast.error(err.response?.data?.detail || 'Failed to generate link');
                } finally {
                  setIsGeneratingLink(false);
                }
              }}
              className="w-fit gap-2"
            >
              <Link className="w-3.5 h-3.5" /> Generate Link
            </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground text-center">
        Responses will appear here automatically once the candidate submits the form.
      </div>

      <Modal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        title="Resend Candidate Form Link"
        size="lg"
      >
        <div className="flex justify-center p-6 bg-background h-[75vh] overflow-y-auto">
          <WhatsAppPreviewPanel 
            candidate={candidate}
            onUpdate={onUpdate}
            className="!w-full border-none bg-transparent" 
          />
        </div>
      </Modal>
    </div>
  );
}
