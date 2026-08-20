import { useState, useRef, type ReactNode } from 'react';
import { Camera, Save, X, RotateCcw } from 'lucide-react';
import type { Candidate, Evaluation } from '../../types';
import { previousJobsFromForm, type CandidateFormData, type PreviousJob } from '../../pages/candidates/wizard/wizardTypes';
import { formatSource } from '../../lib/stages';
import { formatDate } from '../../lib/dateTime';
import { Button } from '../ui';
import { toast } from 'sonner';

interface EditableCandidateSummarySheetProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  onSave: (updatedRawData: Record<string, unknown>, newPhotoFile?: File) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const EMPTY_JOB: PreviousJob = {
  company: '',
  position: '',
  reporting: '',
  fromDate: '',
  toDate: '',
  salary: '',
  reason: '',
};

function txt(value: unknown): string {
  if (value == null || value === false) return '';
  if (value === true) return 'Yes';
  const s = String(value).trim();
  if (!s || s === 'Unknown' || s === '#DIV/0!' || s === '#N/A' || s === '0-Jan-00') return '';
  return s;
}

function rawGet(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = txt(raw[key]);
    if (direct) return direct;
    const snake = key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
    if (snake !== key) {
      const fromSnake = txt(raw[snake]);
      if (fromSnake) return fromSnake;
    }
  }
  return '';
}

function fmtDate(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return formatDate(d).replace(/\b\d{2},?\s*/, '');
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return formatDate(d);
}

function yearsBetween(from?: string, to?: string): string {
  if (!from) return '';
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0) return '';
  return years.toFixed(1);
}

function gradeFromTen(score: number): string {
  if (score >= 8) return 'A';
  if (score >= 6) return 'B';
  if (score >= 4) return 'C';
  return 'D';
}

function num(value: unknown): number | null {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && String(value ?? '').trim() !== '' ? n : null;
}

