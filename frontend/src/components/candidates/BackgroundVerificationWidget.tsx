import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { CheckCircle2, Save, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { updateCandidateRawData, updateCandidateStage } from '../../api/candidates';
import type { Candidate, PipelineStage } from '../../types';
import { extractError } from '../../lib/utils';

interface BackgroundVerificationWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function BackgroundVerificationWidget({ candidate, onUpdate }: BackgroundVerificationWidgetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Form State
  const [data, setData] = useState({
    locality: {
      panchayathName: '',
      councillorName: '',
      panchayathMemberName: '',
      contactNoCouncillor: '',
      contactNoMember: '',
      anyIssueUpdated: '' as 'Yes' | 'No' | '',
      anyIssueSpecify: '',
      policeCaseReported: '' as 'Yes' | 'No' | '',
      policeCaseSpecify: '',
      familyIssues: '' as 'Yes' | 'No' | '',
      familyIssuesSpecify: '',
      overallFeedbackLocality: '',
    },
    social: {
      facebookName: '',
      instagramName: '',
      politicalInterference: '' as 'Yes' | 'No' | '',
      politicalSide: '',
      sharedLikedPages: '',
      instagramFacebookFollowers: '',
      followingPages4Years: '',
      activeInSocialMedia: '' as 'Yes' | 'No' | '',
      overallFeedbackSocialMedia: '',
    },
    employer: {
      employerName: '',
      designation: '',
      periodOfEmploymentFrom: '',
      periodOfEmploymentTo: '',
      totalYearOfEmployment: '',
      contactedPersonName: '',
      contactedPersonDesignation: '',
      contactedPersonMobNo: '',
      employeeEmployerRapport: '',
      financialLoansTaken: '' as 'Yes' | 'No' | '',
      financialLoansSpecify: '',
      longLeavesTaken: '' as 'Yes' | 'No' | '',
      overallFeedbackEmployer: '',
    }
  });

  // Load existing data on mount
  useEffect(() => {
    if (candidate.profile?.raw_data?.bg_verification) {
      setData((prev) => ({
        ...prev,
        ...candidate.profile?.raw_data?.bg_verification
      }));
    }
  }, [candidate]);

  const handleChange = (category: 'locality' | 'social' | 'employer', field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      const currentRawData = candidate.profile?.raw_data || {};
      await updateCandidateRawData(candidate.id, {
        ...currentRawData,
        bg_verification: data
      });
      toast.success('Background verification progress saved');
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to save progress'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // First ensure it's saved
      const currentRawData = candidate.profile?.raw_data || {};
      await updateCandidateRawData(candidate.id, {
        ...currentRawData,
        bg_verification: data
      });
      // Then move stage
      await updateCandidateStage(candidate.id, 'APPLICATION' as PipelineStage, 'Background Verification completed.');
      toast.success('Background Verification completed successfully!');
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to complete verification'));
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-8 bg-surface border border-border p-8 rounded-xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground font-accent">Background Verification Form</h2>
          <p className="text-sm text-text-secondary mt-1">Fill out the verification details. This data will be printed on the final application form.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSaveProgress} isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" /> Save Progress
          </Button>
          <Button variant="primary" onClick={handleComplete} isLoading={isCompleting}>
            <FileCheck className="w-4 h-4 mr-2" /> Complete & Next
          </Button>
        </div>
      </div>

      <div className="space-y-12">
        {/* LOCALITY FEEDBACK */}
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">1. Locality Feedback</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of Panchayath / Muncipality / Corporation</label>
              <input type="text" value={data.locality.panchayathName} onChange={e => handleChange('locality', 'panchayathName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of the Councillor</label>
              <input type="text" value={data.locality.councillorName} onChange={e => handleChange('locality', 'councillorName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of Panchayath Member</label>
              <input type="text" value={data.locality.panchayathMemberName} onChange={e => handleChange('locality', 'panchayathMemberName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contact No (Councillor)</label>
              <input type="text" value={data.locality.contactNoCouncillor} onChange={e => handleChange('locality', 'contactNoCouncillor', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contact No (Member)</label>
              <input type="text" value={data.locality.contactNoMember} onChange={e => handleChange('locality', 'contactNoMember', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg mt-2">
              <div>
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any issue updated?</label>
                 <select value={data.locality.anyIssueUpdated} onChange={e => handleChange('locality', 'anyIssueUpdated', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                   <option value="">Select</option>
                   <option value="Yes">Yes</option>
                   <option value="No">No</option>
                 </select>
              </div>
              <div className="col-span-2">
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                 <input type="text" value={data.locality.anyIssueSpecify} onChange={e => handleChange('locality', 'anyIssueSpecify', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" disabled={data.locality.anyIssueUpdated !== 'Yes'} />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg">
              <div>
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any Police Case Reported?</label>
                 <select value={data.locality.policeCaseReported} onChange={e => handleChange('locality', 'policeCaseReported', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                   <option value="">Select</option>
                   <option value="Yes">Yes</option>
                   <option value="No">No</option>
                 </select>
              </div>
              <div className="col-span-2">
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                 <input type="text" value={data.locality.policeCaseSpecify} onChange={e => handleChange('locality', 'policeCaseSpecify', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" disabled={data.locality.policeCaseReported !== 'Yes'} />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg">
              <div>
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any Family Issues?</label>
                 <select value={data.locality.familyIssues} onChange={e => handleChange('locality', 'familyIssues', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                   <option value="">Select</option>
                   <option value="Yes">Yes</option>
                   <option value="No">No</option>
                 </select>
              </div>
              <div className="col-span-2">
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                 <input type="text" value={data.locality.familyIssuesSpecify} onChange={e => handleChange('locality', 'familyIssuesSpecify', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" disabled={data.locality.familyIssues !== 'Yes'} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Overall Feedback (Locality)</label>
              <textarea value={data.locality.overallFeedbackLocality} onChange={e => handleChange('locality', 'overallFeedbackLocality', e.target.value)} className="w-full min-h-[60px] bg-background border border-border rounded-lg p-2.5" />
            </div>
          </div>
        </section>

        {/* SOCIAL MEDIA EVALUATION */}
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">2. Social Media Evaluation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name in Facebook</label>
              <input type="text" value={data.social.facebookName} onChange={e => handleChange('social', 'facebookName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name in Instagram</label>
              <input type="text" value={data.social.instagramName} onChange={e => handleChange('social', 'instagramName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg mt-2">
              <div>
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Political Interference?</label>
                 <select value={data.social.politicalInterference} onChange={e => handleChange('social', 'politicalInterference', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                   <option value="">Select</option>
                   <option value="Yes">Yes</option>
                   <option value="No">No</option>
                 </select>
              </div>
              <div className="col-span-2">
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, which political side</label>
                 <input type="text" value={data.social.politicalSide} onChange={e => handleChange('social', 'politicalSide', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" disabled={data.social.politicalInterference !== 'Yes'} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">What are the kind of shared / liked pages</label>
              <input type="text" value={data.social.sharedLikedPages} onChange={e => handleChange('social', 'sharedLikedPages', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Who all are the followers in Instagram/Facebook</label>
              <input type="text" value={data.social.instagramFacebookFollowers} onChange={e => handleChange('social', 'instagramFacebookFollowers', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Past 4 years following pages</label>
              <input type="text" value={data.social.followingPages4Years} onChange={e => handleChange('social', 'followingPages4Years', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Is candidate active on social media?</label>
              <select value={data.social.activeInSocialMedia} onChange={e => handleChange('social', 'activeInSocialMedia', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Overall Feedback (Social Media)</label>
              <textarea value={data.social.overallFeedbackSocialMedia} onChange={e => handleChange('social', 'overallFeedbackSocialMedia', e.target.value)} className="w-full min-h-[60px] bg-background border border-border rounded-lg p-2.5" />
            </div>
          </div>
        </section>

        {/* FEEDBACK FROM PREVIOUS EMPLOYER */}
        <section>
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4">3. Feedback from Previous Employer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Employer Name</label>
              <input type="text" value={data.employer.employerName} onChange={e => handleChange('employer', 'employerName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Designation</label>
              <input type="text" value={data.employer.designation} onChange={e => handleChange('employer', 'designation', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div className="border border-border p-4 rounded-lg md:col-span-2 grid grid-cols-3 gap-4">
               <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Period From</label>
                  <input type="text" value={data.employer.periodOfEmploymentFrom} onChange={e => handleChange('employer', 'periodOfEmploymentFrom', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Period To</label>
                  <input type="text" value={data.employer.periodOfEmploymentTo} onChange={e => handleChange('employer', 'periodOfEmploymentTo', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Total Years</label>
                  <input type="text" value={data.employer.totalYearOfEmployment} onChange={e => handleChange('employer', 'totalYearOfEmployment', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
               </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name of Contacted Person</label>
              <input type="text" value={data.employer.contactedPersonName} onChange={e => handleChange('employer', 'contactedPersonName', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Designation of Contacted Person</label>
              <input type="text" value={data.employer.contactedPersonDesignation} onChange={e => handleChange('employer', 'contactedPersonDesignation', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contacted Person Mob No</label>
              <input type="text" value={data.employer.contactedPersonMobNo} onChange={e => handleChange('employer', 'contactedPersonMobNo', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Employee - Employer Rapport</label>
              <input type="text" value={data.employer.employeeEmployerRapport} onChange={e => handleChange('employer', 'employeeEmployerRapport', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-border p-4 rounded-lg mt-2">
              <div>
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Any Financial Loans Taken?</label>
                 <select value={data.employer.financialLoansTaken} onChange={e => handleChange('employer', 'financialLoansTaken', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                   <option value="">Select</option>
                   <option value="Yes">Yes</option>
                   <option value="No">No</option>
                 </select>
              </div>
              <div className="col-span-2">
                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2">If yes, specify</label>
                 <input type="text" value={data.employer.financialLoansSpecify} onChange={e => handleChange('employer', 'financialLoansSpecify', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" disabled={data.employer.financialLoansTaken !== 'Yes'} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Any long leaves taken?</label>
              <select value={data.employer.longLeavesTaken} onChange={e => handleChange('employer', 'longLeavesTaken', e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5">
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Overall Feedback (Employer)</label>
              <textarea value={data.employer.overallFeedbackEmployer} onChange={e => handleChange('employer', 'overallFeedbackEmployer', e.target.value)} className="w-full min-h-[60px] bg-background border border-border rounded-lg p-2.5" />
            </div>
          </div>
        </section>
      </div>
      
      <div className="border-t border-border pt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={handleSaveProgress} isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" /> Save Progress
        </Button>
        <Button variant="primary" onClick={handleComplete} isLoading={isCompleting}>
          <FileCheck className="w-4 h-4 mr-2" /> Complete Verification
        </Button>
      </div>

    </div>
  );
}
