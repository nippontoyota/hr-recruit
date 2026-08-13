import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, Share2, Briefcase } from 'lucide-react';
import { updateCandidateRawData } from '../../api/candidates';
import type { Candidate } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BackgroundVerificationWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
  isReadOnly?: boolean;
}

function YesNoToggle({ id, value, onChange, className }: { id: string, value: string, onChange: (val: string) => void, className?: string }) {
  return (
    <div className={cn("flex bg-slate-100 p-1.5 rounded-lg w-fit gap-2 border border-slate-200 relative", className)}>
      <button
        type="button"
        onClick={() => onChange('Yes')}
        className={cn(
          "relative px-7 py-2 text-sm font-bold rounded-md transition-colors duration-200 z-10",
          value === 'Yes' ? "text-white" : "text-slate-500 hover:text-slate-800"
        )}
      >
        {value === 'Yes' && (
          <motion.div
            layoutId={`pill-${id}`}
            className="absolute inset-0 bg-red-600 rounded-md -z-10 shadow-sm"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange('No')}
        className={cn(
          "relative px-7 py-2 text-sm font-bold rounded-md transition-colors duration-200 z-10",
          value === 'No' ? "text-white" : "text-slate-500 hover:text-slate-800"
        )}
      >
        {value === 'No' && (
          <motion.div
            layoutId={`pill-${id}`}
            className="absolute inset-0 bg-emerald-600 rounded-md -z-10 shadow-sm"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        No
      </button>
    </div>
  );
}

type StatusType = 'PENDING' | 'IN_PROGRESS' | 'VERIFIED';

export function BackgroundVerificationWidget({ candidate, isReadOnly }: BackgroundVerificationWidgetProps) {
  const [activeAccordion, setActiveAccordion] = useState<'locality' | 'social' | 'employer' | null>('locality');

  // Form State
  const [data, setData] = useState({
    locality: {
      panchayathName: '', councillorName: '', panchayathMemberName: '', contactNoCouncillor: '', contactNoMember: '',
      anyIssueUpdated: '' as 'Yes' | 'No' | '', anyIssueSpecify: '',
      policeCaseReported: '' as 'Yes' | 'No' | '', policeCaseSpecify: '',
      familyIssues: '' as 'Yes' | 'No' | '', familyIssuesSpecify: '',
      overallFeedbackLocality: '',
    },
    social: {
      facebookName: '', instagramName: '',
      politicalInterference: '' as 'Yes' | 'No' | '', politicalSide: '',
      sharedLikedPages: '', instagramFacebookFollowers: '', followingPages4Years: '',
      activeInSocialMedia: '' as 'Yes' | 'No' | '', overallFeedbackSocialMedia: '',
    },
    employer: {
      employerName: '', designation: '', periodOfEmploymentFrom: '', periodOfEmploymentTo: '', totalYearOfEmployment: '',
      contactedPersonName: '', contactedPersonDesignation: '', contactedPersonMobNo: '', employeeEmployerRapport: '',
      financialLoansTaken: '' as 'Yes' | 'No' | '', financialLoansSpecify: '',
      longLeavesTaken: '' as 'Yes' | 'No' | '', overallFeedbackEmployer: '',
    }
  });

  const isInitialMount = useRef(true);

  // Load existing data on mount
  useEffect(() => {
    if (candidate.profile?.raw_data?.bg_verification) {
      setData((prev) => ({
        ...prev,
        ...candidate.profile?.raw_data?.bg_verification
      }));
    }
  }, [candidate.profile?.raw_data?.bg_verification]);

  // Auto-Save Logic (Silent)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const currentRawData = candidate.profile?.raw_data || {};
        await updateCandidateRawData(candidate.id, {
          ...currentRawData,
          bg_verification: data
        });
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [data, candidate.id, candidate.profile?.raw_data]);

  const handleChange = (category: 'locality' | 'social' | 'employer', field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Status computations
  const getStatus = (categoryData: Record<string, string>, requiredKeys: string[]): StatusType => {
    const values = Object.values(categoryData).filter(v => v !== '');
    if (values.length === 0) return 'PENDING';
    const hasRequired = requiredKeys.every(k => categoryData[k] && categoryData[k] !== '');
    return hasRequired ? 'VERIFIED' : 'IN_PROGRESS';
  };

  const localityStatus = useMemo(() => getStatus(data.locality, ['panchayathName', 'overallFeedbackLocality']), [data.locality]);
  const socialStatus = useMemo(() => getStatus(data.social, ['activeInSocialMedia', 'overallFeedbackSocialMedia']), [data.social]);
  const employerStatus = useMemo(() => getStatus(data.employer, ['employerName', 'overallFeedbackEmployer']), [data.employer]);

  const StatusBadge = ({ status }: { status: StatusType }) => {
    if (status === 'VERIFIED') {
      return (
        <span className="text-emerald-700 bg-emerald-50 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
        </span>
      );
    }
    if (status === 'IN_PROGRESS') {
      return (
        <span className="text-blue-700 bg-blue-50 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          In Progress
        </span>
      );
    }
    return (
      <span className="text-slate-500 bg-slate-50 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto font-sans">
      {/* 1. LOCALITY FEEDBACK */}
      <div className={cn("bg-white border rounded-xl overflow-hidden transition-all duration-300", activeAccordion === 'locality' ? "border-blue-200 shadow-md ring-1 ring-blue-500/10" : "border-slate-200 shadow-sm")}>
        <button 
          type="button" 
          onClick={() => setActiveAccordion(activeAccordion === 'locality' ? null : 'locality')}
          className={cn("w-full flex items-center justify-between px-6 py-4 transition-all duration-300", activeAccordion === 'locality' ? "bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100" : "bg-white hover:bg-slate-50")}
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">1. Locality Check</h3>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={localityStatus} />
            <motion.div animate={{ rotate: activeAccordion === 'locality' ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </div>
        </button>
        
        <AnimatePresence initial={false}>
          {activeAccordion === 'locality' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <fieldset disabled={isReadOnly} className="contents group">
              <div className={cn("flex flex-col lg:flex-row bg-white", isReadOnly && "opacity-80")}>
                <div className="flex-1 p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Panchayath / Municipality / Corporation *</label>
                      <input type="text" value={data.locality.panchayathName} onChange={e => handleChange('locality', 'panchayathName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Councillor Name</label>
                      <input type="text" value={data.locality.councillorName} onChange={e => handleChange('locality', 'councillorName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Councillor Contact</label>
                      <input type="text" value={data.locality.contactNoCouncillor} onChange={e => handleChange('locality', 'contactNoCouncillor', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Member Name</label>
                      <input type="text" value={data.locality.panchayathMemberName} onChange={e => handleChange('locality', 'panchayathMemberName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Member Contact</label>
                      <input type="text" value={data.locality.contactNoMember} onChange={e => handleChange('locality', 'contactNoMember', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Police Case Reported?</label>
                      <YesNoToggle id="policeCaseReported" value={data.locality.policeCaseReported} onChange={(val) => handleChange('locality', 'policeCaseReported', val)} />
                      <AnimatePresence>
                        {data.locality.policeCaseReported === 'Yes' && (
                          <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                            <input type="text" placeholder="Specify details..." value={data.locality.policeCaseSpecify} onChange={e => handleChange('locality', 'policeCaseSpecify', e.target.value)} className="w-full bg-white border border-red-300 focus:border-red-500 rounded px-3 py-2 text-sm text-slate-900" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Any Issue Updated?</label>
                      <YesNoToggle id="anyIssueUpdated" value={data.locality.anyIssueUpdated} onChange={(val) => handleChange('locality', 'anyIssueUpdated', val)} />
                      <AnimatePresence>
                        {data.locality.anyIssueUpdated === 'Yes' && (
                          <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                            <input type="text" placeholder="Specify details..." value={data.locality.anyIssueSpecify} onChange={e => handleChange('locality', 'anyIssueSpecify', e.target.value)} className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded px-3 py-2 text-sm text-slate-900" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Family Issues?</label>
                      <YesNoToggle id="familyIssues" value={data.locality.familyIssues} onChange={(val) => handleChange('locality', 'familyIssues', val)} />
                      <AnimatePresence>
                        {data.locality.familyIssues === 'Yes' && (
                          <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                            <input type="text" placeholder="Specify details..." value={data.locality.familyIssuesSpecify} onChange={e => handleChange('locality', 'familyIssuesSpecify', e.target.value)} className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded px-3 py-2 text-sm text-slate-900" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                
                {/* RIGHT SIDEBAR: OVERALL FEEDBACK */}
                <div className="w-full lg:w-[320px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 flex flex-col">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Overall Feedback (Locality) *</label>
                  <textarea 
                    value={data.locality.overallFeedbackLocality} 
                    onChange={e => handleChange('locality', 'overallFeedbackLocality', e.target.value)} 
                    className="w-full flex-1 min-h-[120px] bg-white border border-slate-200 focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg p-4 text-sm text-slate-900 transition-all duration-200 shadow-sm resize-none" 
                    placeholder="Enter final locality findings..." 
                  />
                </div>
              </div>
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. SOCIAL MEDIA FEEDBACK */}
      <div className={cn("bg-white border rounded-xl overflow-hidden transition-all duration-300", activeAccordion === 'social' ? "border-blue-200 shadow-md ring-1 ring-blue-500/10" : "border-slate-200 shadow-sm")}>
        <button 
          type="button" 
          onClick={() => setActiveAccordion(activeAccordion === 'social' ? null : 'social')}
          className={cn("w-full flex items-center justify-between px-6 py-4 transition-all duration-300", activeAccordion === 'social' ? "bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100" : "bg-white hover:bg-slate-50")}
        >
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">2. Social Media Check</h3>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={socialStatus} />
            <motion.div animate={{ rotate: activeAccordion === 'social' ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </div>
        </button>
        
        <AnimatePresence initial={false}>
          {activeAccordion === 'social' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <fieldset disabled={isReadOnly} className="contents group">
              <div className={cn("flex flex-col lg:flex-row bg-white", isReadOnly && "opacity-80")}>
                <div className="flex-1 p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Active in Social Media? *</label>
                      <YesNoToggle id="activeInSocialMedia" value={data.social.activeInSocialMedia} onChange={(val) => handleChange('social', 'activeInSocialMedia', val)} />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Political Interference?</label>
                      <YesNoToggle id="politicalInterference" value={data.social.politicalInterference} onChange={(val) => handleChange('social', 'politicalInterference', val)} />
                      <AnimatePresence>
                        {data.social.politicalInterference === 'Yes' && (
                          <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                            <input type="text" placeholder="Specify political side..." value={data.social.politicalSide} onChange={e => handleChange('social', 'politicalSide', e.target.value)} className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded px-3 py-2 text-sm text-slate-900" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {data.social.activeInSocialMedia === 'Yes' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden md:col-span-2"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Facebook Profile Name</label>
                              <input type="text" value={data.social.facebookName} onChange={e => handleChange('social', 'facebookName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Instagram Profile Name</label>
                              <input type="text" value={data.social.instagramName} onChange={e => handleChange('social', 'instagramName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Shared / Liked Pages Types</label>
                              <input type="text" value={data.social.sharedLikedPages} onChange={e => handleChange('social', 'sharedLikedPages', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Notable Followers</label>
                              <input type="text" value={data.social.instagramFacebookFollowers} onChange={e => handleChange('social', 'instagramFacebookFollowers', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Past 4 Years Following Trends</label>
                              <input type="text" value={data.social.followingPages4Years} onChange={e => handleChange('social', 'followingPages4Years', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* RIGHT SIDEBAR: OVERALL FEEDBACK */}
                <div className="w-full lg:w-[320px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 flex flex-col">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Overall Feedback (Social Media) *</label>
                  <textarea 
                    value={data.social.overallFeedbackSocialMedia} 
                    onChange={e => handleChange('social', 'overallFeedbackSocialMedia', e.target.value)} 
                    className="w-full flex-1 min-h-[120px] bg-white border border-slate-200 focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg p-4 text-sm text-slate-900 transition-all duration-200 shadow-sm resize-none" 
                    placeholder="Enter final social media findings..." 
                  />
                </div>
              </div>
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. PREVIOUS EMPLOYER FEEDBACK */}
      <div className={cn("bg-white border rounded-xl overflow-hidden transition-all duration-300", activeAccordion === 'employer' ? "border-blue-200 shadow-md ring-1 ring-blue-500/10" : "border-slate-200 shadow-sm")}>
        <button 
          type="button" 
          onClick={() => setActiveAccordion(activeAccordion === 'employer' ? null : 'employer')}
          className={cn("w-full flex items-center justify-between px-6 py-4 transition-all duration-300", activeAccordion === 'employer' ? "bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100" : "bg-white hover:bg-slate-50")}
        >
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">3. Employer Check</h3>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={employerStatus} />
            <motion.div animate={{ rotate: activeAccordion === 'employer' ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </div>
        </button>
        
        <AnimatePresence initial={false}>
          {activeAccordion === 'employer' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <fieldset disabled={isReadOnly} className="contents group">
              <div className={cn("flex flex-col lg:flex-row bg-white", isReadOnly && "opacity-80")}>
                <div className="flex-1 p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Employer Name *</label>
                      <input type="text" value={data.employer.employerName} onChange={e => handleChange('employer', 'employerName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Designation</label>
                      <input type="text" value={data.employer.designation} onChange={e => handleChange('employer', 'designation', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 border-y border-gray-100">
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Period From</label>
                        <input type="text" value={data.employer.periodOfEmploymentFrom} onChange={e => handleChange('employer', 'periodOfEmploymentFrom', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" placeholder="MM/YYYY" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Period To</label>
                        <input type="text" value={data.employer.periodOfEmploymentTo} onChange={e => handleChange('employer', 'periodOfEmploymentTo', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" placeholder="MM/YYYY" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Total Years</label>
                        <input type="text" value={data.employer.totalYearOfEmployment} onChange={e => handleChange('employer', 'totalYearOfEmployment', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Contact Person Name</label>
                      <input type="text" value={data.employer.contactedPersonName} onChange={e => handleChange('employer', 'contactedPersonName', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Contact Person Designation</label>
                      <input type="text" value={data.employer.contactedPersonDesignation} onChange={e => handleChange('employer', 'contactedPersonDesignation', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Contact Person Phone</label>
                      <input type="text" value={data.employer.contactedPersonMobNo} onChange={e => handleChange('employer', 'contactedPersonMobNo', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">Employee - Employer Rapport</label>
                      <input type="text" value={data.employer.employeeEmployerRapport} onChange={e => handleChange('employer', 'employeeEmployerRapport', e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-200 shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Financial Loans Taken?</label>
                      <YesNoToggle id="financialLoansTaken" value={data.employer.financialLoansTaken} onChange={(val) => handleChange('employer', 'financialLoansTaken', val)} />
                      <AnimatePresence>
                        {data.employer.financialLoansTaken === 'Yes' && (
                          <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                            <input type="text" placeholder="Specify details..." value={data.employer.financialLoansSpecify} onChange={e => handleChange('employer', 'financialLoansSpecify', e.target.value)} className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded px-3 py-2 text-sm text-slate-900" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Long Leaves Taken?</label>
                      <YesNoToggle id="longLeavesTaken" value={data.employer.longLeavesTaken} onChange={(val) => handleChange('employer', 'longLeavesTaken', val)} />
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDEBAR: OVERALL FEEDBACK */}
                <div className="w-full lg:w-[320px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 flex flex-col">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-2">Overall Feedback (Employer) *</label>
                  <textarea 
                    value={data.employer.overallFeedbackEmployer} 
                    onChange={e => handleChange('employer', 'overallFeedbackEmployer', e.target.value)} 
                    className="w-full flex-1 min-h-[120px] bg-white border border-slate-200 focus:border-slate-400 focus:ring-0 hover:border-slate-300 rounded-lg p-4 text-sm text-slate-900 transition-all duration-200 shadow-sm resize-none" 
                    placeholder="Enter final employer findings..." 
                  />
                </div>
              </div>
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
