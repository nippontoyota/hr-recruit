import type { ReactNode } from 'react';
import type { Candidate, Evaluation } from '../../types';
import { previousJobsFromForm, type CandidateFormData, type PreviousJob } from '../../pages/candidates/wizard/wizardTypes';
import { formatSource } from '../../lib/stages';
import { formatDate } from '../../lib/dateTime';
import { getBrandConfig } from '../../lib/branding';
import { updateCandidateRawData } from '../../api/candidates';
import { toast } from 'sonner';
import { Edit2 } from 'lucide-react';


interface CandidateSummarySheetProps {
  candidate: Candidate;
  evaluations: Evaluation[];
}

const EMPTY_JOB: PreviousJob = {
  company: '',
  position: '',
  reporting: '',
  reportingDesignation: '',
  reportingPhone: '',
  fromDate: '',
  toDate: '',
  salary: '',
  reason: '',
};

const INTERVIEW_ORDER = [
  'BRANCH_HR',
  'DEPT_HEAD',
  'HQ_INTERVIEW_1',
  'HQ_INTERVIEW_2',
  'GM_LEVEL',
  'HQ_INTERVIEW',
] as const;

const MIN_JOB_ROWS = 6;

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

/** Compact date format for narrow employment-record columns: "1-Jun-23" */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function shortDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getDate()}-${MONTH_SHORT[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

function ageFromDob(dob: string): string {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const month = today.getMonth() - d.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < d.getDate())) age -= 1;
  return age > 0 && age < 80 ? String(age) : '';
}

function eduValue(course: string, place: string, pct: string): string {
  return [course, place, pct ? `${pct}%` : ''].filter(Boolean).join(', ');
}

function occupation(role: string, company: string): string {
  return [role, company].filter(Boolean).join(' — ');
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

/** Grade band label shown in the top-right header, based on avg score out of 100 */
function gradeBand(avg: number): string {
  if (avg >= 80) return 'Excellent';
  if (avg >= 65) return 'Above Average';
  if (avg >= 50) return 'Average';
  if (avg >= 35) return 'Below Average';
  return 'Poor';
}

function siblingOcc(raw: Record<string, unknown>, n: 1 | 2 | 3): string {
  const relation = rawGet(raw, `sibling${n}Relation`);
  const occupationText = rawGet(raw, `sibling${n}Occupation`);
  const name = rawGet(raw, `sibling${n}Name`);
  if (relation && occupationText) return `${relation} - ${occupationText}`;
  return occupationText || [relation, name].filter(Boolean).join(' — ');
}

function computerKnowledge(raw: Record<string, unknown>): string {
  return [
    raw.compWord ? 'Word' : '',
    raw.compExcel ? 'Excel' : '',
    raw.compPowerPoint ? 'Power Point' : '',
    raw.compTally ? 'Tally' : '',
    txt(raw.softwareCerts),
  ].filter(Boolean).join(', ');
}

function drivingLicence(raw: Record<string, unknown>): string {
  const kinds = [
    raw.drive2Wheeler ? '2 Wheeler' : '',
    raw.drive3Wheeler ? '3 Wheeler' : '',
    raw.drive4Wheeler ? '4 Wheeler' : '',
    raw.driveHeavy ? 'Heavy' : '',
  ].filter(Boolean);
  if (raw.hasValidDrivingLicense === true) {
    if (kinds.length) return `Yes (${kinds.join(', ')})`;
    if (raw.confidentToDrive === true) return 'Yes (Confident)';
    if (raw.confidentToDrive === false) return 'Yes (Not confident)';
    return 'Yes';
  }
  if (raw.hasValidDrivingLicense === false) return 'No';
  if (kinds.length) return `Yes-${kinds.join(', ')}`;
  if (txt(raw.drivingLicenseNumber)) return 'Yes';
  if (raw.confidentToDrive === false) return 'No';
  return '';
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
      className={`border border-black px-[4px] py-[4px] align-middle ${
        section ? 'font-bold text-center bg-neutral-200' : label ? 'font-bold' : ''
      } ${className}`}
    >
      {children ?? ''}
    </td>
  );
}