function Cell({
  children,
  colSpan,
  rowSpan,
  label,
  section,
  className = '',
}: {
  children?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  label?: boolean;
  section?: boolean;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-black px-[3px] py-px align-middle ${
        section ? 'font-bold text-center bg-neutral-200' : label ? 'font-bold' : ''
      } ${className}`}
    >
      {children ?? ''}
    </td>
  );
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
      className={`w-full bg-[#f0f7ff] hover:bg-[#e4efff] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] border-0 text-[#1e3a5f] font-semibold px-1 py-0.5 text-[8.5px] rounded-xs transition-colors ${className}`}
    />
  );
}

export function EditableCandidateSummarySheet({
  candidate,
  evaluations,
  onSave,
  onCancel,
  isSaving,
}: EditableCandidateSummarySheetProps) {
  const initialRaw = (candidate.profile?.raw_data || {}) as Record<string, unknown>;
  const salarySheet = (candidate.salary_data || {}) as Record<string, unknown>;

  // Initialize previous jobs
  const initialJobs = [...previousJobsFromForm(initialRaw as unknown as CandidateFormData)];
  if (!initialJobs.length && candidate.profile?.current_company) {
    initialJobs.push({
      ...EMPTY_JOB,
      company: candidate.profile.current_company,
      position: rawGet(initialRaw, 'prevPosition'),
      salary: rawGet(initialRaw, 'currentSalary', 'prev1Salary'),
    });
  }
  while (initialJobs.length < 6) initialJobs.push(EMPTY_JOB);

  // Initialize evaluations list
  const ranked = [
    'BRANCH_HR',
    'DEPT_HEAD',
    'HQ_INTERVIEW_1',
    'HQ_INTERVIEW_2',
    'GM_LEVEL',
    'HQ_INTERVIEW',
  ]
    .map((type) => evaluations.find((e) => e.type === type))
    .concat(evaluations.filter((e) => e.type !== 'TECHNICAL_TEST'))
    .filter((e): e is Evaluation => !!e)
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .slice(0, 4);

  const initialInterviews = [...ranked];
  while (initialInterviews.length < 4) initialInterviews.push(null as any);

  // Editable Form State
  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    ...initialRaw,
    fullName: candidate.full_name,
    department: candidate.department || '',
    branchLocation: candidate.branch_location || '',
    positionAppliedFor: candidate.position_applied_for || rawGet(initialRaw, 'positionAppliedFor'),
    positionSuitable: rawGet(initialRaw, 'positionSuitable') || candidate.position_applied_for || '',
    appliedDate: rawGet(initialRaw, 'appliedDate') || candidate.pre_form_submitted_at || candidate.applied_at || '',
    source: candidate.source || rawGet(initialRaw, 'sourceOfOpening', 'source') || '',
    specifySource: txt(candidate.source_reference) || rawGet(initialRaw, 'referredBy') || '',
    dateOfBirth: rawGet(initialRaw, 'dateOfBirth') || '',
    age: rawGet(initialRaw, 'age') || '',
    mobileNumber: candidate.phone || rawGet(initialRaw, 'mobileNumber') || '',
    phone2: rawGet(initialRaw, 'contactNumber2', 'phone2') || '',
    totalExperience: rawGet(initialRaw, 'totalExperience') || txt(candidate.profile?.total_experience) || candidate.experience || '',
    relevantExperience: rawGet(initialRaw, 'relevantExperience') || '',
    // Address
    presHouseName: rawGet(initialRaw, 'presHouseName', 'permHouseName') || '',
    presLandmark: rawGet(initialRaw, 'presLandmark', 'permLandmark') || '',
    presPostOffice: rawGet(initialRaw, 'presPostOffice', 'permPostOffice') || '',
    presDistrict: rawGet(initialRaw, 'presDistrict', 'permDistrict') || '',
    presPinCode: rawGet(initialRaw, 'presPinCode', 'permPinCode') || '',
    // Education 1
    degreeLevel: rawGet(initialRaw, 'degreeLevel') || (rawGet(initialRaw, 'postGradCourse') ? 'PG' : rawGet(initialRaw, 'gradCourse') ? 'Degree' : 'Degree'),
    degreeSpec: rawGet(initialRaw, 'gradCourse') || rawGet(initialRaw, 'postGradCourse') || '',
    degreeCollege: rawGet(initialRaw, 'gradCollege') || rawGet(initialRaw, 'postGradCollege') || '',
    degreePercentage: rawGet(initialRaw, 'gradPercentage') || rawGet(initialRaw, 'postGradPercentage') || '',
    // Education 2
    plusTwoLevel: 'Plus Two',
    plusTwoSpec: rawGet(initialRaw, 'class12Stream') || '',
    plusTwoSchool: rawGet(initialRaw, 'class12School') || '',
    plusTwoPercentage: rawGet(initialRaw, 'class12Percentage') || '',
    // Skills
    computerKnowledge: rawGet(initialRaw, 'computerKnowledge') || [
      initialRaw.compWord ? 'Word' : '',
      initialRaw.compExcel ? 'Excel' : '',
      initialRaw.compPowerPoint ? 'Power Point' : '',
      initialRaw.compTally ? 'Tally' : '',
      txt(initialRaw.softwareCerts),
    ].filter(Boolean).join(', '),
    drivingLicence: rawGet(initialRaw, 'drivingLicence') || (initialRaw.hasValidDrivingLicense ? 'Yes' : ''),
    // Family
    fatherOccupation: rawGet(initialRaw, 'fatherOccupation') || '',
    motherOccupation: rawGet(initialRaw, 'motherOccupation') || '',
    spouseOccupation: rawGet(initialRaw, 'spouseOccupation') || '',
    sibling1Occupation: rawGet(initialRaw, 'sibling1Occupation') || '',
    sibling2Occupation: rawGet(initialRaw, 'sibling2Occupation') || '',
    sibling3Occupation: rawGet(initialRaw, 'sibling3Occupation') || '',
    // Scoreboard
    psychometryResult: rawGet(initialRaw, 'psychometryResult') || '',
    analyticalResult: rawGet(initialRaw, 'analyticalResult') || '',
    technicalResult: rawGet(initialRaw, 'technicalResult') || (evaluations.find(e => e.type === 'TECHNICAL_TEST')?.scores?.percentage != null ? String(evaluations.find(e => e.type === 'TECHNICAL_TEST')?.scores?.percentage) : ''),
    departmentResult: rawGet(initialRaw, 'departmentResult') || '',
    totalAverage: rawGet(initialRaw, 'totalAverage') || '',
    // Interview dates
    iv1Date: rawGet(initialRaw, 'iv1Date') || fmtDate(initialInterviews[0]?.scheduled_time || initialInterviews[0]?.updated_at),
    iv2Date: rawGet(initialRaw, 'iv2Date') || fmtDate(initialInterviews[1]?.scheduled_time || initialInterviews[1]?.updated_at),
    iv3Date: rawGet(initialRaw, 'iv3Date') || fmtDate(initialInterviews[2]?.scheduled_time || initialInterviews[2]?.updated_at),
    iv4Date: rawGet(initialRaw, 'iv4Date') || fmtDate(initialInterviews[3]?.scheduled_time || initialInterviews[3]?.updated_at),
    // Salary
    currentSalary: rawGet(initialRaw, 'currentSalary') || '',
    incentive: rawGet(initialRaw, 'incentive') || txt(salarySheet.incentive) || '',
    others: rawGet(initialRaw, 'others') || txt(salarySheet.others) || '',
    expectedSalary: rawGet(initialRaw, 'expectedSalary') || txt(candidate.profile?.expected_salary) || '',
    expectedIncentive: rawGet(initialRaw, 'expectedIncentive') || '',
    expectedOthers: rawGet(initialRaw, 'expectedOthers') || '',
    joiningDays: rawGet(initialRaw, 'noticePeriod', 'joiningDays') || '',
    // Comments
    iv1Interviewer: rawGet(initialRaw, 'iv1Interviewer') || txt(initialInterviews[0]?.scores?.interviewer_name),
    iv1Remarks: rawGet(initialRaw, 'iv1Remarks') || initialInterviews[0]?.remarks || '',
    iv1Score: rawGet(initialRaw, 'iv1Score') || (initialInterviews[0]?.scores?.total_score != null ? String(initialInterviews[0]?.scores?.total_score) : ''),
    iv2Interviewer: rawGet(initialRaw, 'iv2Interviewer') || txt(initialInterviews[1]?.scores?.interviewer_name),
    iv2Remarks: rawGet(initialRaw, 'iv2Remarks') || initialInterviews[1]?.remarks || '',
    iv2Score: rawGet(initialRaw, 'iv2Score') || (initialInterviews[1]?.scores?.total_score != null ? String(initialInterviews[1]?.scores?.total_score) : ''),
    iv3Interviewer: rawGet(initialRaw, 'iv3Interviewer') || txt(initialInterviews[2]?.scores?.interviewer_name),
    iv3Remarks: rawGet(initialRaw, 'iv3Remarks') || initialInterviews[2]?.remarks || '',
    iv3Score: rawGet(initialRaw, 'iv3Score') || (initialInterviews[2]?.scores?.total_score != null ? String(initialInterviews[2]?.scores?.total_score) : ''),
    iv4Interviewer: rawGet(initialRaw, 'iv4Interviewer') || txt(initialInterviews[3]?.scores?.interviewer_name),
    iv4Remarks: rawGet(initialRaw, 'iv4Remarks') || initialInterviews[3]?.remarks || '',
    iv4Score: rawGet(initialRaw, 'iv4Score') || (initialInterviews[3]?.scores?.total_score != null ? String(initialInterviews[3]?.scores?.total_score) : ''),
    // CMD
    cmdComments: rawGet(initialRaw, 'cmdComments') || '',
    // Offer Milestones (Checkable)
    offerLetterIssued: initialRaw.offerLetterIssued != null
      ? Boolean(initialRaw.offerLetterIssued === true || initialRaw.offerLetterIssued === 'true' || initialRaw.offerLetterIssued === 'Yes')
      : Boolean(candidate.offer_letter_generated_at || candidate.offer_letter_issued || candidate.current_stage === 'FINAL_APPROVAL' || candidate.current_stage === 'HIRED'),
    offerCommMessage: initialRaw.offerCommMessage != null
      ? Boolean(initialRaw.offerCommMessage === true || initialRaw.offerCommMessage === 'true' || initialRaw.offerCommMessage === 'Yes')
      : Boolean(candidate.offer_letter_generated_at),
    offerCommCall: Boolean(initialRaw.offerCommCall === true || initialRaw.offerCommCall === 'true' || initialRaw.offerCommCall === 'Yes'),
    docCarryMessage: Boolean(initialRaw.docCarryMessage === true || initialRaw.docCarryMessage === 'true' || initialRaw.docCarryMessage === 'Yes'),
    followUpCall: Boolean(initialRaw.followUpCall === true || initialRaw.followUpCall === 'true' || initialRaw.followUpCall === 'Yes'),
    dateOfJoining: rawGet(initialRaw, 'dateOfJoining') || fmtDate(candidate.profile?.joining_date),
  }));

  const [jobs, setJobs] = useState<PreviousJob[]>(initialJobs);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(candidate.profile?.photo_url || null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const update = (key: string, val: unknown) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const updateJob = (index: number, key: keyof PreviousJob, val: string) => {
    setJobs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: val };
      return next;
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    toast.success('Photo attached');
  };

  const handleSave = async () => {
    const updatedRaw: Record<string, unknown> = {
      ...initialRaw,
      ...form,
      previousJobs: jobs.filter((j) => j.company || j.position || j.salary),
    };
    await onSave(updatedRaw, photoFile || undefined);
  };

  // Calculations
  const curVal = num(form.currentSalary);
  const incVal = num(form.incentive);
  const othVal = num(form.others);
  const computedCurTotal = [curVal, incVal, othVal].some((n) => n != null)
    ? (curVal || 0) + (incVal || 0) + (othVal || 0)
    : '';

  const scores = [num(form.iv1Score), num(form.iv2Score), num(form.iv3Score), num(form.iv4Score)].filter((n): n is number => n !== null && n > 0);
  const totalScoreSum = scores.length ? scores.reduce((a, b) => a + b, 0) : '';
  const avgScore = scores.length ? Math.round((totalScoreSum as number / scores.length) * 10) : '';

  return (
    <div className="space-y-4">
      {/* Sticky Action Bar */}
      <div className="sticky top-2 z-30 flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-border shadow-md no-print">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">Editing Candidate Summary Sheet</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">— edit cells inline below</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Save className="w-4 h-4 mr-1" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Sheet Container */}
      <div className="css-sheet box-border bg-white text-[8.5px] leading-[1.2] text-black font-sans w-[210mm] min-h-[297mm] p-[6mm_8mm] shadow-lg border border-slate-300 mx-auto print:shadow-none print:border-none">
        <table className="w-full border-collapse border border-black table-fixed">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[4%]" />
            <col className="w-[9%]" />
            <col className="w-[6%]" />
            <col className="w-[4%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[11%]" />
          </colgroup>
          <tbody>
            <tr>
              <Cell colSpan={7} className="text-[15px] font-bold tracking-wide h-8">NIPPON TOYOTA</Cell>
              <Cell label>Sl No</Cell>
              <Cell colSpan={4}>{candidate.candidate_id}</Cell>
            </tr>
            <tr>
              <Cell colSpan={7} className="text-[10px] font-bold">
                NIPPON MOTOR CORPORATION (P) LTD, NIPPON TOWERS, KALAMASSERY
              </Cell>
              <Cell label>Date :</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.appliedDate as string} onChange={(v) => update('appliedDate', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell section colSpan={12} className="text-[11px] h-6">Human Resource Department</Cell>
            </tr>
            <tr>
              <Cell colSpan={10} className="font-bold text-[11px]">Candidate Summary Sheet</Cell>
              <Cell label>Department</Cell>
              <Cell>
                <InlineInput value={form.department as string} onChange={(v) => update('department', v)} />
              </Cell>
            </tr>

            <tr>
              <Cell label>Name</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.fullName as string} onChange={(v) => update('fullName', v)} />
              </Cell>
              <Cell colSpan={4}>Application Submitted on:</Cell>
              <Cell>
                <InlineInput value={form.appliedDate as string} onChange={(v) => update('appliedDate', v)} />
              </Cell>
              <Cell label>Location</Cell>
              <Cell>
                <InlineInput value={form.branchLocation as string} onChange={(v) => update('branchLocation', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell label>Post Applied</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.positionAppliedFor as string} onChange={(v) => update('positionAppliedFor', v)} />
              </Cell>
              <Cell label>Source</Cell>
              <Cell colSpan={3}>
                <InlineInput value={form.source as string} onChange={(v) => update('source', v)} />
              </Cell>
              <Cell>Specify Source</Cell>
              <Cell rowSpan={2} colSpan={2}>
                <InlineInput value={form.specifySource as string} onChange={(v) => update('specifySource', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell label>Post Suitable</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.positionSuitable as string} onChange={(v) => update('positionSuitable', v)} />
              </Cell>
              <Cell label>Age</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.age as string} onChange={(v) => update('age', v)} />
              </Cell>
            </tr>

            <tr>
              <Cell section colSpan={5}>Personal Details</Cell>
              <Cell label rowSpan={2}>Date of Birth</Cell>
              <Cell rowSpan={2} colSpan={4}>
                <InlineInput value={form.dateOfBirth as string} onChange={(v) => update('dateOfBirth', v)} placeholder="DD/MM/YYYY" />
              </Cell>
              <Cell rowSpan={8} colSpan={2} className="text-center align-middle p-0.5 relative group">
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-full cursor-pointer focus:outline-none"
                  title="Click to change photo"
                >
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="" className="h-[28mm] w-[22mm] object-cover mx-auto border border-black" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[8px] font-bold">
                        <Camera className="w-3.5 h-3.5 mr-0.5" /> Change
                      </div>
                    </div>
                  ) : (
                    <div className="h-[28mm] w-[22mm] mx-auto border border-dashed border-slate-400 bg-slate-50 text-[8px] text-slate-500 flex flex-col items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <Camera className="w-4 h-4 mb-0.5 text-slate-400" />
                      Upload
                    </div>
                  )}
                </button>
              </Cell>
            </tr>
            <tr>
              <Cell label rowSpan={2}>Contact No:</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.mobileNumber as string} onChange={(v) => update('mobileNumber', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={4}>
                <InlineInput value={form.phone2 as string} onChange={(v) => update('phone2', v)} placeholder="Alt Phone" />
              </Cell>
              <Cell label colSpan={2}>Experience</Cell>
              <Cell colSpan={3}>Years</Cell>
            </tr>
            <tr>
              <Cell label rowSpan={5}>Contact Address</Cell>
              <Cell colSpan={4}>
                <InlineInput value={form.presHouseName as string} onChange={(v) => update('presHouseName', v)} placeholder="House Name" />
              </Cell>
              <Cell colSpan={2}>Total Work Experience</Cell>
              <Cell colSpan={3} rowSpan={2}>
                <InlineInput value={form.totalExperience as string} onChange={(v) => update('totalExperience', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={4}>
                <InlineInput value={form.presLandmark as string} onChange={(v) => update('presLandmark', v)} placeholder="Landmark / Street" />
              </Cell>
              <Cell colSpan={2}></Cell>
            </tr>
            <tr>
              <Cell colSpan={4}>
                <InlineInput value={form.presPostOffice as string} onChange={(v) => update('presPostOffice', v)} placeholder="Post Office" />
              </Cell>
              <Cell label colSpan={2} className="italic">Relevant Experience</Cell>
              <Cell colSpan={3} rowSpan={3}>
                <InlineInput value={form.relevantExperience as string} onChange={(v) => update('relevantExperience', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={4}>
                <InlineInput value={form.presDistrict as string} onChange={(v) => update('presDistrict', v)} placeholder="District" />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={4}>
                <InlineInput value={form.presPinCode as string} onChange={(v) => update('presPinCode', v)} placeholder="Pin Code" />
              </Cell>
            </tr>

            {/* Education & Family */}
            <tr>
              <Cell label>Educational Qualification</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.degreeLevel as string} onChange={(v) => update('degreeLevel', v)} />
              </Cell>
              <Cell colSpan={2} className="font-bold">Specialization</Cell>
              <Cell colSpan={3}>
                <InlineInput
                  value={[form.degreeSpec, form.degreeCollege, form.degreePercentage ? `${form.degreePercentage}%` : ''].filter(Boolean).join(', ')}
                  onChange={(v) => update('degreeSpec', v)}
                />
              </Cell>
              <Cell label>Father's Occupation</Cell>
              <Cell>
                <InlineInput value={form.fatherOccupation as string} onChange={(v) => update('fatherOccupation', v)} />
              </Cell>
              <Cell label>Siblings 1 Occupation</Cell>
              <Cell>
                <InlineInput value={form.sibling1Occupation as string} onChange={(v) => update('sibling1Occupation', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell label>Educational Qualification</Cell>
              <Cell colSpan={2}>Plus Two</Cell>
              <Cell colSpan={2} className="font-bold">Specialization</Cell>
              <Cell colSpan={3}>
                <InlineInput
                  value={[form.plusTwoSpec, form.plusTwoSchool, form.plusTwoPercentage ? `${form.plusTwoPercentage}%` : ''].filter(Boolean).join(', ')}
                  onChange={(v) => update('plusTwoSpec', v)}
                />
              </Cell>
              <Cell label>Mother's Occupation</Cell>
              <Cell>
                <InlineInput value={form.motherOccupation as string} onChange={(v) => update('motherOccupation', v)} />
              </Cell>
              <Cell label>Siblings 2 Occupation</Cell>
              <Cell>
                <InlineInput value={form.sibling2Occupation as string} onChange={(v) => update('sibling2Occupation', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell label>Computer Knowledge</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.computerKnowledge as string} onChange={(v) => update('computerKnowledge', v)} />
              </Cell>
              <Cell colSpan={2} className="font-bold">Driving Licence</Cell>
              <Cell colSpan={3}>
                <InlineInput value={form.drivingLicence as string} onChange={(v) => update('drivingLicence', v)} />
              </Cell>
              <Cell label>Spouse Occupation</Cell>
              <Cell>
                <InlineInput value={form.spouseOccupation as string} onChange={(v) => update('spouseOccupation', v)} />
              </Cell>
              <Cell label>Siblings 3 Occupation</Cell>
              <Cell>
                <InlineInput value={form.sibling3Occupation as string} onChange={(v) => update('sibling3Occupation', v)} />
              </Cell>
            </tr>

            {/* Scoreboard */}
            <tr>
              <Cell section colSpan={12}>SCORE BOARD / TEST RESULTS (% Wise)</Cell>
            </tr>
            <tr>
              <Cell colSpan={2}>Psychometry test Result</Cell>
              <Cell>
                <InlineInput value={form.psychometryResult as string} onChange={(v) => update('psychometryResult', v)} />
              </Cell>
              <Cell rowSpan={4} colSpan={3} className="text-center font-bold">TOTAL AVERAGE</Cell>
              <Cell rowSpan={4} colSpan={3} className="text-center text-[16px] font-bold">
                {form.totalAverage ? String(form.totalAverage) : avgScore}
              </Cell>
              <Cell colSpan={2}>1st Interview</Cell>
              <Cell>
                <InlineInput value={form.iv1Date as string} onChange={(v) => update('iv1Date', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={2}>Analytical Test Result</Cell>
              <Cell>
                <InlineInput value={form.analyticalResult as string} onChange={(v) => update('analyticalResult', v)} />
              </Cell>
              <Cell colSpan={2}>2nd Interview</Cell>
              <Cell>
                <InlineInput value={form.iv2Date as string} onChange={(v) => update('iv2Date', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={2}>Technical Test Result</Cell>
              <Cell>
                <InlineInput value={form.technicalResult as string} onChange={(v) => update('technicalResult', v)} />
              </Cell>
              <Cell colSpan={2}>3rd Interview</Cell>
              <Cell>
                <InlineInput value={form.iv3Date as string} onChange={(v) => update('iv3Date', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell colSpan={2}>Department Test Result</Cell>
              <Cell>
                <InlineInput value={form.departmentResult as string} onChange={(v) => update('departmentResult', v)} />
              </Cell>
              <Cell colSpan={2}>4th Interview</Cell>
              <Cell>
                <InlineInput value={form.iv4Date as string} onChange={(v) => update('iv4Date', v)} />
              </Cell>
            </tr>

            {/* Employment Record */}
            <tr>
              <Cell section colSpan={12}>Employment Record</Cell>
            </tr>
            <tr>
              <Cell label rowSpan={2}>Organisation</Cell>
              <Cell label colSpan={2}>Period</Cell>
              <Cell label rowSpan={2}>No: of Years</Cell>
              <Cell label rowSpan={2} colSpan={2}>Designation</Cell>
              <Cell label rowSpan={2} colSpan={3}>Reason for Resignation</Cell>
              <Cell label rowSpan={2} colSpan={2}>Total Salary</Cell>
              <Cell label rowSpan={2}>Category</Cell>
            </tr>
            <tr>
              <Cell label>From</Cell>
              <Cell label>To</Cell>
            </tr>
            {jobs.slice(0, 6).map((job, i) => (
              <tr key={`job-${i}`} className="h-[9mm]">
                <Cell>
                  <InlineInput value={job.company} onChange={(v) => updateJob(i, 'company', v)} />
                </Cell>
                <Cell>
                  <InlineInput value={job.fromDate} onChange={(v) => updateJob(i, 'fromDate', v)} />
                </Cell>
                <Cell>
                  <InlineInput value={job.toDate} onChange={(v) => updateJob(i, 'toDate', v)} />
                </Cell>
                <Cell>
                  {yearsBetween(job.fromDate, job.toDate)}
                </Cell>
                <Cell colSpan={2}>
                  <InlineInput value={job.position} onChange={(v) => updateJob(i, 'position', v)} />
                </Cell>
                <Cell colSpan={3}>
                  <InlineInput value={job.reason} onChange={(v) => updateJob(i, 'reason', v)} />
                </Cell>
                <Cell colSpan={2}>
                  <InlineInput value={job.salary} onChange={(v) => updateJob(i, 'salary', v)} />
                </Cell>
                <Cell></Cell>
              </tr>
            ))}

            {/* Salary Summary */}
            <tr>
              <Cell label>Current Salary</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.currentSalary as string} onChange={(v) => update('currentSalary', v)} />
              </Cell>
              <Cell colSpan={3}>Remarks</Cell>
              <Cell colSpan={3}>Expected Salary</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.expectedSalary as string} onChange={(v) => update('expectedSalary', v)} />
              </Cell>
              <Cell rowSpan={4}></Cell>
            </tr>
            <tr>
              <Cell label>Incentive</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.incentive as string} onChange={(v) => update('incentive', v)} />
              </Cell>
              <Cell rowSpan={3} colSpan={3}></Cell>
              <Cell colSpan={3}>Incentive</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.expectedIncentive as string} onChange={(v) => update('expectedIncentive', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell label>Others</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.others as string} onChange={(v) => update('others', v)} />
              </Cell>
              <Cell colSpan={3}>Others</Cell>
              <Cell colSpan={2}>
                <InlineInput value={form.expectedOthers as string} onChange={(v) => update('expectedOthers', v)} />
              </Cell>
            </tr>
            <tr>
              <Cell label>Total</Cell>
              <Cell colSpan={2} className="font-bold">
                {computedCurTotal === '' ? '' : String(computedCurTotal)}
              </Cell>
              <Cell colSpan={3}>Total</Cell>
              <Cell colSpan={2} className="font-bold">
                {form.expectedSalary ? String(form.expectedSalary) : ''}
              </Cell>
            </tr>

            {/* Comments & Marks */}
            <tr>
              <Cell label>Joining Time</Cell>
              <Cell>
                <InlineInput value={form.joiningDays as string} onChange={(v) => update('joiningDays', v)} />
              </Cell>
              <Cell label>Days</Cell>
              <Cell colSpan={7}></Cell>
              <Cell label>Grade</Cell>
              <Cell label>Marks (Maximum 10)</Cell>
            </tr>

            {/* 4 Interview Rounds */}
            {[1, 2, 3, 4].map((n, idx) => {
              const sc = num(form[`iv${n}Score`]);
              const has = sc !== null && sc > 0;
              return (
                <tr key={`iv-${n}`} className="h-[11mm]">
                  {idx === 0 ? <Cell label rowSpan={4}>Interview Comments</Cell> : null}
                  <Cell>
                    <InlineInput value={form[`iv${n}Interviewer`] as string} onChange={(v) => update(`iv${n}Interviewer`, v)} placeholder={`Interviewer ${n}`} />
                  </Cell>
                  <Cell colSpan={8}>
                    <InlineInput value={form[`iv${n}Remarks`] as string} onChange={(v) => update(`iv${n}Remarks`, v)} placeholder={`Remarks for Round ${n}`} />
                  </Cell>
                  <Cell className="text-center font-bold">
                    {has ? gradeFromTen(sc) : ''}
                  </Cell>
                  <Cell className="text-center">
                    <InlineInput
                      value={form[`iv${n}Score`] as string}
                      onChange={(v) => update(`iv${n}Score`, v)}
                      placeholder="0-10"
                      className="text-center font-bold"
                    />
                  </Cell>
                </tr>
              );
            })}

            <tr>
              <Cell colSpan={10}></Cell>
              <Cell>Total Marks</Cell>
              <Cell className="font-bold text-center">{totalScoreSum}</Cell>
            </tr>

            {/* CMD Section */}
            <tr className="h-[14mm]">
              <Cell label colSpan={2} className="align-top">CMD</Cell>
              <Cell colSpan={10}>
                <InlineInput value={form.cmdComments as string} onChange={(v) => update('cmdComments', v)} placeholder="CMD Comments / Decision" />
              </Cell>
            </tr>

            {/* Offer Milestones (Checkable) */}
            <tr className="h-[10mm]">
              <Cell label className="text-center align-middle p-1">
                <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                  <span className="font-bold text-[8px] leading-tight">Offer Letter Issued</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.offerLetterIssued)}
                    onChange={(e) => update('offerLetterIssued', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-xs accent-[#1e3a5f] cursor-pointer"
                  />
                </label>
              </Cell>
              <Cell label colSpan={3} className="text-center align-middle p-1">
                <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                  <span className="font-bold text-[8px] leading-tight">Offer Communication Message</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.offerCommMessage)}
                    onChange={(e) => update('offerCommMessage', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-xs accent-[#1e3a5f] cursor-pointer"
                  />
                </label>
              </Cell>
              <Cell label colSpan={4} className="text-center align-middle p-1">
                <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                  <span className="font-bold text-[8px] leading-tight">Offer Communicated Call</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.offerCommCall)}
                    onChange={(e) => update('offerCommCall', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-xs accent-[#1e3a5f] cursor-pointer"
                  />
                </label>
              </Cell>
              <Cell label colSpan={2} className="text-center align-middle p-1">
                <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                  <span className="font-bold text-[8px] leading-tight">Document Carry Message</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.docCarryMessage)}
                    onChange={(e) => update('docCarryMessage', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-xs accent-[#1e3a5f] cursor-pointer"
                  />
                </label>
              </Cell>
              <Cell label className="text-center align-middle p-1">
                <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                  <span className="font-bold text-[8px] leading-tight">Follow Up Call (N-1)</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.followUpCall)}
                    onChange={(e) => update('followUpCall', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-xs accent-[#1e3a5f] cursor-pointer"
                  />
                </label>
              </Cell>
              <Cell label className="text-center align-middle p-1">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="font-bold text-[8px] leading-tight">Date Of Joining</span>
                  <InlineInput
                    value={form.dateOfJoining as string}
                    onChange={(v) => update('dateOfJoining', v)}
                    placeholder="DD/MM/YYYY"
                    className="text-center font-bold"
                  />
                </div>
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
