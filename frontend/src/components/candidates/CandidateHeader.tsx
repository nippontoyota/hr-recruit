import { useState } from 'react';
import { Clipboard, Phone, Mail, MapPin, Maximize2, Camera, User as UserIcon, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Candidate } from '../../types';
import { stageLabel } from '../../lib/stages';
import { getCandidateWorkState } from '../../lib/candidateWork';
import { uploadCandidatePhoto, updateCandidateIdentity } from '../../api/candidates';
import { extractError, cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Button, Modal, Input } from '../ui';

interface CandidateHeaderProps {
  candidate: Candidate;
  isReadOnly?: boolean;
  onUpdate?: () => void;
  actions?: ReactNode;
}

export function CandidateHeader({
  candidate,
  isReadOnly = false,
  onUpdate,
  actions,
}: CandidateHeaderProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(candidate.full_name);
  const [editPhone, setEditPhone] = useState(candidate.phone);
  const [editEmail, setEditEmail] = useState(candidate.email || '');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const workState = getCandidateWorkState(candidate);

  const openEditModal = () => {
    setEditName(candidate.full_name);
    setEditPhone(candidate.phone);
    setEditEmail(candidate.email || '');
    setShowEditModal(true);
  };

  const saveIdentity = async () => {
    const name = editName.trim();
    const phone = editPhone.trim();
    const email = editEmail.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (!phone) {
      toast.error('Phone number is required');
      return;
    }
    setSavingIdentity(true);
    try {
      await updateCandidateIdentity(candidate.id, name, phone, email || undefined);
      toast.success('Candidate details updated');
      setShowEditModal(false);
      onUpdate?.();
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to update candidate details'));
    } finally {
      setSavingIdentity(false);
    }
  };

  const copyId = () => {
    void navigator.clipboard?.writeText(candidate.candidate_id);
    toast.success('Candidate ID copied');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadCandidatePhoto(candidate.id, file);
      toast.success('Photo updated successfully');
      onUpdate?.();
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to upload photo'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs" aria-labelledby="candidate-profile-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Avatar + Candidate Details */}
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            {/* Photo Avatar */}
            <button
              type="button"
              className={cn(
                "relative group h-20 w-16 sm:h-24 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/60 flex items-center justify-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs",
                "cursor-pointer hover:border-primary/60 transition-all hover:shadow-md"
              )}
              onClick={() => setShowPhotoModal(true)}
              title="Click to view or change candidate photo"
              aria-label={`View photo of ${candidate.full_name}`}
            >
              {candidate.profile?.photo_url ? (
                <img
                  src={candidate.profile.photo_url}
                  alt={candidate.full_name}
                  className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground group-hover:text-primary transition-colors">
                  {candidate.full_name.charAt(0)}
                </span>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-[1px] opacity-0 transition-opacity group-hover:opacity-100 p-1 text-center">
                <Maximize2 className="w-4 h-4 text-white drop-shadow-sm mb-0.5" />
                <span className="text-[9px] font-semibold text-white/95 leading-tight">View Photo</span>
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-[10px] font-medium">
                  Uploading...
                </div>
              )}
            </button>

          {/* Core Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <button
                type="button"
                onClick={copyId}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                title="Copy candidate ID"
              >
                <Clipboard className="h-3 w-3" /> {candidate.candidate_id}
              </button>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-foreground">{stageLabel(candidate.current_stage)}</span>
              {candidate.is_duplicate_flagged && (
                <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning border border-warning/30">
                  Duplicate
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 min-w-0">
              <h1 id="candidate-profile-title" className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary truncate">
                {candidate.full_name}
              </h1>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1 shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-white transition-colors border border-primary/30"
                  title="Edit candidate's name, phone, or email"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>

            <p className="mt-0.5 text-xs sm:text-sm text-text-secondary truncate">
              {candidate.position_applied_for || 'Position not specified'}
              {candidate.department ? ` · ${candidate.department}` : ''}
              {candidate.experience ? ` · ${candidate.experience}` : ''}
            </p>

            {/* Quick Contact & Info Tags */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-secondary">
              {candidate.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">+91 {candidate.phone}</span>
                </span>
              )}
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline truncate"
                >
                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{candidate.email}</span>
                </a>
              )}
              {candidate.branch_location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{candidate.branch_location}</span>
                </span>
              )}
            </div>

            {/* Actions Slot (Resume Button, Email button, Consideration Editor) */}
            {actions && (
              <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Bottom: Next Action */}
        {workState.next_action && (
          <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3 text-xs min-w-0">
            <span className="text-text-secondary shrink-0 font-medium">Next action:</span>
            <span className="font-semibold text-text-primary truncate">{workState.next_action}</span>
          </div>
        )}
      </section>

      {/* Enlarged Candidate Photo Modal */}
      <Modal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title="Candidate Photo"
        description={`${candidate.full_name} · ${candidate.position_applied_for || 'Applicant'}`}
        size="md"
      >
        <div className="flex flex-col">
          {/* Main Image Preview Area */}
          <div className="relative flex items-center justify-center min-h-[320px] max-h-[62vh] p-6 bg-slate-950/5 dark:bg-slate-950/40 border-b border-border/70 overflow-hidden">
            {candidate.profile?.photo_url ? (
              <img
                src={candidate.profile.photo_url}
                alt={candidate.full_name}
                className="max-h-[52vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-slate-900/10 bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 rounded-2xl bg-muted/80 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground mb-3">
                  <UserIcon className="w-12 h-12 stroke-[1.5]" />
                </div>
                <p className="text-sm font-semibold text-foreground">No photo uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Upload a formal portrait photo for this candidate's profile.
                </p>
              </div>
            )}
          </div>

          {/* Modal Action Bar */}
          <div className="p-4 sm:p-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface">
            <div className="text-xs text-muted-foreground">
              <span>Supported formats: JPG, PNG, WebP (Max 5MB)</span>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPhotoModal(false)}
              >
                Close
              </Button>

              {!isReadOnly && (
                <>
                  <input
                    type="file"
                    id="candidate-modal-photo-input"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    disabled={uploadingPhoto}
                    isLoading={uploadingPhoto}
                    onClick={() => document.getElementById('candidate-modal-photo-input')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1.5" />
                    {candidate.profile?.photo_url ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Candidate Identity Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Candidate Details"
        description="Correct the name, phone, or email captured when this candidate was first added."
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="edit-candidate-name" className="form-label">Full Name</label>
            <Input
              id="edit-candidate-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={255}
            />
          </div>
          <div>
            <label htmlFor="edit-candidate-phone" className="form-label">Phone Number</label>
            <Input
              id="edit-candidate-phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              maxLength={20}
            />
          </div>
          <div>
            <label htmlFor="edit-candidate-email" className="form-label">Email</label>
            <Input
              id="edit-candidate-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveIdentity} isLoading={savingIdentity}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
