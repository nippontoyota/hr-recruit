import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Camera, Plus, Trash2, Upload, FileText, Check, X, Save, AlertCircle } from 'lucide-react';
import type { Candidate } from '../../types';
import { Button, Input } from '../ui';
import { toast } from 'sonner';

interface EditableApplicationFormDocumentProps {
  candidate: Candidate;
  onSave: (updatedRawData: Record<string, unknown>, newPhotoFile?: File, newResumeFile?: File) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

interface FamilyRow {
  id: string;
  rel: string;
  name: string;
  age: string;
  occ: string;
  co: string;
  ph: string;
}

interface JobRow {
  id: string;
  co: string;
  pos: string;
  rep: string;
  from: string;
  to: string;
  sal: string;
  reason: string;
}

function InlineInput({
  value,
  onChange,
  placeholder = '',
  className = '',
  type = 'text',
}: {
  value: string | number | undefined | null;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value !== null && value !== undefined ? String(value) : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-[#eef5fc] hover:bg-[#e1edfa] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] border-b border-dashed border-[#1e3a5f] text-[#1e3a5f] font-semibold px-1 py-0.5 text-[11px] rounded-xs transition-colors ${className}`}
    />
  );
}

function InlineCellInput({
  value,
  onChange,
  placeholder = '',
  className = '',
}: {
  value: string | number | undefined | null;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value !== null && value !== undefined ? String(value) : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-[#f4f8fd] hover:bg-[#e7f1fc] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] border-0 text-[#1e3a5f] font-semibold px-1.5 py-1 text-[11px] rounded-xs transition-colors ${className}`}
    />
  );
}

function InteractiveTick({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
        checked ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
      }`}
    >
      <span className="inline-block w-3.5 h-3.5 border border-current rounded-xs text-[10px] leading-[12px] text-center font-bold">
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </button>
  );
}

function toDateInputValue(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('T')) return s.split('T')[0];
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    try {
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  return '';
}

export function EditableApplicationFormDocument({
  candidate,
  onSave,
  onCancel,
  isSaving,
}: EditableApplicationFormDocumentProps) {
  const initialRaw = (candidate.profile?.raw_data ?? {}) as Record<string, unknown>;
  const rawApplied = initialRaw.appliedDate || candidate.pre_form_submitted_at || candidate.applied_at || candidate.created_at;

  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    ...initialRaw,
    fullName: candidate.full_name,
    mobileNumber: initialRaw.contactNumber || initialRaw.mobileNumber || candidate.phone,
    emailId: initialRaw.emailId || candidate.email,
    positionAppliedFor: candidate.position_applied_for || initialRaw.positionAppliedFor || '',
    openingType: candidate.opening_type || initialRaw.openingType || 'New opening',
    appliedDate: toDateInputValue(rawApplied),
    dateOfBirth: toDateInputValue(initialRaw.dateOfBirth),
    expectedJoiningDate: toDateInputValue(initialRaw.expectedJoiningDate),
    declarationDate: toDateInputValue(initialRaw.declarationDate || rawApplied),
  }));

  // Files state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(candidate.profile?.photo_url || null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState<string>(candidate.resume_url ? 'Existing Resume' : '');
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Dynamic tables state
  const [familyList, setFamilyList] = useState<FamilyRow[]>(() => {
    const rawFam = Array.isArray(initialRaw.familyMembers) ? initialRaw.familyMembers : [];
    if (rawFam.length > 0) {
      return rawFam.map((f, i) => ({
        id: `fam-${i}-${Date.now()}`,
        rel: String(f.rel || f.relation || 'Relation'),
        name: String(f.name || ''),
        age: String(f.age || ''),
        occ: String(f.occ || f.occupation || ''),
        co: String(f.co || f.company || ''),
        ph: String(f.ph || f.phone || ''),
      }));
    }
    const defaultRows: FamilyRow[] = [
      { id: 'f1', rel: 'Father', name: String(initialRaw.fatherName || ''), age: String(initialRaw.fatherAge || ''), occ: String(initialRaw.fatherOccupation || ''), co: String(initialRaw.fatherCompany || ''), ph: String(initialRaw.fatherPhone || '') },
      { id: 'f2', rel: 'Mother', name: String(initialRaw.motherName || ''), age: String(initialRaw.motherAge || ''), occ: String(initialRaw.motherOccupation || ''), co: String(initialRaw.motherCompany || ''), ph: String(initialRaw.motherPhone || '') },
      { id: 'f3', rel: 'Spouse', name: String(initialRaw.spouseName || ''), age: String(initialRaw.spouseAge || ''), occ: String(initialRaw.spouseOccupation || ''), co: String(initialRaw.spouseCompany || ''), ph: String(initialRaw.spousePhone || '') },
    ];
    if (initialRaw.child1Name) {
      defaultRows.push({ id: 'c1', rel: String(initialRaw.child1Relation || 'Son / Daughter'), name: String(initialRaw.child1Name || ''), age: String(initialRaw.child1Age || ''), occ: String(initialRaw.child1Occupation || ''), co: String(initialRaw.child1Company || ''), ph: String(initialRaw.child1Phone || '') });
    }
    if (initialRaw.sibling1Name) {
      defaultRows.push({ id: 's1', rel: String(initialRaw.sibling1Relation || 'Brother / Sister'), name: String(initialRaw.sibling1Name || ''), age: String(initialRaw.sibling1Age || ''), occ: String(initialRaw.sibling1Occupation || ''), co: String(initialRaw.sibling1Company || ''), ph: String(initialRaw.sibling1Phone || '') });
    }
    return defaultRows;
  });

  const [jobList, setJobList] = useState<JobRow[]>(() => {
    const rawJobs = Array.isArray(initialRaw.previousJobs) ? initialRaw.previousJobs : [];
    if (rawJobs.length > 0) {
      return rawJobs.map((j, i) => ({
        id: `job-${i}-${Date.now()}`,
        co: String(j.company || j.co || ''),
        pos: String(j.position || j.pos || ''),
        rep: String(j.reporting || j.rep || ''),
        from: String(j.from || j.fromDate || ''),
        to: String(j.to || j.toDate || ''),
        sal: String(j.salary || j.sal || ''),
        reason: String(j.reason || ''),
      }));
    }
    const fallback: JobRow[] = [];
    if (initialRaw.prevCompanyName || initialRaw.prevPosition) {
      fallback.push({ id: 'j1', co: String(initialRaw.prevCompanyName || ''), pos: String(initialRaw.prevPosition || ''), rep: String(initialRaw.prev1Reporting || ''), from: String(initialRaw.prev1From || ''), to: String(initialRaw.prev1To || ''), sal: String(initialRaw.prev1Salary || ''), reason: String(initialRaw.prev1Reason || '') });
    }
    if (initialRaw.prev2Name || initialRaw.prev2Position) {
      fallback.push({ id: 'j2', co: String(initialRaw.prev2Name || ''), pos: String(initialRaw.prev2Position || ''), rep: String(initialRaw.prev2Reporting || ''), from: String(initialRaw.prev2From || ''), to: String(initialRaw.prev2To || ''), sal: String(initialRaw.prev2Salary || ''), reason: String(initialRaw.prev2Reason || '') });
    }
    return fallback;
  });

  const update = (key: string, val: unknown) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Resume must be under 15MB');
      return;
    }
    setResumeFile(file);
    setResumeName(file.name);
    toast.success(`Selected resume: ${file.name}`);
  };

  const handleAddFamilyRow = () => {
    setFamilyList((prev) => [
      ...prev,
      { id: `fam-${Date.now()}`, rel: 'Family Member', name: '', age: '', occ: '', co: '', ph: '' },
    ]);
  };

  const handleRemoveFamilyRow = (id: string) => {
    setFamilyList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddJobRow = () => {
    setJobList((prev) => [
      ...prev,
      { id: `job-${Date.now()}`, co: '', pos: '', rep: '', from: '', to: '', sal: '', reason: '' },
    ]);
  };

  const handleRemoveJobRow = (id: string) => {
    setJobList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRaw: Record<string, unknown> = {
      ...form,
      familyMembers: familyList.filter((f) => f.name.trim() !== ''),
      previousJobs: jobList.filter((j) => j.co.trim() !== '' || j.pos.trim() !== ''),
    };
    await onSave(finalRaw, photoFile || undefined, resumeFile || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Sticky Edit Toolbar */}
      <div className="sticky top-4 z-40 mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#1e3a5f] text-white rounded-xl shadow-lg border border-[#2d5282]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide">Editing Application Form</span>
          <span className="text-xs text-blue-200 hidden sm:inline">— Type directly onto the form sheets below</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="h-8.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20"
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="h-8.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm"
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving Changes...' : 'Save Application Changes'}
          </Button>
        </div>
      </div>

      <div className="iaf-doc space-y-6">
        {/* ══════════════════════════════════════════════════════════════════
            PAGE 1 OF 2 (EDITABLE)
           ══════════════════════════════════════════════════════════════════ */}
        <div className="iaf-page-wrap">
          <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.38] antialiased bg-white border border-[#1e3a5f]/40 shadow-md">
            <div>
              {/* Header Block */}
              <div className="flex items-start gap-3 mb-2">
                <img
                  src="/nippon-toyota-logo.png"
                  alt="Nippon Toyota"
                  className="h-[13mm] w-auto object-contain shrink-0 bg-transparent"
                />
                <div className="flex-1 text-center min-w-0 pt-0.5">
                  <div className="font-bold text-[15px] tracking-[0.04em] uppercase leading-tight text-[#1e3a5f]">
                    Nippon Motor Corporation Pvt Ltd
                  </div>
                  <div className="text-[10px] leading-tight mt-1 text-slate-600">
                    XIX/9C, Nippon Towers, NH-47, HMT Junction, Kalamassery P.O., Kochi – 683104
                  </div>
                </div>
                <div className="shrink-0 text-right pt-0.5">
                  <div className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-500">Candidate ID</div>
                  <div className="text-[14px] font-black tracking-wide text-[#1e3a5f] border border-[#1e3a5f] rounded px-2 py-0.5">{candidate.candidate_id}</div>
                </div>
              </div>
              <div className="iaf-rule border-t-2 border-[#1e3a5f] mb-0" />
              <div className="iaf-title font-bold text-[13px] uppercase tracking-[0.12em] text-center py-1.5 mb-2.5 border-x border-b border-[#1e3a5f]">
                Interview Application Form
              </div>

              {/* Opening & Basic Metadata */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-2.5">
                <tbody>
                  <tr>
                    <td colSpan={2} className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold mr-2">Type of opening:</span>
                      <InteractiveTick
                        label="New Opening"
                        checked={form.openingType === 'New opening'}
                        onToggle={() => update('openingType', 'New opening')}
                      />{' '}
                      <InteractiveTick
                        label="Replacement"
                        checked={form.openingType === 'Replacement'}
                        onToggle={() => update('openingType', 'Replacement')}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] w-[42%] py-1.5 px-2">
                      <span className="font-semibold">Mobile Number:</span>{' '}
                      <InlineInput
                        value={form.mobileNumber as string}
                        onChange={(v) => update('mobileNumber', v)}
                        className="w-36"
                        placeholder="Mobile number"
                      />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Date of Application:</span>{' '}
                      <InlineInput
                        type="date"
                        value={form.appliedDate as string}
                        onChange={(v) => update('appliedDate', v)}
                        className="w-32"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Position Applied For:</span>{' '}
                      <InlineInput
                        value={form.positionAppliedFor as string}
                        onChange={(v) => update('positionAppliedFor', v)}
                        className="w-36"
                        placeholder="Position"
                      />
                      {' · '}
                      <span className="font-semibold">Branch:</span>{' '}
                      <InlineInput
                        value={form.branchName as string}
                        onChange={(v) => update('branchName', v)}
                        className="w-24"
                        placeholder="Branch"
                      />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Position Suitable:</span>{' '}
                      <InlineInput
                        value={form.positionSuitable as string}
                        onChange={(v) => update('positionSuitable', v)}
                        className="w-40"
                        placeholder="Position suitable"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 1. Personal Data */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-2.5">
                <tbody>
                  <tr>
                    <td colSpan={2} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      1. Personal Data
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] p-2 align-top w-[78%]">
                      <div className="mb-1.5">
                        <span className="font-semibold">Full Name:</span>{' '}
                        <InlineInput
                          value={form.fullName as string}
                          onChange={(v) => update('fullName', v)}
                          className="min-w-[50%]"
                          placeholder="Candidate Full Name"
                        />
                        <div className="mt-1">
                          <span className="font-semibold">Name as per Aadhaar:</span>{' '}
                          <InlineInput
                            value={form.nameAadhaar as string}
                            onChange={(v) => update('nameAadhaar', v)}
                            className="min-w-[45%]"
                            placeholder="Name as per Aadhaar"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
                        <div>
                          <div className="font-bold text-[#1e3a5f] mb-1">Permanent Address</div>
                          <div className="py-0.5">House Name: <InlineInput value={form.permHouseName as string} onChange={(v) => update('permHouseName', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">Post Office: <InlineInput value={form.permPostOffice as string} onChange={(v) => update('permPostOffice', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">Landmark: <InlineInput value={form.permLandmark as string} onChange={(v) => update('permLandmark', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">District: <InlineInput value={form.permDistrict as string} onChange={(v) => update('permDistrict', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">Pincode: <InlineInput value={form.permPinCode as string} onChange={(v) => update('permPinCode', v)} className="w-[60%]" /></div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between font-bold text-[#1e3a5f] mb-1">
                            <span>Present Address</span>
                            <label className="text-[9.5px] font-normal cursor-pointer flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!!form.sameAsPermanent}
                                onChange={(e) => update('sameAsPermanent', e.target.checked)}
                              />
                              Same as Perm
                            </label>
                          </div>
                          <div className="py-0.5">House Name: <InlineInput value={form.presHouseName as string} onChange={(v) => update('presHouseName', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">Post Office: <InlineInput value={form.presPostOffice as string} onChange={(v) => update('presPostOffice', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">Landmark: <InlineInput value={form.presLandmark as string} onChange={(v) => update('presLandmark', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">District: <InlineInput value={form.presDistrict as string} onChange={(v) => update('presDistrict', v)} className="w-[60%]" /></div>
                          <div className="py-0.5">Pincode: <InlineInput value={form.presPinCode as string} onChange={(v) => update('presPinCode', v)} className="w-[60%]" /></div>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Age: <InlineInput value={form.age as string} onChange={(v) => update('age', v)} className="w-12" /></span>
                        <span>DOB: <InlineInput type="date" value={form.dateOfBirth as string} onChange={(v) => update('dateOfBirth', v)} className="w-28" /></span>
                        <span>Height: <InlineInput value={form.height as string} onChange={(v) => update('height', v)} className="w-14" /></span>
                        <span>Weight: <InlineInput value={form.weight as string} onChange={(v) => update('weight', v)} className="w-14" /></span>
                        <span>Blood Group: <InlineInput value={form.bloodGroup as string} onChange={(v) => update('bloodGroup', v)} className="w-14" /></span>
                        <span>Gender: <InlineInput value={form.gender as string} onChange={(v) => update('gender', v)} className="w-16" /></span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3">
                        <span>Marital Status: <InlineInput value={form.maritalStatus as string} onChange={(v) => update('maritalStatus', v)} className="w-24" /></span>
                        <span>Religion &amp; Caste: <InlineInput value={form.religionCaste as string} onChange={(v) => update('religionCaste', v)} className="w-36" /></span>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <span>Read: <InlineInput value={form.languagesRead as string} onChange={(v) => update('languagesRead', v)} className="w-[65%]" /></span>
                        <span>Write: <InlineInput value={form.languagesWrite as string} onChange={(v) => update('languagesWrite', v)} className="w-[65%]" /></span>
                        <span>Speak: <InlineInput value={form.languagesSpeak as string} onChange={(v) => update('languagesSpeak', v)} className="w-[65%]" /></span>
                        <span>Other: <InlineInput value={form.languagesOther as string} onChange={(v) => update('languagesOther', v)} className="w-[65%]" /></span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 items-center">
                        <span className="font-semibold">Valid Driving License:</span>
                        <InteractiveTick label="Yes" checked={form.hasValidDrivingLicense === true} onToggle={() => update('hasValidDrivingLicense', true)} />
                        <InteractiveTick label="No" checked={form.hasValidDrivingLicense === false} onToggle={() => update('hasValidDrivingLicense', false)} />
                        <span className="font-semibold ml-2">Confident to Drive:</span>
                        <InteractiveTick label="Yes" checked={form.confidentToDrive === true} onToggle={() => update('confidentToDrive', true)} />
                        <InteractiveTick label="No" checked={form.confidentToDrive === false} onToggle={() => update('confidentToDrive', false)} />
                      </div>
                    </td>

                    {/* Interactive Photo Slot */}
                    <td className="border border-[#1e3a5f] w-[22%] p-2 align-top text-center bg-slate-50">
                      <div className="text-[9.5px] font-bold uppercase mb-1 text-[#1e3a5f]">Photo</div>
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="group relative w-full aspect-[3/4] max-h-[50mm] mx-auto overflow-hidden border-2 border-dashed border-[#1e3a5f]/40 hover:border-[#1e3a5f] bg-white flex flex-col items-center justify-center cursor-pointer transition-colors"
                      >
                        {photoPreview ? (
                          <>
                            <img src={photoPreview} alt="Candidate" className="h-full w-full object-cover object-left-top" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                              <Camera className="w-5 h-5" />
                              <span>Change Photo</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-[#1e3a5f]">
                            <Camera className="w-6 h-6" />
                            <span className="text-[10px] font-bold">Upload Photo</span>
                          </div>
                        )}
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </div>
                      {photoFile && <span className="text-[9px] text-emerald-600 font-bold block mt-1">Photo Selected</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Educational Qualification */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-2.5">
                <thead>
                  <tr>
                    <td colSpan={6} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      Educational Qualification
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[18%] py-1 px-2">Qualification</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center py-1 px-2">School / College</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[16%] py-1 px-2">Course / Stream</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[10%] py-1 px-2">Marks %</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[12%] py-1 px-2">Year</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[12%] py-1 px-2">Mode</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1 px-2 font-semibold">10th</td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.class10School as string} onChange={(v) => update('class10School', v)} placeholder="School name" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.class10Board as string} onChange={(v) => update('class10Board', v)} placeholder="Board" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.class10Percentage as string} onChange={(v) => update('class10Percentage', v)} placeholder="%" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.class10PassingYear as string} onChange={(v) => update('class10PassingYear', v)} placeholder="YYYY" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.class10Mode as string} onChange={(v) => update('class10Mode', v)} placeholder="Regular" className="text-center" /></td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1 px-2 font-semibold">12th</td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.class12School as string} onChange={(v) => update('class12School', v)} placeholder="School name" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.class12Stream as string} onChange={(v) => update('class12Stream', v)} placeholder="Stream" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.class12Percentage as string} onChange={(v) => update('class12Percentage', v)} placeholder="%" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.class12PassingYear as string} onChange={(v) => update('class12PassingYear', v)} placeholder="YYYY" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.class12Mode as string} onChange={(v) => update('class12Mode', v)} placeholder="Regular" className="text-center" /></td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1 px-2 font-semibold">Graduation</td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.gradCollege as string} onChange={(v) => update('gradCollege', v)} placeholder="College name" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.gradCourse as string} onChange={(v) => update('gradCourse', v)} placeholder="B.Tech / B.Sc" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.gradPercentage as string} onChange={(v) => update('gradPercentage', v)} placeholder="%" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.gradPassingYear as string} onChange={(v) => update('gradPassingYear', v)} placeholder="YYYY" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.gradMode as string} onChange={(v) => update('gradMode', v)} placeholder="Regular" className="text-center" /></td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1 px-2 font-semibold">Post-Graduation</td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.postGradCollege as string} onChange={(v) => update('postGradCollege', v)} placeholder="College name" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.postGradCourse as string} onChange={(v) => update('postGradCourse', v)} placeholder="MBA / M.Tech" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.postGradPercentage as string} onChange={(v) => update('postGradPercentage', v)} placeholder="%" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.postGradPassingYear as string} onChange={(v) => update('postGradPassingYear', v)} placeholder="YYYY" className="text-center" /></td>
                    <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={form.postGradMode as string} onChange={(v) => update('postGradMode', v)} placeholder="Regular" className="text-center" /></td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Other Software / Certifications:</span>{' '}
                      <InlineInput value={form.softwareCerts as string} onChange={(v) => update('softwareCerts', v)} className="w-[60%]" placeholder="Certifications & Software" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Family Details (Dynamic) */}
              <div className="mb-2.5">
                <table className="w-full border-collapse border border-[#1e3a5f]">
                  <thead>
                    <tr>
                      <td colSpan={7} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                        Family Details
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[16%] py-1 px-2">Relationship</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center py-1 px-2">Name</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[8%] py-1 px-2">Age</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[16%] py-1 px-2">Occupation</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center py-1 px-2">Company / School</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[16%] py-1 px-2">Mobile</td>
                      <td className="border border-[#1e3a5f] w-8 text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    {familyList.map((row, idx) => (
                      <tr key={row.id}>
                        <td className="border border-[#1e3a5f] p-0.5">
                          <InlineCellInput
                            value={row.rel}
                            onChange={(v) => setFamilyList((prev) => prev.map((r, i) => (i === idx ? { ...r, rel: v } : r)))}
                            placeholder="Relation"
                          />
                        </td>
                        <td className="border border-[#1e3a5f] p-0.5">
                          <InlineCellInput
                            value={row.name}
                            onChange={(v) => setFamilyList((prev) => prev.map((r, i) => (i === idx ? { ...r, name: v } : r)))}
                            placeholder="Name"
                          />
                        </td>
                        <td className="border border-[#1e3a5f] p-0.5 text-center">
                          <InlineCellInput
                            value={row.age}
                            onChange={(v) => setFamilyList((prev) => prev.map((r, i) => (i === idx ? { ...r, age: v } : r)))}
                            placeholder="Age"
                            className="text-center"
                          />
                        </td>
                        <td className="border border-[#1e3a5f] p-0.5">
                          <InlineCellInput
                            value={row.occ}
                            onChange={(v) => setFamilyList((prev) => prev.map((r, i) => (i === idx ? { ...r, occ: v } : r)))}
                            placeholder="Occupation"
                          />
                        </td>
                        <td className="border border-[#1e3a5f] p-0.5">
                          <InlineCellInput
                            value={row.co}
                            onChange={(v) => setFamilyList((prev) => prev.map((r, i) => (i === idx ? { ...r, co: v } : r)))}
                            placeholder="Company / School"
                          />
                        </td>
                        <td className="border border-[#1e3a5f] p-0.5">
                          <InlineCellInput
                            value={row.ph}
                            onChange={(v) => setFamilyList((prev) => prev.map((r, i) => (i === idx ? { ...r, ph: v } : r)))}
                            placeholder="Phone"
                          />
                        </td>
                        <td className="border border-[#1e3a5f] p-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFamilyRow(row.id)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {familyList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-2.5 bg-slate-50 border border-[#1e3a5f] text-slate-500">
                          No family members listed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={handleAddFamilyRow}
                  className="mt-1 text-[11px] font-bold text-[#1e3a5f] hover:underline flex items-center gap-1 cursor-pointer py-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add Family Member Row
                </button>
              </div>

              {/* 2. Employment Record (Dynamic) */}
              <div className="mb-2.5">
                <table className="w-full border-collapse border border-[#1e3a5f]">
                  <thead>
                    <tr>
                      <td colSpan={9} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                        2. Employment Record
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold mr-2">Do you have experience before?</span>
                        <InteractiveTick
                          label="Yes"
                          checked={form.previousExperience === true || (jobList.length > 0 && form.previousExperience !== false)}
                          onToggle={() => {
                            update('previousExperience', true);
                            if (jobList.length === 0) {
                              handleAddJobRow();
                            }
                          }}
                        />
                        <InteractiveTick
                          label="No"
                          checked={form.previousExperience === false && jobList.length === 0}
                          onToggle={() => update('previousExperience', false)}
                        />
                      </td>
                      <td colSpan={3} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold">Total Experience:</span>{' '}
                        <InlineInput value={form.totalExperience as string} onChange={(v) => update('totalExperience', v)} className="w-20" placeholder="e.g. 2 yrs" />
                      </td>
                      <td colSpan={2} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold">Expected Salary:</span>{' '}
                        <InlineInput value={form.expectedSalary as string} onChange={(v) => update('expectedSalary', v)} className="w-20" placeholder="e.g. 25000" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[5%] py-1 px-1">#</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[22%] py-1 px-2">Previous Company</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[14%] py-1 px-2">Position</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[14%] py-1 px-2">Reporting Person</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[10%] py-1 px-1">From</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[10%] py-1 px-1">To</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center w-[10%] py-1 px-1">Salary</td>
                      <td className="border border-[#1e3a5f] font-semibold text-center py-1 px-2">Reason for Leaving</td>
                      <td className="border border-[#1e3a5f] w-8 text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    {jobList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-3 px-3 text-center bg-slate-50 border border-[#1e3a5f]">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-slate-500 font-medium">No previous jobs recorded (Fresher).</span>
                            <button
                              type="button"
                              onClick={handleAddJobRow}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-[#1e3a5f] hover:bg-[#2d5282] rounded shadow-xs cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Experience Row
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {jobList.map((job, idx) => (
                          <tr key={job.id}>
                            <td className="border border-[#1e3a5f] p-0.5 text-center text-xs font-semibold">{idx + 1}</td>
                            <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={job.co} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, co: v } : j)))} placeholder="Company & Location" /></td>
                            <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={job.pos} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, pos: v } : j)))} placeholder="Position" /></td>
                            <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={job.rep} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, rep: v } : j)))} placeholder="Reporting" /></td>
                            <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={job.from} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, from: v } : j)))} placeholder="From" className="text-center" /></td>
                            <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={job.to} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, to: v } : j)))} placeholder="To" className="text-center" /></td>
                            <td className="border border-[#1e3a5f] p-0.5 text-center"><InlineCellInput value={job.sal} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, sal: v } : j)))} placeholder="Salary" className="text-center" /></td>
                            <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={job.reason} onChange={(v) => setJobList((prev) => prev.map((j, i) => (i === idx ? { ...j, reason: v } : j)))} placeholder="Reason" /></td>
                            <td className="border border-[#1e3a5f] p-0.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveJobRow(job.id)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                title="Delete Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={9} className="p-1 text-center bg-slate-50 border border-[#1e3a5f]">
                            <button
                              type="button"
                              onClick={handleAddJobRow}
                              className="text-[11px] font-bold text-[#1e3a5f] hover:underline inline-flex items-center gap-1 cursor-pointer py-0.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> + Add Another Experience Row
                            </button>
                          </td>
                        </tr>
                      </>
                    )}
                    <tr>
                      <td colSpan={9} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold">How did you learn about opening:</span>{' '}
                        <InlineInput value={form.sourceOfOpening as string} onChange={(v) => update('sourceOfOpening', v)} className="w-[50%]" />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={9} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold">Referred by / Relative at Nippon:</span>{' '}
                        <InlineInput value={form.referredBy as string} onChange={(v) => update('referredBy', v)} className="w-[45%]" />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={9} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold">Preferred branches:</span>{' '}
                        <InlineInput value={form.preferredRegion as string} onChange={(v) => update('preferredRegion', v)} className="w-[50%]" />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={9} className="border border-[#1e3a5f] py-1.5 px-2">
                        <span className="font-semibold">Expected joining date:</span>{' '}
                        <InlineInput type="date" value={form.expectedJoiningDate as string} onChange={(v) => update('expectedJoiningDate', v)} className="w-32" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Page 1 Footer */}
            <div className="mt-3 pt-1.5 border-t border-dashed border-[#1e3a5f]/40 flex justify-between items-center text-[9.5px] font-semibold text-[#1e3a5f]/80">
              <span>Nippon Motor Corporation Pvt Ltd — Recruitment Confidential</span>
              <span className="font-bold tracking-wider uppercase">Page 1 of 2</span>
            </div>
          </section>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 2 OF 2 (EDITABLE)
           ══════════════════════════════════════════════════════════════════ */}
        <div className="iaf-page-wrap">
          <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.38] antialiased bg-white border border-[#1e3a5f]/40 shadow-md">
            <div>
              {/* Page 2 Top Header */}
              <div className="flex items-center justify-between pb-1.5 mb-3 border-b-2 border-[#1e3a5f]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/nippon-toyota-logo.png"
                    alt="Nippon Toyota"
                    className="h-[9mm] w-auto object-contain shrink-0 bg-transparent"
                  />
                  <span className="font-bold text-[13px] uppercase tracking-wider text-[#1e3a5f]">
                    Interview Application Form <span className="text-[10.5px] font-semibold text-slate-500">— (Page 2)</span>
                  </span>
                </div>
                <div className="text-right text-[11px] font-bold text-[#1e3a5f]">
                  <div>{candidate.full_name}</div>
                  <div className="text-[9.5px] font-medium text-slate-500">{candidate.candidate_id}</div>
                </div>
              </div>

              {/* Additional Information */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-3">
                <thead>
                  <tr>
                    <td colSpan={2} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      Additional Information
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#1e3a5f] w-[18%] font-semibold py-1.5 px-2">Achievements:</td>
                    <td className="border border-[#1e3a5f] p-1">
                      <InlineCellInput value={form.achievements as string} onChange={(v) => update('achievements', v)} placeholder="Key achievements" />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] font-semibold py-1.5 px-2">Hobbies:</td>
                    <td className="border border-[#1e3a5f] p-1">
                      <InlineCellInput value={form.hobbies as string} onChange={(v) => update('hobbies', v)} placeholder="Hobbies & interests" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 3. General Information */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-3">
                <thead>
                  <tr>
                    <td colSpan={2} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      3. General Information
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['a', 'Terminated / asked to resign from previous service?', 'prevTerminated'],
                    ['b', 'Suffered or suffering from any nervous breakdown / mental disorder?', 'nervousDisorder'],
                    ['c', 'Physical disabilities / defects / undergone any major operations?', 'physicalDisability'],
                    ['d', 'Defective vision / colour blindness / night blindness?', 'eyeVision'],
                    ['e', 'Convicted by any court of law of any crime other than minor traffic offence?', 'criminalConviction'],
                  ].map(([letter, label, key]) => (
                    <tr key={letter}>
                      <td className="border border-[#1e3a5f] py-1.5 px-2">{letter}. {label}</td>
                      <td className="border border-[#1e3a5f] w-[26%] text-center py-1.5 px-2">
                        <InteractiveTick label="Yes" checked={form[key] === true} onToggle={() => update(key, true)} />{' '}
                        <InteractiveTick label="No" checked={form[key] === false} onToggle={() => update(key, false)} />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Medical Remarks:</span>{' '}
                      <InlineInput value={form.medicalRemarks as string} onChange={(v) => update('medicalRemarks', v)} className="w-[70%]" placeholder="Remarks if any" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Reference */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-3">
                <thead>
                  <tr>
                    <td colSpan={4} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      Reference Details
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Name:</span> <InlineInput value={form.refName as string} onChange={(v) => update('refName', v)} className="w-28" />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Role:</span> <InlineInput value={form.refRole as string} onChange={(v) => update('refRole', v)} className="w-24" />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Panchayat:</span> <InlineInput value={form.refPanchayat as string} onChange={(v) => update('refPanchayat', v)} className="w-24" />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Contact:</span> <InlineInput value={form.refContactNumber as string} onChange={(v) => update('refContactNumber', v)} className="w-28" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 4. Emergency Contact Details */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-3">
                <thead>
                  <tr>
                    <td colSpan={5} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      4. Emergency Contact Details
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[8%] py-1 px-1">Sl. No.</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[16%] py-1 px-2">Relation</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[22%] py-1 px-2">Name</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center py-1 px-2">Address</td>
                    <td className="border border-[#1e3a5f] font-semibold text-center w-[18%] py-1 px-2">Contact Details</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#1e3a5f] text-center font-semibold">1</td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency1Relation as string} onChange={(v) => update('emergency1Relation', v)} placeholder="Relation" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency1Name as string} onChange={(v) => update('emergency1Name', v)} placeholder="Name" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency1Address as string} onChange={(v) => update('emergency1Address', v)} placeholder="Address" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency1Contact as string} onChange={(v) => update('emergency1Contact', v)} placeholder="Phone" /></td>
                  </tr>
                  <tr>
                    <td className="border border-[#1e3a5f] text-center font-semibold">2</td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency2Relation as string} onChange={(v) => update('emergency2Relation', v)} placeholder="Relation" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency2Name as string} onChange={(v) => update('emergency2Name', v)} placeholder="Name" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency2Address as string} onChange={(v) => update('emergency2Address', v)} placeholder="Address" /></td>
                    <td className="border border-[#1e3a5f] p-0.5"><InlineCellInput value={form.emergency2Contact as string} onChange={(v) => update('emergency2Contact', v)} placeholder="Phone" /></td>
                  </tr>
                </tbody>
              </table>

              {/* 5. Social Media & 6. Email */}
              <table className="w-full border-collapse border border-[#1e3a5f] mb-3.5">
                <thead>
                  <tr>
                    <td colSpan={4} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      5. Social Media Details &nbsp;|&nbsp; 6. E-Mail ID
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Facebook:</span> <InlineInput value={form.facebookUrl as string} onChange={(v) => update('facebookUrl', v)} className="w-[60%]" />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Instagram:</span> <InlineInput value={form.instagramUrl as string} onChange={(v) => update('instagramUrl', v)} className="w-[60%]" />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">Twitter:</span> <InlineInput value={form.twitterUrl as string} onChange={(v) => update('twitterUrl', v)} className="w-[60%]" />
                    </td>
                    <td className="border border-[#1e3a5f] py-1.5 px-2">
                      <span className="font-semibold">E-Mail ID:</span> <InlineInput value={form.emailId as string} onChange={(v) => update('emailId', v)} className="w-[60%]" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Declaration */}
              <table className="w-full border-collapse border border-[#1e3a5f]">
                <thead>
                  <tr>
                    <td colSpan={3} className="iaf-th border border-[#1e3a5f] font-bold text-center uppercase py-1.5 px-2 text-[11px]">
                      Applicant Declaration
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="text-[10.5px] leading-relaxed p-3 border border-[#1e3a5f]">
                      I hereby declare that the particulars given above are, to the best of my knowledge and belief,
                      correct and true. I understand that if appointed, any incorrect information given in this
                      application may be sufficient cause for termination of my services.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 border border-[#1e3a5f]">
                      <span className="font-semibold">Place:</span> <InlineInput value={form.declarationPlace as string} onChange={(v) => update('declarationPlace', v)} className="w-32" />
                    </td>
                    <td className="py-2.5 px-2 border border-[#1e3a5f]">
                      <span className="font-semibold">Date:</span> <InlineInput type="date" value={form.declarationDate as string} onChange={(v) => update('declarationDate', v)} className="w-32" />
                    </td>
                    <td className="py-2.5 px-2 border border-[#1e3a5f]">
                      <span className="font-semibold">Applicant Signature Name:</span> <InlineInput value={form.declarationName as string} onChange={(v) => update('declarationName', v)} className="w-40" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Page 2 Footer */}
            <div className="mt-3 pt-1.5 border-t border-dashed border-[#1e3a5f]/40 flex justify-between items-center text-[9.5px] font-semibold text-[#1e3a5f]/80">
              <span>Nippon Motor Corporation Pvt Ltd — Recruitment Confidential</span>
              <span className="font-bold tracking-wider uppercase">Page 2 of 2</span>
            </div>
          </section>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RESUME MANAGEMENT (EDITABLE)
           ══════════════════════════════════════════════════════════════════ */}
        <div className="iaf-page-wrap">
          <div className="bg-white border-2 border-dashed border-[#1e3a5f]/40 hover:border-[#1e3a5f] rounded-xl p-6 shadow-sm transition-colors text-center">
            <div className="w-12 h-12 rounded-full bg-[#cfe3f6] text-[#1e3a5f] flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-[#1e3a5f]">Resume / CV File</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {resumeFile ? `Selected new file: ${resumeFile.name}` : resumeName ? `Current file: ${resumeName}` : 'No resume uploaded yet'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => resumeInputRef.current?.click()}
              className="px-4 py-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#cfe3f6]/40 font-bold text-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {resumeFile || resumeName ? 'Replace Resume (PDF or Word)' : 'Upload Resume (PDF or Word)'}
            </Button>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
