import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui';
import { AlertTriangle, Save, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { updateCandidateRawData, updateCandidateStage } from '../../api/candidates';
import { createInterviewer } from '../../api/settings';
import type { Candidate, PipelineStage } from '../../types';
import { extractError } from '../../lib/utils';
import { formatDate } from '../../lib/dateTime';
import { useAuth } from '../../auth';
import { SavedNamePicker } from './SavedNamePicker';
import {
  buildInitialBgData,
  validateBgVerification,
  getBgWarnings,
  type BgVerificationData,
} from '../../lib/bgVerification';
import { SHOW_DEV_DUMMY, dummyBgVerification } from '../../lib/devDummyData';


interface BackgroundVerificationWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
  navigateToStage?: (stage: PipelineStage) => void;
  isReadOnly?: boolean;
}

export function BackgroundVerificationWidget({
  candidate,
  onUpdate,
  navigateToStage,
  isReadOnly = false,
}: BackgroundVerificationWidgetProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [data, setData] = useState<BgVerificationData>(() => buildInitialBgData(candidate));

  const bgFinished = Boolean(data.meta.completedAt);
  const locked = isReadOnly;

  useEffect(() => {
    setData(buildInitialBgData(candidate));
  }, [candidate]);

  const warnings = useMemo(() => getBgWarnings(data), [data]);

  const handleChange = (
    category: 'locality' | 'social' | 'employer',
    field: string,
    value: string
  ) => {
    if (locked) return;
    setData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleSignatureChange = (field: 'checkedBy1' | 'checkedBy2', name: string) => {
    if (locked) return;
    setData((prev) => ({
      ...prev,
      signatures: {
        ...prev.signatures,
        [field]: { ...prev.signatures[field], name },
      },
    }));
  };

  const persistData = async (payload: BgVerificationData) => {
    const currentRawData = candidate.profile?.raw_data || {};
    await updateCandidateRawData(candidate.id, {
      ...currentRawData,
      bg_verification: payload,
    });
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      const branch = candidate.branch_location;
      const hrdName = data.signatures.checkedBy1.name.trim();
      const hrmName = data.signatures.checkedBy2.name.trim();
      if (hrdName || hrmName) {
        void Promise.allSettled([
          hrdName ? createInterviewer(hrdName, branch) : Promise.resolve(),
          hrmName ? createInterviewer(hrmName, branch) : Promise.resolve(),
        ]);
      }
      await persistData(data);
      toast.success(bgFinished ? 'Background verification changes saved' : 'Background verification progress saved');
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to save changes'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    const errors = validateBgVerification(data);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setIsCompleting(true);
    try {
      const branch = candidate.branch_location;
      const hrdName = data.signatures.checkedBy1.name.trim();
      const hrmName = data.signatures.checkedBy2.name.trim();

      // Fire-and-forget saving names in background without blocking completion
      if (hrdName || hrmName) {
        void Promise.allSettled([
          hrdName ? createInterviewer(hrdName, branch) : Promise.resolve(),
          hrmName ? createInterviewer(hrmName, branch) : Promise.resolve(),
        ]);
      }

      const completed: BgVerificationData = {
        ...data,
        meta: {
          ...data.meta,
          completedAt: new Date().toISOString(),
        },
        signatures: {
          ...data.signatures,
          preparedBy: {
            name: user?.full_name || '',
            role: 'HRD',
            userId: user?.id,
            at: new Date().toISOString(),
          },
        },
      };

      setData(completed);

      const currentRawData = candidate.profile?.raw_data || {};
      const updatedRawData = {
        ...currentRawData,
        bg_verification: completed,
      };

      // Atomic single request for saving BG verification data and transitioning stage
      await updateCandidateStage(
        candidate.id,
        'APPLICATION' as PipelineStage,
        'Background Verification completed.',
        updatedRawData
      );
      toast.success('Background Verification completed successfully!');
      if (navigateToStage) {
        navigateToStage('APPLICATION');
      }
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to complete verification'));
      setIsCompleting(false);
    }
  };

  const inputClass = (disabled?: boolean) =>
    `w-full bg-background border border-border rounded-lg p-2.5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  return (
    <div className="space-y-8 bg-surface border border-border p-8 rounded-xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground font-accent">Background Verification Form</h2>
          <p className="text-sm text-text-secondary mt-1">
            {locked
              ? 'This form is read-only after the candidate was sent to Head Office.'
              : bgFinished
              ? 'Verification completed. You can edit any details and save changes.'
              : 'Fill out the verification details. This data will be printed on the final application form.'}
          </p>
        </div>
        {!locked && (
          <div className="flex gap-3">
            {SHOW_DEV_DUMMY && (
              <Button
                type="button"
                variant="ghost"
                title="TEMPORARY — development only. Remove before production."
                className="border border-dashed border-amber-500/60 text-amber-800"
                onClick={() => {
                  setData((prev) =>
                    dummyBgVerification({
                      meta: {
                        totalWorkExperience: prev.meta.totalWorkExperience || '2 Years',
                        hasPreviousEmployment: true,
                      },
                    })
                  );
                }}
              >
                Fill Dummy Data
              </Button>
            )}
            {bgFinished ? (
              <Button variant="primary" onClick={handleSaveProgress} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleSaveProgress} isLoading={isSaving}>
                  <Save className="w-4 h-4 mr-2" /> Save Progress
                </Button>
                <Button variant="primary" onClick={handleComplete} isLoading={isCompleting}>
                  <FileCheck className="w-4 h-4 mr-2" /> Complete & Next
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Candidate header — auto-filled, read-only */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-background border border-border rounded-lg p-4 text-sm">
        <div>
          <span className="text-xs font-bold text-text-secondary uppercase">Candidate</span>
          <p className="font-medium">{candidate.full_name}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-text-secondary uppercase">Mobile</span>
          <p className="font-medium">{candidate.phone}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-text-secondary uppercase">Post Applied</span>
          <p className="font-medium">{candidate.position_applied_for || candidate.department || '—'}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-text-secondary uppercase">Branch</span>
          <p className="font-medium">{candidate.branch_location || '—'}</p>
        </div>
        <div className="md:col-span-2">
          <span className="text-xs font-bold text-text-secondary uppercase">Total Work Experience</span>
          <p className="font-medium">{data.meta.totalWorkExperience || '—'}</p>
        </div>
        {data.meta.completedAt && (
          <div className="md:col-span-2">
            <span className="text-xs font-bold text-text-secondary uppercase">Verification Date</span>
            <p className="font-medium">
              {formatDate(data.meta.completedAt)}
            </p>
          </div>
        )}
      </section>

      {warnings.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Review flags</p>
            <ul className="text-sm mt-1 list-disc list-inside">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-12">
        {/* LOCALITY FEEDBACK */}
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">1. Locality Feedback</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of Panchayath / Muncipality / Corporation</label>
              <input type="text" disabled={locked} value={data.locality.panchayathName} onChange={(e) => handleChange('locality', 'panchayathName', e.target.value)} className={inputClass(locked)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of the Councillor</label>
              <input type="text" disabled={locked} value={data.locality.councillorName} onChange={(e) => handleChange('locality', 'councillorName', e.target.value)} className={inputClass(locked)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of Panchayath Member</label>
              <input type="text" disabled={locked} value={data.locality.panchayathMemberName} onChange={(e) => handleChange('locality', 'panchayathMemberName', e.target.value)} className={inputClass(locked)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contact No (Councillor)</label>
              <input type="text" disabled={locked} value={data.locality.contactNoCouncillor} onChange={(e) => handleChange('locality', 'contactNoCouncillor', e.target.value)} className={inputClass(locked)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contact No (Member)</label>
              <input type="text" disabled={locked} value={data.locality.contactNoMember} onChange={(e) => handleChange('locality', 'contactNoMember', e.target.value)} className={inputClass(locked)} />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg mt-2">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any issue updated?</label>
                <select disabled={locked} value={data.locality.anyIssueUpdated} onChange={(e) => handleChange('locality', 'anyIssueUpdated', e.target.value)} className={inputClass(locked)}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                <input type="text" disabled={locked || data.locality.anyIssueUpdated !== 'Yes'} value={data.locality.anyIssueSpecify} onChange={(e) => handleChange('locality', 'anyIssueSpecify', e.target.value)} className={inputClass(locked || data.locality.anyIssueUpdated !== 'Yes')} />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any Police Case Reported?</label>
                <select disabled={locked} value={data.locality.policeCaseReported} onChange={(e) => handleChange('locality', 'policeCaseReported', e.target.value)} className={inputClass(locked)}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {data.locality.policeCaseReported === 'Yes' && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />Flag for HO review</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                <input type="text" disabled={locked || data.locality.policeCaseReported !== 'Yes'} value={data.locality.policeCaseSpecify} onChange={(e) => handleChange('locality', 'policeCaseSpecify', e.target.value)} className={inputClass(locked || data.locality.policeCaseReported !== 'Yes')} />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any Family Issues?</label>
                <select disabled={locked} value={data.locality.familyIssues} onChange={(e) => handleChange('locality', 'familyIssues', e.target.value)} className={inputClass(locked)}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {data.locality.familyIssues === 'Yes' && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />Flag for HO review</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                <input type="text" disabled={locked || data.locality.familyIssues !== 'Yes'} value={data.locality.familyIssuesSpecify} onChange={(e) => handleChange('locality', 'familyIssuesSpecify', e.target.value)} className={inputClass(locked || data.locality.familyIssues !== 'Yes')} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Overall Feedback (Locality)</label>
              <textarea disabled={locked} value={data.locality.overallFeedbackLocality} onChange={(e) => handleChange('locality', 'overallFeedbackLocality', e.target.value)} className={`${inputClass(locked)} min-h-[60px]`} />
            </div>
          </div>
        </section>

        {/* SOCIAL MEDIA EVALUATION */}
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">2. Social Media Evaluation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name in Facebook</label>
              <input type="text" disabled={locked} value={data.social.facebookName} onChange={(e) => handleChange('social', 'facebookName', e.target.value)} className={inputClass(locked)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name in Instagram</label>
              <input type="text" disabled={locked} value={data.social.instagramName} onChange={(e) => handleChange('social', 'instagramName', e.target.value)} className={inputClass(locked)} />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg mt-2">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Political Interference?</label>
                <select disabled={locked} value={data.social.politicalInterference} onChange={(e) => handleChange('social', 'politicalInterference', e.target.value)} className={inputClass(locked)}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {data.social.politicalInterference === 'Yes' && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />Flag for HO review</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, which political side</label>
                <input type="text" disabled={locked || data.social.politicalInterference !== 'Yes'} value={data.social.politicalSide} onChange={(e) => handleChange('social', 'politicalSide', e.target.value)} className={inputClass(locked || data.social.politicalInterference !== 'Yes')} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">What are the kind of shared / liked pages</label>
              <input type="text" disabled={locked} value={data.social.sharedLikedPages} onChange={(e) => handleChange('social', 'sharedLikedPages', e.target.value)} className={inputClass(locked)} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Who all are the followers in Instagram/Facebook</label>
              <input type="text" disabled={locked} value={data.social.instagramFacebookFollowers} onChange={(e) => handleChange('social', 'instagramFacebookFollowers', e.target.value)} className={inputClass(locked)} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Past 4 years following pages</label>
              <input type="text" disabled={locked} value={data.social.followingPages4Years} onChange={(e) => handleChange('social', 'followingPages4Years', e.target.value)} className={inputClass(locked)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Is candidate active on social media?</label>
              <select disabled={locked} value={data.social.activeInSocialMedia} onChange={(e) => handleChange('social', 'activeInSocialMedia', e.target.value)} className={inputClass(locked)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Overall Feedback (Social Media)</label>
              <textarea disabled={locked} value={data.social.overallFeedbackSocialMedia} onChange={(e) => handleChange('social', 'overallFeedbackSocialMedia', e.target.value)} className={`${inputClass(locked)} min-h-[60px]`} />
            </div>
          </div>
        </section>

        {/* FEEDBACK FROM PREVIOUS EMPLOYER — only when the candidate reported prior work experience */}
        {data.meta.hasPreviousEmployment && (
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">3. Feedback from Previous Employer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Employer Name</label>
              <input type="text" disabled={locked} value={data.employer.employerName} onChange={(e) => handleChange('employer', 'employerName', e.target.value)} className={inputClass(locked)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Designation</label>
              <input type="text" disabled={locked} value={data.employer.designation} onChange={(e) => handleChange('employer', 'designation', e.target.value)} className={inputClass(locked)} />
            </div>

            <div className="border border-border p-4 rounded-lg md:col-span-2 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Period From</label>
                <input type="text" disabled={locked} value={data.employer.periodOfEmploymentFrom} onChange={(e) => handleChange('employer', 'periodOfEmploymentFrom', e.target.value)} className={inputClass(locked)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Period To</label>
                <input type="text" disabled={locked} value={data.employer.periodOfEmploymentTo} onChange={(e) => handleChange('employer', 'periodOfEmploymentTo', e.target.value)} className={inputClass(locked)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Total Years</label>
                <input type="text" disabled={locked} value={data.employer.totalYearOfEmployment} onChange={(e) => handleChange('employer', 'totalYearOfEmployment', e.target.value)} className={inputClass(locked)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of Contacted Person</label>
              <input type="text" disabled={locked} value={data.employer.contactedPersonName} onChange={(e) => handleChange('employer', 'contactedPersonName', e.target.value)} className={inputClass(locked)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Designation of Contacted Person</label>
              <input type="text" disabled={locked} value={data.employer.contactedPersonDesignation} onChange={(e) => handleChange('employer', 'contactedPersonDesignation', e.target.value)} className={inputClass(locked)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contacted Person Mob No</label>
              <input type="text" disabled={locked} value={data.employer.contactedPersonMobNo} onChange={(e) => handleChange('employer', 'contactedPersonMobNo', e.target.value)} className={inputClass(locked)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Employee - Employer Rapport</label>
              <input type="text" disabled={locked} value={data.employer.employeeEmployerRapport} onChange={(e) => handleChange('employer', 'employeeEmployerRapport', e.target.value)} className={inputClass(locked)} />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg mt-2">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any Financial Loans Taken?</label>
                <select disabled={locked} value={data.employer.financialLoansTaken} onChange={(e) => handleChange('employer', 'financialLoansTaken', e.target.value)} className={inputClass(locked)}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                <input type="text" disabled={locked || data.employer.financialLoansTaken !== 'Yes'} value={data.employer.financialLoansSpecify} onChange={(e) => handleChange('employer', 'financialLoansSpecify', e.target.value)} className={inputClass(locked || data.employer.financialLoansTaken !== 'Yes')} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Any long leaves taken?</label>
              <select disabled={locked} value={data.employer.longLeavesTaken} onChange={(e) => handleChange('employer', 'longLeavesTaken', e.target.value)} className={inputClass(locked)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Overall Feedback (Employer)</label>
              <textarea disabled={locked} value={data.employer.overallFeedbackEmployer} onChange={(e) => handleChange('employer', 'overallFeedbackEmployer', e.target.value)} className={`${inputClass(locked)} min-h-[60px]`} />
            </div>
          </div>
        </section>
        )}

        {/* SIGNATURES */}
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">
            {data.meta.hasPreviousEmployment ? '4. Sign-off' : '3. Sign-off'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="rounded-lg border border-border p-3">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Prepared By</label>
              <input
                type="text"
                disabled
                value={data.signatures.preparedBy?.name || (locked ? '' : user?.full_name || '')}
                className={inputClass(true)}
              />
              <p className="text-xs text-text-secondary mt-1">Auto-filled on completion</p>
            </div>
            <SavedNamePicker
              label="Checked By (HRD)"
              value={data.signatures.checkedBy1.name}
              onChange={(name) => handleSignatureChange('checkedBy1', name)}
              branch={candidate.branch_location}
              disabled={locked}
              addPlaceholder="Add HRD name"
            />
            <SavedNamePicker
              label="Checked By (HRM)"
              value={data.signatures.checkedBy2.name}
              onChange={(name) => handleSignatureChange('checkedBy2', name)}
              branch={candidate.branch_location}
              disabled={locked}
              addPlaceholder="Add HRM name"
            />
          </div>
        </section>
      </div>

      {!locked && (
        <div className="border-t border-border pt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleSaveProgress} isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" /> Save Progress
          </Button>
          <Button variant="primary" onClick={handleComplete} isLoading={isCompleting}>
            <FileCheck className="w-4 h-4 mr-2" /> Complete Verification
          </Button>
        </div>
      )}
    </div>
  );
}
