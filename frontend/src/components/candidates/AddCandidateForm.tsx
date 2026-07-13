import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal } from '../ui';
import { UploadCloud, AlertTriangle, ArrowRight } from 'lucide-react';
import { createCandidate, uploadResume } from '../../api/candidates';
import { NIPPON_BRANCHES } from '../../types';

interface AddCandidateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCandidateForm({ isOpen, onClose, onSuccess }: AddCandidateFormProps) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');
  const [position, setPosition] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string, originalId: string | null } | null>(null);

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setSource('');
    setSourceDetails('');
    setPosition('');
    setBranchLocation('');
    setResumeFile(null);
    setFormError('');
    setDuplicateWarning(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !position.trim()) {
      setFormError('Name, Phone, and Position are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const newCandidate = await createCandidate({
        full_name: fullName,
        phone: phone,
        email: email || undefined,
        source: source || 'Unknown',
        source_reference: sourceDetails || undefined,
        position_applied_for: position,
        branch_location: branchLocation || undefined,
      } as any);

      if (resumeFile) {
        await uploadResume(newCandidate.id, resumeFile);
      }

      if (newCandidate.is_duplicate_flagged) {
        setDuplicateWarning({
          id: newCandidate.id,
          originalId: newCandidate.duplicate_of_candidate_id || null
        });
      } else {
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to create candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (duplicateWarning) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Duplicate Detected" size="md">
        <div className="p-6 space-y-6">
          <div className="bg-background border-2 border-dashed border-text-primary p-4 rounded-none">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-text-primary mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Candidate Flagged as Duplicate</h3>
                <p className="text-sm text-text-secondary mt-2">
                  A candidate with this phone number or email already exists in the system. 
                  The new record has been created but flagged for review.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-border/40">
            {duplicateWarning.originalId && (
              <Button 
                variant="secondary" 
                onClick={() => {
                  handleClose();
                  navigate(`/candidates/${duplicateWarning.originalId}`);
                }}
              >
                View Original
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={() => {
                handleClose();
                onSuccess();
                navigate(`/candidates/${duplicateWarning.id}`);
              }}
            >
              Continue to New Record
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Candidate" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Full Name <span className="text-text-primary">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Phone Number <span className="text-text-primary">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Position Applied For <span className="text-text-primary">*</span>
            </label>
            <Select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            >
              <option value="">Select position</option>
              <option value="Sales">Sales</option>
              <option value="Accounts">Accounts</option>
              <option value="Marketing">Marketing</option>
              <option value="Service">Service</option>
              <option value="Insurance">Insurance</option>
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Branch Location
            </label>
            <Select
              value={branchLocation}
              onChange={(e) => setBranchLocation(e.target.value)}
            >
              <option value="">Select branch</option>
              {NIPPON_BRANCHES.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Source
            </label>
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Select source</option>
              <option value="WALK_IN">Walk-In</option>
              <option value="INDEED">Indeed</option>
              <option value="REFERRAL">Referral</option>
              <option value="CAMPUS">Campus</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Source Reference
            </label>
            <Input
              value={sourceDetails}
              onChange={(e) => setSourceDetails(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
              Upload Resume
            </label>
            <div className="border border-border p-3 bg-surface rounded-[10px] text-center relative hover:bg-muted/50 transition-colors flex items-center justify-center gap-3">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResumeFile(e.target.files[0]);
                  }
                }}
              />
              <UploadCloud className="w-5 h-5 text-text-secondary pointer-events-none" />
              <span className="text-sm font-medium text-text-primary pointer-events-none">
                {resumeFile ? resumeFile.name : 'Select PDF or Word resume'}
              </span>
            </div>
          </div>
        </div>

        {formError && (
          <p className="text-xs text-text-primary font-bold text-center p-2 border border-dashed border-text-primary">{formError}</p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-border/40">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
