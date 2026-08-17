import type { ReactNode } from 'react';
import type { Candidate, Evaluation } from '../../types';
import { previousJobsFromForm, type CandidateFormData, type PreviousJob } from '../../pages/candidates/wizard/wizardTypes';
import { formatSource } from '../../lib/stages';
import { formatDate } from '../../lib/dateTime';

interface CandidateSummarySheetProps {
  candidate: Candidate;
  evaluations: Evaluation[];
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

const INTERVIEW_ORDER = [
  'BRANCH_HR',
  'DEPT_HEAD',
  'HQ_INTERVIEW_1',
  'HQ_INTERVIEW_2',
  'GM_LEVEL',
  'HQ_INTERVIEW',
] as const;

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
      className={`border border-black px-[3px] py-px align-middle ${
        section ? 'font-bold text-center bg-neutral-200' : label ? 'font-bold' : ''
      } ${className}`}
    >
      {children ?? ''}
    </td>
  );
}

export function CandidateSummarySheet({ candidate, evaluations }: CandidateSummarySheetProps) {
  const raw = (candidate.profile?.raw_data || {}) as Record<string, unknown>;
  const salarySheet = (candidate.salary_data || {}) as Record<string, unknown>;
  const jobs = [...previousJobsFromForm(raw as unknown as CandidateFormData)];
  if (!jobs.length && candidate.profile?.current_company) {
    jobs.push({
      ...EMPTY_JOB,
      company: candidate.profile.current_company,
      position: rawGet(raw, 'prevPosition'),
      salary: rawGet(raw, 'currentSalary', 'prev1Salary'),
    });
  }
  while (jobs.length < 6) jobs.push(EMPTY_JOB);

  const photo = candidate.profile?.photo_url;
  const dob = rawGet(raw, 'dateOfBirth');
  const appliedOn = fmtDate(
    rawGet(raw, 'appliedDate') || candidate.pre_form_submitted_at || candidate.applied_at,
  );
  const sourceValue =
    (candidate.source && candidate.source !== 'Unknown' ? candidate.source : '') ||
    rawGet(raw, 'sourceOfOpening', 'source');
  const source = sourceValue ? formatSource(sourceValue) : '';
  const specifySource = txt(candidate.source_reference) || rawGet(raw, 'referredBy');
  const phones = [candidate.phone, rawGet(raw, 'mobileNumber')]
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
  const joiningDays = rawGet(raw, 'noticePeriod');
  const doj = fmtDate(rawGet(raw, 'expectedJoiningDate') || candidate.profile?.joining_date);
  const pg = eduValue(
    rawGet(raw, 'postGradCourse'),
    rawGet(raw, 'postGradCollege'),
    rawGet(raw, 'postGradPercentage'),
  );
  const degree = eduValue(
    rawGet(raw, 'gradCourse'),
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
  const degreeLevel = pg ? 'PG' : degree ? 'Degree' : sslc && !plusTwo ? 'SSLC' : 'Degree';
  const degreeSpec = pg || degree || (!plusTwo ? sslc : '');
  const plusTwoSpec = plusTwo || (pg || degree ? sslc : '');

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

  const scored = ranked
    .map((e) => Number(e.scores?.total_score))
    .filter((n) => Number.isFinite(n) && n > 0);
  const marks100 = scored.map((n) => Math.round(n * 10));
  const avg100 = marks100.length ? Math.round(marks100.reduce((a, b) => a + b, 0) / marks100.length) : '';
  const totalMarks10 = scored.length ? scored.reduce((a, b) => a + b, 0) : '';

  const cur = num(currentSalary);
  const inc = num(rawGet(raw, 'incentive') || txt(salarySheet.incentive) || txt(salarySheet.Incentive));
  const oth = num(rawGet(raw, 'others') || txt(salarySheet.Others) || txt(salarySheet.others));
  const currentTotal = [cur, inc, oth].some((n) => n != null)
    ? (cur || 0) + (inc || 0) + (oth || 0)
    : '';
  const age = rawGet(raw, 'age') || ageFromDob(dob);

  return (
    <div className="css-sheet box-border bg-white text-[8.5px] leading-[1.2] text-black font-sans w-[210mm] min-h-[297mm] p-[4mm]">
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
            <Cell colSpan={4}>{appliedOn}</Cell>
          </tr>
          <tr>
            <Cell section colSpan={12} className="text-[11px] h-6">Human Resource Department</Cell>
          </tr>
          <tr>
            <Cell colSpan={10} className="font-bold text-[11px]">Candidate Summary Sheet</Cell>
            <Cell label>Department</Cell>
            <Cell>{candidate.department || ''}</Cell>
          </tr>

          <tr>
            <Cell label>Name</Cell>
            <Cell colSpan={4}>{candidate.full_name}</Cell>
            <Cell colSpan={4}>Application Submitted on:</Cell>
            <Cell>{appliedOn}</Cell>
            <Cell label>Location</Cell>
            <Cell>{candidate.branch_location || ''}</Cell>
          </tr>
          <tr>
            <Cell label>Post Applied</Cell>
            <Cell colSpan={4}>{candidate.position_applied_for || ''}</Cell>
            <Cell label>Source</Cell>
            <Cell colSpan={3}>{source}</Cell>
            <Cell>Specify Source</Cell>
            <Cell rowSpan={2} colSpan={2}>{specifySource}</Cell>
          </tr>
          <tr>
            <Cell label>Post Suitable</Cell>
            <Cell colSpan={4}>{rawGet(raw, 'positionSuitable')}</Cell>
            <Cell label>Age</Cell>
            <Cell colSpan={4}>{age}</Cell>
          </tr>

          <tr>
            <Cell section colSpan={5}>Personal Details</Cell>
            <Cell label rowSpan={2}>Date of Birth</Cell>
            <Cell rowSpan={2} colSpan={4}>{fmtDate(dob)}</Cell>
            <Cell rowSpan={8} colSpan={2} className="text-center align-middle p-0.5">
              {photo ? (
                <img src={photo} alt="" className="h-[28mm] w-[22mm] object-cover mx-auto border border-black" />
              ) : (
                <div className="h-[28mm] w-[22mm] mx-auto border border-black text-[8px] text-neutral-500 flex items-center justify-center">Photo</div>
              )}
            </Cell>
          </tr>
          <tr>
            <Cell label rowSpan={2}>Contact No:</Cell>
            <Cell colSpan={4}>{phones[0] || ''}</Cell>
          </tr>
          <tr>
            <Cell colSpan={4}>{phones[1] || ''}</Cell>
            <Cell label colSpan={2}>Experience</Cell>
            <Cell colSpan={3}>Years</Cell>
          </tr>
          <tr>
            <Cell label rowSpan={5}>Contact Address</Cell>
            <Cell colSpan={4}>{addr[0]}</Cell>
            <Cell colSpan={2}>Total Work Experience</Cell>
            <Cell colSpan={3} rowSpan={2}>{totalExp}</Cell>
          </tr>
          <tr>
            <Cell colSpan={4}>{addr[1]}</Cell>
            <Cell colSpan={2}></Cell>
          </tr>
          <tr>
            <Cell colSpan={4}>{addr[2]}</Cell>
            <Cell label colSpan={2} className="italic">Relevant Experience</Cell>
            <Cell colSpan={3} rowSpan={3}>{relevantExp}</Cell>
          </tr>
          <tr>
            <Cell colSpan={4}>{addr[3]}</Cell>
          </tr>
          <tr>
            <Cell colSpan={4}>{addr[4]}</Cell>
          </tr>

          <tr>
            <Cell label>Educational Qualification</Cell>
            <Cell colSpan={2}>{degreeLevel}</Cell>
            <Cell colSpan={2} className="font-bold">Specialization</Cell>
            <Cell colSpan={3}>{degreeSpec}</Cell>
            <Cell label>Father's Occupation</Cell>
            <Cell>{occupation(rawGet(raw, 'fatherOccupation'), rawGet(raw, 'fatherCompany'))}</Cell>
            <Cell label>Siblings 1 Occupation</Cell>
            <Cell>{siblingOcc(raw, 1)}</Cell>
          </tr>
          <tr>
            <Cell label>Educational Qualification</Cell>
            <Cell colSpan={2}>Plus Two</Cell>
            <Cell colSpan={2} className="font-bold">Specialization</Cell>
            <Cell colSpan={3}>{plusTwoSpec}</Cell>
            <Cell label>Mother's Occupation</Cell>
            <Cell>{occupation(rawGet(raw, 'motherOccupation'), rawGet(raw, 'motherCompany'))}</Cell>
            <Cell label>Siblings 2 Occupation</Cell>
            <Cell>{siblingOcc(raw, 2)}</Cell>
          </tr>
          <tr>
            <Cell label>Computer Knowledge</Cell>
            <Cell colSpan={2}>{computerKnowledge(raw)}</Cell>
            <Cell colSpan={2} className="font-bold">Driving Licence</Cell>
            <Cell colSpan={3}>{drivingLicence(raw)}</Cell>
            <Cell label>Spouse Occupation</Cell>
            <Cell>{occupation(rawGet(raw, 'spouseOccupation'), rawGet(raw, 'spouseCompany'))}</Cell>
            <Cell label>Siblings 3 Occupation</Cell>
            <Cell>{siblingOcc(raw, 3)}</Cell>
          </tr>

          <tr>
            <Cell section colSpan={12}>SCORE BOARD / TEST RESULTS (% Wise)</Cell>
          </tr>
          <tr>
            <Cell colSpan={2}>Psychometry test Result</Cell>
            <Cell></Cell>
            <Cell rowSpan={4} colSpan={3} className="text-center font-bold">TOTAL AVERAGE</Cell>
            <Cell rowSpan={4} colSpan={3} className="text-center text-[16px] font-bold">{avg100}</Cell>
            <Cell colSpan={2}>1st Interview</Cell>
            <Cell>{interviews[0] ? fmtDate(interviews[0].scheduled_time || interviews[0].updated_at) : ''}</Cell>
          </tr>
          <tr>
            <Cell colSpan={2}>Analytical Test Result</Cell>
            <Cell></Cell>
            <Cell colSpan={2}>2nd Interview</Cell>
            <Cell>{interviews[1] ? fmtDate(interviews[1].scheduled_time || interviews[1].updated_at) : ''}</Cell>
          </tr>
          <tr>
            <Cell colSpan={2}>Technical Test Result</Cell>
            <Cell>{techPct != null && techPct !== '' ? Number(techPct).toFixed(2) : ''}</Cell>
            <Cell colSpan={2}>3rd Interview</Cell>
            <Cell>{interviews[2] ? fmtDate(interviews[2].scheduled_time || interviews[2].updated_at) : ''}</Cell>
          </tr>
          <tr>
            <Cell colSpan={2}>Department Test Result</Cell>
            <Cell></Cell>
            <Cell colSpan={2}>4th Interview</Cell>
            <Cell>{interviews[3] ? fmtDate(interviews[3].scheduled_time || interviews[3].updated_at) : ''}</Cell>
          </tr>

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
              <Cell>{job.company}</Cell>
              <Cell>{fmtDate(job.fromDate) || job.fromDate}</Cell>
              <Cell>{fmtDate(job.toDate) || job.toDate}</Cell>
              <Cell>{yearsBetween(job.fromDate, job.toDate)}</Cell>
              <Cell colSpan={2}>{job.position}</Cell>
              <Cell colSpan={3}>{job.reason}</Cell>
              <Cell colSpan={2}>{job.salary}</Cell>
              <Cell></Cell>
            </tr>
          ))}

          <tr>
            <Cell label>Current Salary</Cell>
            <Cell colSpan={2}>{currentSalary}</Cell>
            <Cell colSpan={3}>Remarks</Cell>
            <Cell colSpan={3}>Expected Salary</Cell>
            <Cell colSpan={2}>{expectedSalary}</Cell>
            <Cell rowSpan={4}></Cell>
          </tr>
          <tr>
            <Cell label>Incentive</Cell>
            <Cell colSpan={2}>{inc != null ? String(inc) : ''}</Cell>
            <Cell rowSpan={3} colSpan={3}></Cell>
            <Cell colSpan={3}>Incentive</Cell>
            <Cell colSpan={2}></Cell>
          </tr>
          <tr>
            <Cell label>Others</Cell>
            <Cell colSpan={2}>{oth != null ? String(oth) : ''}</Cell>
            <Cell colSpan={3}>Others</Cell>
            <Cell colSpan={2}></Cell>
          </tr>
          <tr>
            <Cell label>Total</Cell>
            <Cell colSpan={2} className="font-bold">{currentTotal === '' ? '' : String(currentTotal)}</Cell>
            <Cell colSpan={3}>Total</Cell>
            <Cell colSpan={2} className="font-bold">{expectedSalary}</Cell>
          </tr>

          <tr>
            <Cell label>Joining Time</Cell>
            <Cell>{joiningDays}</Cell>
            <Cell label>Days</Cell>
            <Cell colSpan={7}></Cell>
            <Cell label>Grade</Cell>
            <Cell label>Marks (Maximum 10)</Cell>
          </tr>
          {([0, 1, 2, 3] as const).map((i) => {
            const ev = interviews[i];
            const score = ev ? Number(ev.scores?.total_score) : NaN;
            const has = Number.isFinite(score) && score > 0;
            return (
              <tr key={`iv-${i}`} className="h-[11mm]">
                {i === 0 ? <Cell label rowSpan={4}>Interview Comments</Cell> : null}
                <Cell>{ev ? txt(ev.scores?.interviewer_name) : ''}</Cell>
                <Cell colSpan={8}>{ev?.remarks || ''}</Cell>
                <Cell className="text-center">{has ? gradeFromTen(score) : ''}</Cell>
                <Cell className="text-center font-bold">{has ? String(score) : ''}</Cell>
              </tr>
            );
          })}
          <tr>
            <Cell colSpan={10}></Cell>
            <Cell>Total Marks</Cell>
            <Cell className="font-bold text-center">{totalMarks10}</Cell>
          </tr>
          <tr className="h-[14mm]">
            <Cell label colSpan={2} className="align-top">CMD</Cell>
            <Cell colSpan={10}></Cell>
          </tr>
          <tr className="h-[10mm]">
            <Cell label>Offer Letter Issued</Cell>
            <Cell label colSpan={3}>Offer Communication Message</Cell>
            <Cell label colSpan={4}>Offer Communicationed Call</Cell>
            <Cell label colSpan={2}>Document Carry Message</Cell>
            <Cell>Follow Up Call (N-1)</Cell>
            <Cell label>Date Of Joining{doj ? ` ${doj}` : ''}</Cell>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