export function CandidateSummarySheet({ candidate, evaluations }: CandidateSummarySheetProps) {
  const brand = getBrandConfig(candidate.brand);
  const riverClass = brand.key === 'RIVER' ? 'css-sheet-river' : '';
  const raw = (candidate.profile?.raw_data || {}) as Record<string, unknown>;
  const salarySheet = (candidate.salary_data || {}) as Record<string, unknown>;
  const jobs = [...previousJobsFromForm(raw as unknown as CandidateFormData)];
  const MAX_JOB_ROWS = 3;
  if (!jobs.length && candidate.profile?.current_company) {
    jobs.push({
      ...EMPTY_JOB,
      company: candidate.profile.current_company,
      position: rawGet(raw, 'prevPosition'),
      salary: rawGet(raw, 'currentSalary', 'prev1Salary'),
    });
  }
  
  // Slice to strictly max 3 rows to prevent page spill
  const finalJobs = jobs.slice(0, MAX_JOB_ROWS);
  // Pad if less than 3
  while (finalJobs.length < MAX_JOB_ROWS) finalJobs.push({ ...EMPTY_JOB });

  const photo = candidate.profile?.photo_url;
  const dob = rawGet(raw, 'dateOfBirth');
  const appliedOn = fmtDate(
    rawGet(raw, 'appliedDate') || candidate.pre_form_submitted_at || candidate.applied_at,
  );
  const sourceValue =
    rawGet(raw, 'source', 'sourceOfOpening') ||
    (candidate.source && candidate.source !== 'Unknown' ? candidate.source : '');
  const source = sourceValue ? formatSource(sourceValue) : '';
  const specifySource = rawGet(raw, 'specifySource', 'referredBy') || txt(candidate.source_reference);
  const phones = [candidate.phone || rawGet(raw, 'mobileNumber'), rawGet(raw, 'phone2', 'contactNumber2')]
    .map((p) => p.replace(/\s/g, ''))
    .filter((p, i, arr) => p && arr.indexOf(p) === i);
  const addrPrefix = rawGet(raw, 'presHouseName') && raw.sameAsPermanent !== true ? 'pres' : 'perm';
  const addr = [
    rawGet(raw, `${addrPrefix}HouseName`),
    rawGet(raw, `${addrPrefix}Landmark`),
    rawGet(raw, `${addrPrefix}PostOffice`),
    rawGet(raw, `${addrPrefix}District`),
    rawGet(raw, `${addrPrefix}PinCode`),
  ];
  const totalExp =
    rawGet(raw, 'totalExperience') ||
    txt(candidate.profile?.total_experience) ||
    (candidate.experience && candidate.experience !== 'Fresher' ? candidate.experience : '') ||
    (candidate.experience === 'Fresher' ? 'Fresher' : '');
  const relevantExp = rawGet(raw, 'relevantExperience');
  const currentSalary =
    rawGet(raw, 'currentSalary') ||
    jobs.find((j) => j.salary)?.salary ||
    '';
  const expectedSalary =
    rawGet(raw, 'expectedSalary') || txt(candidate.profile?.expected_salary) || '';
  const joiningDays = rawGet(raw, 'joiningDays', 'noticePeriod');
  const doj = fmtDate(rawGet(raw, 'expectedJoiningDate') || rawGet(raw, 'dateOfJoining') || candidate.profile?.joining_date);
  const pgCourse = [rawGet(raw, 'postGradCourse'), rawGet(raw, 'postGradStream')].filter(Boolean).join(' - ');
  const pg = eduValue(
    pgCourse,
    rawGet(raw, 'postGradCollege'),
    rawGet(raw, 'postGradPercentage'),
  );
  const degreeCourse = [rawGet(raw, 'gradCourse'), rawGet(raw, 'gradStream')].filter(Boolean).join(' - ');
  const degree = eduValue(
    degreeCourse,
    rawGet(raw, 'gradCollege'),
    rawGet(raw, 'gradPercentage'),
  );
  const plusTwo = eduValue(
    rawGet(raw, 'class12Stream'),
    rawGet(raw, 'class12School'),
    rawGet(raw, 'class12Percentage'),
  );
  const sslc = eduValue(
    rawGet(raw, 'class10Board'),
    rawGet(raw, 'class10School'),
    rawGet(raw, 'class10Percentage'),
  );
  const degreeLevel = rawGet(raw, 'degreeLevel') || (pg ? 'PG' : degree ? 'Degree' : sslc && !plusTwo ? 'SSLC' : 'Degree');
  const degreeSpec = rawGet(raw, 'degreeSpec') || pg || degree || (!plusTwo ? sslc : '');
  const plusTwoSpec = rawGet(raw, 'plusTwoSpec') || plusTwo || (pg || degree ? sslc : '');

  const tech = evaluations.find((e) => e.type === 'TECHNICAL_TEST' && e.status === 'EVALUATED');
  const techPct = tech?.scores?.percentage;
  const ranked = INTERVIEW_ORDER
    .map((type) => evaluations.find((e) => e.type === type))
    .concat(evaluations.filter((e) => e.type !== 'TECHNICAL_TEST' && !INTERVIEW_ORDER.includes(e.type as (typeof INTERVIEW_ORDER)[number])))
    .filter((e): e is Evaluation => !!e)
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .filter((e) => e.status === 'EVALUATED' || txt(e.remarks) || Number(e.scores?.total_score) > 0)
    .slice(0, 4);
  const interviews: Array<Evaluation | null> = [...ranked];
  while (interviews.length < 4) interviews.push(null);

  const ivInterviewer = [1, 2, 3, 4].map((n) => rawGet(raw, `iv${n}Interviewer`) || txt(interviews[n - 1]?.scores?.interviewer_name));
  const ivRemarks = [1, 2, 3, 4].map((n) => rawGet(raw, `iv${n}Remarks`) || interviews[n - 1]?.remarks || '');
  const ivScore = [1, 2, 3, 4].map((n) => {
    const override = num(rawGet(raw, `iv${n}Score`));
    if (override != null) return override;
    const evalScore = Number(interviews[n - 1]?.scores?.total_score);
    return Number.isFinite(evalScore) && evalScore > 0 ? evalScore : null;
  });
  const ivDate = [1, 2, 3, 4].map((n) =>
    rawGet(raw, `iv${n}Date`) || fmtDate(interviews[n - 1]?.scheduled_time || interviews[n - 1]?.updated_at),
  );

  const scored = ivScore.filter((n): n is number => n !== null && n > 0);
  const marks100 = scored.map((n) => Math.round(n * 10));
  const totalAverageOverride = rawGet(raw, 'totalAverage');
  const avg100Num = marks100.length ? Math.round(marks100.reduce((a, b) => a + b, 0) / marks100.length) : null;
  const avg100 = totalAverageOverride || (avg100Num != null ? String(avg100Num) : '');
  const totalMarks10 = scored.length ? scored.reduce((a, b) => a + b, 0) : '';

  // Score band for top-right header
  const scoreForBand = num(avg100);
  const scoreBandLabel = scoreForBand != null ? gradeBand(scoreForBand) : '';

  const cur = num(currentSalary);
  const inc = num(rawGet(raw, 'incentive') || txt(salarySheet.incentive) || txt(salarySheet.Incentive));
  const oth = num(rawGet(raw, 'others') || txt(salarySheet.Others) || txt(salarySheet.others));
  const currentTotal = [cur, inc, oth].some((n) => n != null)
    ? (cur || 0) + (inc || 0) + (oth || 0)
    : '';
  const age = rawGet(raw, 'age') || ageFromDob(dob);

  // Offer milestones
  const offerLetterIssued = Boolean(
    candidate.offer_status === 'SENT' || candidate.offer_status === 'ACCEPTED' ||
    candidate.offer_status === 'DECLINED' || raw.offerLetterIssued === true ||
    raw.offerLetterIssued === 'true' || raw.offerLetterIssued === 'Yes' ||
    candidate.current_stage === 'OFFER_RESPONSE' || candidate.current_stage === 'HIRED'
  );
  const offerCommMessage = Boolean(
    candidate.offer_status === 'SENT' || candidate.offer_status === 'ACCEPTED' ||
    candidate.offer_status === 'DECLINED' || raw.offerCommMessage === true ||
    raw.offerCommMessage === 'true' || raw.offerCommMessage === 'Yes' ||
    candidate.current_stage === 'OFFER_RESPONSE'
  );
  const offerCommCallAccepted = Boolean(
    raw.offerCommCall === true || raw.offerCommCall === 'true' || raw.offerCommCall === 'Yes' ||
    raw.offerCommCallAccepted === true || raw.offerCommCallAccepted === 'Yes'
  );
  const offerCommCallRejected = Boolean(
    raw.offerCommCallRejected === true || raw.offerCommCallRejected === 'Yes'
  );
  const docCarryMessage = Boolean(
    raw.docCarryMessage === true || raw.docCarryMessage === 'true' || raw.docCarryMessage === 'Yes'
  );
  const followUpCall = Boolean(
    raw.followUpCall === true || raw.followUpCall === 'true' || raw.followUpCall === 'Yes'
  );

  const handleUpdateAverage = async () => {
    const current = totalAverageOverride || avg100;
    const val = window.prompt('Enter new Total Average (or leave blank to auto-calculate):', current);
    if (val === null) return;
    try {
      await updateCandidateRawData(candidate.id, { totalAverage: val });
      toast.success('Total Average updated');
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
  };

  return (
    <div className={`css-sheet ${riverClass} box-border bg-white text-[10px] leading-[1.5] text-black font-sans w-[210mm] min-h-[297mm] p-[12mm_12mm] shadow-lg print:shadow-none print:border-none print:w-full print:min-h-0 print:p-[2mm_0]`}>
      <table className="w-full border-collapse border border-black table-fixed">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[6%]" />
          <col className="w-[4%]" />
          <col className="w-[9%]" />
          <col className="w-[5%]" />
          <col className="w-[6%]" />
          <col className="w-[10%]" />
          <col className="w-[18%]" />
          <col className="w-[5%]" />
          <col className="w-[7%]" />
        </colgroup>
        <tbody>
          {/* ── Row 1: Brand name + score band + SI No ── */}
          <tr>
            <Cell colSpan={5} className="text-[15px] font-bold tracking-wide h-8">
              <div className="flex items-center gap-2">
                <img src={brand.logo} alt={`${brand.name} logo`} className="h-[7mm] w-auto object-contain" />
                <span>{brand.name.toUpperCase()}</span>
              </div>
            </Cell>
            <Cell className="text-center font-bold text-[13px]">{avg100}</Cell>
            <Cell className="text-center text-[8px] font-semibold">{scoreBandLabel}</Cell>
            <Cell label className="whitespace-nowrap">Sl No</Cell>
            <Cell colSpan={4}>{candidate.candidate_id}</Cell>
          </tr>
          {/* ── Row 2: Company address + Date ── */}
          <tr>
            <Cell colSpan={7} className="text-[9px] font-bold">
              {brand.companyName.toUpperCase()}, {brand.documentAddress.toUpperCase()}
            </Cell>
            <Cell label className="whitespace-nowrap">Date :</Cell>
            <Cell colSpan={4}>{appliedOn}</Cell>
          </tr>
          {/* ── Row 3: Department banner ── */}
          <tr>
            <Cell section colSpan={12} className="text-[11px] h-6">Human Resource Department</Cell>
          </tr>
          {/* ── Row 4: CSS title + Department ── */}
          <tr>
            <Cell colSpan={9} className="font-bold text-[11px] text-center">Candidate Summary Sheet</Cell>
            <Cell label className="text-[9px] whitespace-nowrap">Department</Cell>
            <Cell colSpan={2}>{rawGet(raw, 'department') || candidate.department || ''}</Cell>
          </tr>

          {/* ── Name / Applied on / Location ── */}
          <tr>
            <Cell label>Name</Cell>
            <Cell colSpan={4}>{candidate.full_name}</Cell>
            <Cell colSpan={3} className="text-right leading-tight">Application Submitted on:</Cell>
            <Cell className="text-center font-bold">{shortDate(appliedOn) || appliedOn}</Cell>
            <Cell label>Location</Cell>
            <Cell colSpan={2}>{rawGet(raw, 'branchLocation') || candidate.branch_location || ''}</Cell>
          </tr>
          <tr>
            <Cell label>Post Applied</Cell>
            <Cell colSpan={4}>{candidate.position_applied_for && candidate.position_applied_for.toLowerCase() !== 'unknown' ? candidate.position_applied_for : ''}</Cell>
            <Cell label>Source</Cell>
            <Cell colSpan={3} className="text-center">{source}</Cell>
            <Cell label className="text-[9px] leading-tight">Specify Source</Cell>
            <Cell rowSpan={2} colSpan={2}>{specifySource}</Cell>
          </tr>
          <tr>
            <Cell label>Post Suitable</Cell>
            <Cell colSpan={4}>{rawGet(raw, 'positionSuitable')}</Cell>
            <Cell label>Age</Cell>
            <Cell colSpan={4} className="text-center">{age}</Cell>
          </tr>

          {/* ── Personal Details ── */}
          <tr>
            <Cell section colSpan={5}>Personal Details</Cell>
            <Cell label>D.O.B</Cell>
            <Cell colSpan={4} className="text-center">{shortDate(dob) || dob}</Cell>
            <Cell rowSpan={4} colSpan={2} className="text-center align-middle p-0">
              {photo ? (
                <img src={photo} alt="" className="max-w-[24mm] max-h-[28mm] w-auto h-auto mx-auto border border-black" />
              ) : (
                <div className="h-[26mm] w-[22mm] mx-auto border border-black text-[8px] text-neutral-500 flex items-center justify-center">Photo</div>
              )}
            </Cell>
          </tr>
          <tr>
            <Cell label rowSpan={2}>Contact No:</Cell>
            <Cell colSpan={4} rowSpan={2} className="align-middle">{phones.filter(Boolean).join(', ')}</Cell>
            <Cell label colSpan={3} className="bg-neutral-200 text-center whitespace-nowrap">Experience</Cell>
            <Cell colSpan={2} className="bg-neutral-200 text-center font-bold">Years</Cell>
          </tr>
          <tr>
            <Cell label colSpan={3} className="whitespace-nowrap">Total Work Experience</Cell>
            <Cell colSpan={2} className="text-center align-middle">{totalExp}</Cell>
          </tr>
          <tr>
            <Cell label>Contact Address</Cell>
            <Cell colSpan={4} className="whitespace-normal leading-tight text-[9px] py-1">
              {addr.filter(Boolean).join(', ')}
            </Cell>
            <Cell label colSpan={3} className="bg-neutral-200 italic whitespace-nowrap">Relevant Experience</Cell>
            <Cell colSpan={2} className="text-center align-middle">{relevantExp}</Cell>
          </tr>

          {/* ── Education & Family ── */}
          <tr>
            <Cell label>Educational Qualification</Cell>
            <Cell colSpan={2}>{degreeLevel}</Cell>
            <Cell colSpan={2} className="font-bold">Specialization</Cell>
            <Cell colSpan={3}>{degreeSpec}</Cell>
            <Cell label className="text-[8.5px] leading-tight">Father's Occupation</Cell>
            <Cell>{occupation(rawGet(raw, 'fatherOccupation'), rawGet(raw, 'fatherCompany'))}</Cell>
            <Cell label className="text-[8.5px] leading-tight">Sibling 1</Cell>
            <Cell>{siblingOcc(raw, 1)}</Cell>
          </tr>
          <tr>
            <Cell label>Educational Qualification</Cell>
            <Cell colSpan={2}>Plus Two</Cell>
            <Cell colSpan={2} className="font-bold">Specialization</Cell>
            <Cell colSpan={3}>{plusTwoSpec}</Cell>
            <Cell label className="text-[8.5px] leading-tight">Mother's Occupation</Cell>
            <Cell>{occupation(rawGet(raw, 'motherOccupation'), rawGet(raw, 'motherCompany'))}</Cell>
            <Cell label className="text-[8.5px] leading-tight">Sibling 2</Cell>
            <Cell>{siblingOcc(raw, 2)}</Cell>
          </tr>
          <tr>
            <Cell label>Computer Knowledge</Cell>
            <Cell colSpan={2}>{rawGet(raw, 'computerKnowledge') || computerKnowledge(raw)}</Cell>
            <Cell colSpan={2} className="font-bold">Driving Licence</Cell>
            <Cell colSpan={3}>{rawGet(raw, 'drivingLicence') || drivingLicence(raw)}</Cell>
            <Cell label className="text-[8.5px] leading-tight">Spouse Occupation</Cell>
            <Cell>{occupation(rawGet(raw, 'spouseOccupation'), rawGet(raw, 'spouseCompany'))}</Cell>
            <Cell label className="text-[8.5px] leading-tight">Sibling 3</Cell>
            <Cell>{siblingOcc(raw, 3)}</Cell>
          </tr>

          {/* ── Score Board ── */}
          <tr>
            <Cell section colSpan={12}>SCORE BOARD / TEST RESULTS (% Wise)</Cell>
          </tr>
          {/* Row 1: Technical (spans 2) — 1st Interview */}
          <tr>
            <Cell colSpan={2} rowSpan={2}>Technical Test Result</Cell>
            <Cell className="text-right" rowSpan={2}>{rawGet(raw, 'technicalResult') || (techPct != null && techPct !== '' ? Number(techPct).toFixed(2) : '0.00')}</Cell>
            <Cell rowSpan={4} colSpan={3} className="text-center font-bold">TOTAL AVERAGE</Cell>
            <Cell rowSpan={4} colSpan={3} className="text-center text-[16px] font-bold relative group">
              <div className="flex items-center justify-center gap-2">
                <span>{avg100}</span>
                <button onClick={handleUpdateAverage} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-sm print:hidden transition-opacity">
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </Cell>
            <Cell>1st Interview</Cell>
            <Cell colSpan={2} className="whitespace-nowrap">{ivDate[0]}</Cell>
          </tr>
          {/* Row 2: 2nd Interview (Technical left side spans into here) */}
          <tr>
            <Cell>2nd Interview</Cell>
            <Cell colSpan={2} className="whitespace-nowrap">{ivDate[1]}</Cell>
          </tr>
          {/* Row 3: Department (spans 2) — 3rd Interview */}
          <tr>
            <Cell colSpan={2} rowSpan={2}>Department Test Result</Cell>
            <Cell className="text-right" rowSpan={2}>{rawGet(raw, 'departmentResult') || '0.00'}</Cell>
            <Cell>3rd Interview</Cell>
            <Cell colSpan={2} className="whitespace-nowrap">{ivDate[2]}</Cell>
          </tr>
          {/* Row 4: 4th Interview (Department left side spans into here) */}
          <tr>
            <Cell>4th Interview</Cell>
            <Cell colSpan={2} className="whitespace-nowrap">{ivDate[3]}</Cell>
          </tr>

          {/* ── Employment Record ── */}
          <tr>
            <Cell section colSpan={12}>Employment Record</Cell>
          </tr>
          <tr>
            <Cell label rowSpan={2}>Organisation</Cell>
            <Cell label colSpan={2}>Period</Cell>
            <Cell label rowSpan={2}>No: of Years</Cell>
            <Cell label rowSpan={2} colSpan={2}>Designation</Cell>
            <Cell label rowSpan={2} colSpan={3}>Reason for Resignation</Cell>
            <Cell label rowSpan={2}>Total Salary</Cell>
            <Cell label rowSpan={2} colSpan={2}>Category</Cell>
          </tr>
          <tr>
            <Cell label>From</Cell>
            <Cell label>To</Cell>
          </tr>
          {finalJobs.map((job, i) => (
            <tr key={`job-${i}`} className="h-[8mm]">
              <Cell>{job.company}</Cell>
              <Cell>{shortDate(job.fromDate) || job.fromDate}</Cell>
              <Cell>{shortDate(job.toDate) || job.toDate}</Cell>
              <Cell>{job.company ? yearsBetween(job.fromDate, job.toDate) : ''}</Cell>
              <Cell colSpan={2}>{job.position}</Cell>
              <Cell colSpan={3}>{job.reason}</Cell>
              <Cell>{job.salary}</Cell>
              <Cell colSpan={2}></Cell>
            </tr>
          ))}

          {/* ── Salary Summary ── */}
          <tr>
            <Cell label>Current Salary</Cell>
            <Cell colSpan={2}>{currentSalary}</Cell>
            <Cell colSpan={3}>Remarks</Cell>
            <Cell colSpan={3}>Expected Salary</Cell>
            <Cell>{expectedSalary}</Cell>
            <Cell rowSpan={4} colSpan={2}></Cell>
          </tr>
          <tr>
            <Cell label>Incentive</Cell>
            <Cell colSpan={2}>{inc != null ? String(inc) : '0'}</Cell>
            <Cell rowSpan={3} colSpan={3}></Cell>
            <Cell colSpan={3}>Incentive</Cell>
            <Cell>{rawGet(raw, 'expectedIncentive') || '0'}</Cell>
          </tr>
          <tr>
            <Cell label>Others</Cell>
            <Cell colSpan={2}>{oth != null ? String(oth) : '0'}</Cell>
            <Cell colSpan={3}>Others</Cell>
            <Cell>{rawGet(raw, 'expectedOthers') || '0'}</Cell>
          </tr>
          <tr>
            <Cell label>Total</Cell>
            <Cell colSpan={2} className="font-bold">{currentTotal === '' ? '' : String(currentTotal)}</Cell>
            <Cell colSpan={3}>Total</Cell>
            <Cell className="font-bold">{expectedSalary}</Cell>
          </tr>

          {/* ── Interview Comments header ── */}
          <tr className="h-[6mm]">
            <Cell label className="py-0.5">Joining Time</Cell>
            <Cell className="py-0.5">{joiningDays}</Cell>
            <Cell label className="py-0.5">Days</Cell>
            <Cell colSpan={7} className="py-0.5"></Cell>
            <Cell label className="py-0.5">Grade</Cell>
            <Cell label className="py-0.5 leading-tight">Marks</Cell>
          </tr>

          {/* 4 scored interview rows */}
          {([0, 1, 2, 3] as const).map((i) => {
            const score = ivScore[i];
            const has = score !== null && score > 0;
            return (
              <tr key={`iv-${i}`} className="h-[10mm]">
                {i === 0 ? <Cell label rowSpan={4}>Interview Comments</Cell> : null}
                <Cell>{ivInterviewer[i]}</Cell>
                <Cell colSpan={8}>{ivRemarks[i]}</Cell>
                <Cell className="text-center">{has ? gradeFromTen(score) : ''}</Cell>
                <Cell className="text-center font-bold">{has ? String(score) : ''}</Cell>
              </tr>
            );
          })}

          {/* Total Marks */}
          <tr>
            <Cell colSpan={10}></Cell>
            <Cell>Total</Cell>
            <Cell className="font-bold text-center">{totalMarks10}</Cell>
          </tr>


          {/* ── Offer Milestones ── */}
          <tr className="h-[10mm]">
            {/* Offer Letter Issued */}
            <Cell label className="text-center align-middle p-1">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-bold text-[8px] leading-tight">Offer Letter Issued</span>
                <span className="text-[14px] font-bold leading-none">{offerLetterIssued ? '☑' : '☐'}</span>
              </div>
            </Cell>
            {/* Offer Communication Message */}
            <Cell label colSpan={3} className="text-center align-middle p-1">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-bold text-[8px] leading-tight">Offer Communication Message</span>
                <span className="text-[14px] font-bold leading-none">{offerCommMessage ? '☑' : '☐'}</span>
              </div>
            </Cell>
            {/* Offer Communicated Call — Accepted / Rejected sub-cells */}
            <Cell label colSpan={4} className="p-0">
              <div className="flex flex-col h-full">
                <div className="text-center font-bold text-[8px] border-b border-black py-0.5 px-1">
                  Offer Communicated Call
                </div>
                <div className="flex flex-1">
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-black py-0.5 px-1">
                    <span className="text-[7.5px] font-semibold">Accepted</span>
                    <span className="text-[13px] font-bold leading-none">{offerCommCallAccepted ? '☑' : '☐'}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center py-0.5 px-1">
                    <span className="text-[7.5px] font-semibold">Rejected</span>
                    <span className="text-[13px] font-bold leading-none">{offerCommCallRejected ? '☑' : '☐'}</span>
                  </div>
                </div>
              </div>
            </Cell>
            {/* Document Carry Message */}
            <Cell label colSpan={2} className="text-center align-middle p-1">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-bold text-[8px] leading-tight">Document Carry Message</span>
                <span className="text-[14px] font-bold leading-none">{docCarryMessage ? '☑' : '☐'}</span>
              </div>
            </Cell>
            {/* Follow Up Call */}
            <Cell label className="text-center align-middle p-1">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-bold text-[8px] leading-tight">Follow Up Call (N-1)</span>
                <span className="text-[14px] font-bold leading-none">{followUpCall ? '☑' : '☐'}</span>
              </div>
            </Cell>
            {/* Date Of Joining */}
            <Cell label className="text-center align-middle p-1">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-bold text-[8px] leading-tight">Date Of Joining</span>
                <span className="font-bold text-[9px] text-black">{doj || '—'}</span>
              </div>
            </Cell>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
