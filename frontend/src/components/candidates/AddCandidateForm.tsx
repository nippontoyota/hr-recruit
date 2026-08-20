import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal } from '../ui';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { createCandidate } from '../../api/candidates';
import { NIPPON_BRANCHES, CANDIDATE_DEPARTMENTS } from '../../types';
import { useAuth } from '../../auth';
import { validateBasicCandidateForm } from '../../lib/validatePreForm';
import { SHOW_DEV_DUMMY, nextDummyCandidate } from '../../lib/devDummyData';
import { SOURCE_OPTIONS, SOURCE_REFERENCE_LABELS, sourceNeedsReference } from '../../lib/candidateSources';

const OPENING_TYPES = ['New opening', 'Replacement'] as const;


interface AddCandidateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCandidateForm({ isOpen, onClose, onSuccess }: AddCandidateFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('Fresher');
  const [source, setSource] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [department, setDepartment] = useState('');
  const [openingType, setOpeningType] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string, originalId: string | null } | null>(null);

  const handleFillDummy = () => {
    const dummy = nextDummyCandidate();
    setFullName(dummy.fullName);
    setPhone(dummy.phone);
    setExperience(dummy.experience);
    setSource('OTHER');
    setSourceReference('');
    setDepartment(dummy.department);
    setOpeningType('New opening');
    setBranchLocation(user?.branch_location || dummy.branch);
    setFormError('');
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setExperience('Fresher');
    setSource('');
    setSourceReference('');
    setDepartment('');
    setOpeningType('');
    setBranchLocation('');
    setFormError('');
    setDuplicateWarning(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateBasicCandidateForm({
      fullName,
      phone,
      email: '',
      emailRequired: false,
      experience,
      source,
      sourceRequired: true,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!department.trim()) {
      setFormError('Department is required.');
      return;
    }
    if (!openingType) {
      setFormError('Opening type is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const normalizedPhone = phone;
      const newCandidate = await createCandidate({
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: undefined,
        source,
        source_reference: sourceNeedsReference(source)
          ? sourceReference.trim() || undefined
          : undefined,
        experience: experience,
        department: department.trim() || undefined,
        opening_type: openingType,
        branch_location: branchLocation || undefined,
      } as any);

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
      setFormError(typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : (err?.response?.data?.detail?.[0]?.msg || err.message || 'Failed to create candidate.'));
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
            <label htmlFor="candidate-full-name" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Full Name <span className="text-text-primary">*</span>
            </label>
            <Input
              id="candidate-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="candidate-phone" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Phone Number <span className="text-text-primary">*</span>
            </label>
            <Input
              id="candidate-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              inputMode="numeric"
              maxLength={10}
            />
          </div>
          
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="candidate-experience" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Experience <span className="text-text-primary">*</span>
            </label>
            <Select
              id="candidate-experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
            >
              <option value="Fresher">Fresher</option>
              <option value="Experienced">Experienced</option>
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="candidate-source" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Source <span className="text-text-primary">*</span>
            </label>
            <Select
              id="candidate-source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                if (!sourceNeedsReference(e.target.value)) {
                  setSourceReference('');
                }
              }}
              required
            >
              <option value="">Select Source</option>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="candidate-department" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Department <span className="text-text-primary">*</span>
            </label>
            <Select
              id="candidate-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            >
              <option value="" disabled>Select Department</option>
              {CANDIDATE_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="candidate-opening-type" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
              Opening Type <span className="text-text-primary">*</span>
            </label>
            <Select
              id="candidate-opening-type"
              value={openingType}
              onChange={(e) => setOpeningType(e.target.value)}
              required
            >
              <option value="">Select Opening Type</option>
              {OPENING_TYPES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </div>

          {sourceNeedsReference(source) && (
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="candidate-source-reference" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
                {SOURCE_REFERENCE_LABELS[source]}
              </label>
              <Input
                id="candidate-source-reference"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                maxLength={100}
                placeholder={source === 'REFERRAL' ? 'Employee or contact name' : 'LinkedIn, website, etc.'}
              />
            </div>
          )}

          {user?.role !== 'LOCAL_HR' && (
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="candidate-branch" className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
                Branch Location
              </label>
              <Select
                id="candidate-branch"
                value={branchLocation}
                onChange={(e) => setBranchLocation(e.target.value)}
              >
                <option value="">Select branch</option>
                {NIPPON_BRANCHES.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </Select>
            </div>
          )}

        </div>

        {formError && (
          <p className="text-xs text-text-primary font-bold text-center p-2 border border-dashed border-text-primary">{formError}</p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-border/40">
          {SHOW_DEV_DUMMY && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleFillDummy}
              disabled={isSubmitting}
              title="TEMPORARY — development only. Remove before production."
              className="mr-auto border border-dashed border-amber-500/60 text-amber-800"
            >
              Fill Dummy Data
            </Button>
          )}
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
