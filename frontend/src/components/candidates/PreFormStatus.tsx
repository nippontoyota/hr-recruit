import { useState, useEffect } from 'react';
import { Button, Input } from '../ui';
import { CheckCircle2, Pencil, Printer, Save, X } from 'lucide-react';
import type { Candidate } from '../../types';
import { toast } from 'sonner';
import { ResumeButton } from './ResumeButton';
import { updateCandidateRawData } from '../../api/candidates';

interface PreFormStatusProps {
  candidate: Candidate;
}

const HIDDEN_RAW_KEYS = new Set(['whatsapp_invite', 'resumeFileObject']);

function formatFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  return String(value);
}

export function PreFormStatus({ candidate }: PreFormStatusProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const status = candidate.pre_form_status || 'NOT_SENT';
  const [localRawData, setLocalRawData] = useState<Record<string, any>>(candidate.profile?.raw_data ?? {});
  
  useEffect(() => {
    setLocalRawData(candidate.profile?.raw_data ?? {});
  }, [candidate.profile?.raw_data]);

  const formEntries = Object.entries(localRawData).filter(
    ([key, value]) => !HIDDEN_RAW_KEYS.has(key) && value !== null && value !== undefined && typeof value !== 'object'
  );

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditData({ ...localRawData });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCandidateRawData(candidate.id, editData);
      toast.success('Application form updated successfully');
      setLocalRawData({ ...editData });
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update application form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (status === 'SUBMITTED') {
    return (
      <div className="py-8 w-full max-w-4xl mx-auto print-container">
        <div className="flex flex-col items-center mb-8 no-print">
          <CheckCircle2 className="w-10 h-10 text-success mb-3" />
          <h3 className="text-2xl font-bold text-foreground">Form Submitted</h3>
          <p className="text-text-secondary mt-1">Pre-interview responses from the candidate</p>
          {candidate.has_resume && (
            <div className="mt-4">
              <ResumeButton
                candidateId={candidate.id}
                candidateName={candidate.full_name}
                hasResume={candidate.has_resume}
              />
            </div>
          )}
        </div>

        {/* Print Header Visible Only on Print */}
        <div className="hidden print-header mb-8 pb-4 border-b border-border">
          <h2 className="text-2xl font-bold mb-2">Application Form</h2>
          <p className="text-text-secondary">Candidate: {candidate.full_name}</p>
          <p className="text-text-secondary text-sm">Submitted on: {candidate.pre_form_submitted_at ? new Date(candidate.pre_form_submitted_at).toLocaleDateString() : '—'}</p>
        </div>

        {formEntries.length > 0 ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden print-no-border">
            <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between no-print">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Application details</h4>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
                      <Printer className="w-4 h-4 mr-1.5" />
                      Print
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleEditToggle} className="h-8">
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleEditToggle} disabled={isSaving} className="h-8">
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                      <Save className="w-4 h-4 mr-1.5" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 p-6 print-grid">
              {formEntries.map(([key, value]) => (
                <div key={key} className="print-item">
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                    {formatFieldKey(key)}
                  </p>
                  {isEditing ? (
                    <Input 
                      value={editData[key] !== undefined && editData[key] !== null ? String(editData[key]) : ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm text-foreground font-medium break-words">{formatFieldValue(value)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : candidate.profile ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b border-border">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Profile summary</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-6">
              {[
                ['Current location', candidate.profile.current_location],
                ['Experience level', candidate.profile.experience_level],
                ['Total experience', candidate.profile.total_experience],
                ['Current company', candidate.profile.current_company],
                ['Expected salary', candidate.profile.expected_salary],
                ['Joining date', candidate.profile.joining_date],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">{label}</p>
                  <p className="text-sm text-foreground font-medium">{formatFieldValue(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-text-secondary text-center">Form responses are not available yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto w-full space-y-6">
      <div className="py-2">
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Pre-interview form</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {status === 'SENT'
                ? 'Link generated. Share via WhatsApp using the preview on the right.'
                : 'Waiting for form link generation.'}
            </p>
          </div>
        </div>

        {candidate.share_url ? (
          <div className="space-y-3">
            <label className="form-label flex items-center gap-1.5">
              <img src="/link-icon.png" alt="Link" className="w-4 h-4 object-contain" />
              Candidate form link
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
                onClick={() => {
                  navigator.clipboard.writeText(candidate.share_url!);
                  setCopied(true);
                  toast.success('Link copied');
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="h-9 px-4 shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            {candidate.pre_form_sent_at && (
              <p className="text-xs text-muted-foreground">
                Sent {new Date(candidate.pre_form_sent_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Form link will appear here after screening acceptance.</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground text-center">
        Responses will appear here automatically once the candidate submits the form.
      </div>
    </div>
  );
}
