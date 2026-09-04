import { useEffect, useState, type ReactNode } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Candidate } from '../../types';
import { formatDate } from '../../lib/dateTime';
import { fetchCandidateResumeBlob } from '../../api/candidates';
import { PdfViewer, DocxViewer } from '../ui';

interface InterviewApplicationFormDocumentProps {
  candidate: Candidate;
  hideResume?: boolean;
  afterDeclaration?: ReactNode;
}

function isPdfContent(contentType?: string, fileName?: string): boolean {
  const ct = (contentType || '').toLowerCase();
  const fn = (fileName || '').toLowerCase();
  return ct.includes('pdf') || fn.endsWith('.pdf') || fn.includes('.pdf?');
}

function val(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function asBool(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 'Yes' || value === 'yes') return true;
  if (value === false || value === 'false' || value === 'No' || value === 'no') return false;
  return undefined;
}

function fmtDate(value: unknown): string {
  const s = val(value);
  if (!s) return '';
  return formatDate(s);
}

function Tick({ on }: { on: boolean | undefined }) {
  return (
    <span className="whitespace-nowrap">
      Yes <span className="iaf-tick inline-block w-3 h-3 border text-[10px] leading-[10px] text-center align-middle mx-0.5">{on === true ? '✓' : ''}</span>
      {' '}No <span className="iaf-tick inline-block w-3 h-3 border text-[10px] leading-[10px] text-center align-middle mx-0.5">{on === false ? '✓' : ''}</span>
    </span>
  );
}

function Line({ children, className = '' }: { children?: string; className?: string }) {
  return (
    <span className={`iaf-line inline-block min-w-[2.5rem] px-0.5 font-semibold leading-tight ${className}`}>
      {children || '\u00a0'}
    </span>
  );
}

function Th({ children, className = '', colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`iaf-th border font-bold text-center uppercase tracking-wide py-1 px-1.5 text-[11px] ${className}`}>
      {children}
    </td>
  );
}

function Td({ children, className = '', colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border px-1.5 py-1 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function InterviewApplicationFormDocument({
  candidate,
  hideResume = false,
  afterDeclaration,
}: InterviewApplicationFormDocumentProps) {
  const d = (candidate.profile?.raw_data ?? {}) as Record<string, unknown>;
  const photoUrl = candidate.profile?.photo_url;
  const applied = d.appliedDate || candidate.pre_form_submitted_at || candidate.applied_at || candidate.created_at;
  const rawPos = candidate.position_applied_for || d.positionAppliedFor;
  const position = typeof rawPos === 'string' && rawPos.toLowerCase() !== 'unknown' ? rawPos : '';
  const openingType = candidate.opening_type;
  const email = d.emailId || candidate.email || candidate.profile?.email;
  const mobile = d.contactNumber || d.mobileNumber || d.mobile || candidate.phone || candidate.profile?.phone;

  const [resumeData, setResumeData] = useState<{
    blob: Blob | null;
    blobUrl: string;
    fileName: string;
    contentType: string;
    sourceUrl: string;
  } | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    if (hideResume || !candidate?.id) return;
    const controller = new AbortController();
    setResumeLoading(true);

    fetchCandidateResumeBlob(candidate.id, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const blobUrl = URL.createObjectURL(data.blob);
        setResumeData({
          blob: data.blob,
          blobUrl,
          fileName: data.fileName,
          contentType: data.contentType,
          sourceUrl: data.sourceUrl,
        });
      })
      .catch(() => {
        // Silently skip if no resume is found
      })
      .finally(() => {
        if (!controller.signal.aborted) setResumeLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [candidate?.id, hideResume]);

  const family = [
    { rel: 'Father', name: d.fatherName, age: d.fatherAge, occ: d.fatherOccupation, co: d.fatherCompany, ph: d.fatherPhone },
    { rel: 'Mother', name: d.motherName, age: d.motherAge, occ: d.motherOccupation, co: d.motherCompany, ph: d.motherPhone },
    { rel: 'Spouse', name: d.spouseName, age: d.spouseAge, occ: d.spouseOccupation, co: d.spouseCompany, ph: d.spousePhone },
    { rel: val(d.child1Relation) || 'Son / Daughter', name: d.child1Name, age: d.child1Age, occ: d.child1Occupation, co: d.child1Company, ph: d.child1Phone },
    { rel: val(d.child2Relation) || 'Son / Daughter', name: d.child2Name, age: d.child2Age, occ: d.child2Occupation, co: d.child2Company, ph: d.child2Phone },
    { rel: val(d.child3Relation) || 'Son / Daughter', name: d.child3Name, age: d.child3Age, occ: d.child3Occupation, co: d.child3Company, ph: d.child3Phone },
    { rel: val(d.sibling1Relation) || 'Brother / Sister', name: d.sibling1Name, age: d.sibling1Age, occ: d.sibling1Occupation, co: d.sibling1Company, ph: d.sibling1Phone },
    { rel: val(d.sibling2Relation) || 'Brother / Sister', name: d.sibling2Name, age: d.sibling2Age, occ: d.sibling2Occupation, co: d.sibling2Company, ph: d.sibling2Phone },
    { rel: val(d.sibling3Relation) || 'Brother / Sister', name: d.sibling3Name, age: d.sibling3Age, occ: d.sibling3Occupation, co: d.sibling3Company, ph: d.sibling3Phone },
  ].filter((row) => val(row.name));

  const listedJobs = Array.isArray(d.previousJobs)
    ? d.previousJobs
        .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
        .map((row) => ({
          co: row.company ?? row.co,
          pos: row.position ?? row.pos,
          rep: row.reporting ?? row.rep,
          repDesignation: row.reportingDesignation ?? row.repDesignation,
          repPhone: row.reportingPhone ?? row.repPhone,
          from: row.fromDate ?? row.from,
          to: row.toDate ?? row.to,
          sal: row.salary ?? row.sal,
          reason: row.reason,
        }))
    : [];
  const jobs = (listedJobs.length
    ? listedJobs
    : [
        { co: d.prevCompanyName, pos: d.prevPosition, rep: d.prev1Reporting, repDesignation: d.prev1ReportingDesignation, repPhone: d.prev1ReportingPhone, from: d.prev1From, to: d.prev1To, sal: d.prev1Salary, reason: d.prev1Reason },
        { co: d.prev2Name, pos: d.prev2Position, rep: d.prev2Reporting, repDesignation: d.prev2ReportingDesignation, repPhone: d.prev2ReportingPhone, from: d.prev2From, to: d.prev2To, sal: d.prev2Salary, reason: d.prev2Reason },
        { co: d.prev3Name, pos: d.prev3Position, rep: d.prev3Reporting, repDesignation: d.prev3ReportingDesignation, repPhone: d.prev3ReportingPhone, from: d.prev3From, to: d.prev3To, sal: d.prev3Salary, reason: d.prev3Reason },
        { co: d.prev4Name, pos: d.prev4Position, rep: d.prev4Reporting, repDesignation: d.prev4ReportingDesignation, repPhone: d.prev4ReportingPhone, from: d.prev4From, to: d.prev4To, sal: d.prev4Salary, reason: d.prev4Reason },
      ]
  ).filter((job) => val(job.co) || val(job.pos));

  const computer = [
    d.compWord && 'MS Word',
    d.compExcel && 'MS Excel',
    d.compPowerPoint && 'PowerPoint',
    d.compTally && 'Tally',
    d.compOther && 'Other',
  ].filter(Boolean).join(', ');
  const driveTypes = [d.drive2Wheeler && '2W', d.drive3Wheeler && '3W', d.drive4Wheeler && '4W', d.driveHeavy && 'Heavy']
    .filter(Boolean)
    .join(', ');

  const general = [
    ['a', 'Terminated / asked to resign?', d.prevTerminated],
    ['b', 'Nervous disorder?', d.nervousDisorder],
    ['c', 'Physical disabilities?', d.physicalDisability],
    ['d', 'Eye / colour / night blindness?', d.eyeVision],
    ['e', 'Convicted of crime other than minor offence?', d.criminalConviction],
  ] as const;

  const hasGrad = !!(val(d.gradCollege) || val(d.gradCourse) || val(d.gradStream) || val(d.gradPercentage));
  const hasPg = !!(val(d.postGradCollege) || val(d.postGradCourse) || val(d.postGradStream) || val(d.postGradPercentage));
  const hasEmergency2 = !!(val(d.emergency2Name) || val(d.emergency2Contact));
  const hasExtra = !!(val(d.achievements) || val(d.hobbies));

  return (
    <div className="iaf-doc">
      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 OF 2: Personal Data, Education, Family & Employment Record
         ══════════════════════════════════════════════════════════════════ */}
      <div className="iaf-page-wrap">
        <div className="no-print mb-2.5 flex items-center justify-between px-3.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-black">1</span>
            <span className="text-[#1e3a5f] tracking-wide">PAGE 1 OF 2 (A4)</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium hidden sm:inline">Personal Data · Education · Family Details · Employment Record</span>
        </div>

        <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.38] antialiased">
          <div>
            {/* Header Block */}
            <div className="flex items-start gap-3 mb-2">
              <img
                src="/nippon-toyota-logo.png"
                alt="Nippon Toyota"
                className="h-[13mm] w-auto object-contain shrink-0 bg-transparent"
              />
              <div className="flex-1 text-center min-w-0 pt-0.5">
                <div className="font-bold text-[15px] tracking-[0.04em] uppercase leading-tight">
                  Nippon Motor Corporation Pvt Ltd
                </div>
                <div className="text-[10px] leading-tight mt-1 text-slate-600">
                  XIX/9C, Nippon Towers, NH-47, HMT Junction, Kalamassery P.O., Kochi – 683104
                </div>
                <div className="text-[10px] leading-tight text-slate-600">
                  Ph: 0484-2860331 / 8606986060 &nbsp;|&nbsp; E-Mail: recruitment@nippontoyota.com
                </div>
              </div>
              <div className="shrink-0 text-right pt-0.5">
                <div className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-500">Candidate ID</div>
                <div className="text-[14px] font-black tracking-wide text-[#1e3a5f] border border-[#1e3a5f] rounded px-2 py-0.5">{candidate.candidate_id}</div>
              </div>
            </div>
            <div className="iaf-rule border-t-2 mb-0" />
            <div className="iaf-title font-bold text-[13px] uppercase tracking-[0.12em] text-center py-1.5 mb-2.5 border-x border-b">
              Interview Application Form
            </div>

            {/* Opening & Basic Metadata */}
            <table className="w-full border-collapse border border-black mb-2.5">
              <tbody>
                <tr>
                  <Td colSpan={2} className="py-1.5 px-2">
                    Type of opening
                    {' '}New Opening <span className="iaf-tick inline-block w-3.5 h-3.5 border text-[11px] leading-[12px] text-center align-middle mx-1">{openingType === 'New opening' ? '✓' : ''}</span>
                    {' '}Replacement <span className="iaf-tick inline-block w-3.5 h-3.5 border text-[11px] leading-[12px] text-center align-middle mx-1">{openingType === 'Replacement' ? '✓' : ''}</span>
                  </Td>
                </tr>
                <tr>
                  <Td className="w-[42%] py-1.5 px-2">Mobile Number <Line className="min-w-[8.5rem]">{val(mobile)}</Line></Td>
                  <Td className="py-1.5 px-2">Date of Application <Line className="min-w-[7rem]">{fmtDate(applied)}</Line></Td>
                </tr>
                <tr>
                  <Td className="py-1.5 px-2">
                    Position Applied For <Line className="min-w-[7.5rem]">{val(position)}</Line>
                    {val(d.branchName) ? (
                      <span> · Branch <Line>{val(d.branchName)}</Line></span>
                    ) : null}
                  </Td>
                  <Td className="py-1.5 px-2">Position Suitable <Line className="min-w-[7.5rem]">{val(d.positionSuitable)}</Line></Td>
                </tr>
              </tbody>
            </table>

            {/* 1. Personal Data */}
            <table className="w-full border-collapse border border-black mb-2.5">
              <tbody>
                <tr>
                  <Th colSpan={2} className="py-1.5 px-2">1. Personal Data</Th>
                </tr>
                <tr>
                  <td className="border p-2 align-top w-[78%]">
                    <div className="mb-1.5">
                      Full Name <Line className="min-w-[70%]">{candidate.full_name}</Line>
                      {val(d.nameAadhaar) && val(d.nameAadhaar) !== candidate.full_name ? (
                        <div className="mt-1">Name as per Aadhaar <Line className="min-w-[60%]">{val(d.nameAadhaar)}</Line></div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
                      <div>
                        <div className="font-bold mb-1">Permanent Address</div>
                        <div className="py-0.5">House Name: <Line className="min-w-[60%]">{val(d.permHouseName)}</Line></div>
                        <div className="py-0.5">Post Office: <Line className="min-w-[60%]">{val(d.permPostOffice)}</Line></div>
                        <div className="py-0.5">Landmark: <Line className="min-w-[60%]">{val(d.permLandmark)}</Line></div>
                        <div className="py-0.5">District: <Line className="min-w-[60%]">{val(d.permDistrict)}</Line></div>
                        <div className="py-0.5">Pincode: <Line className="min-w-[60%]">{val(d.permPinCode)}</Line></div>
                      </div>
                      <div>
                        <div className="font-bold mb-1">Present Address</div>
                        <div className="py-0.5">House Name: <Line className="min-w-[60%]">{val(d.sameAsPermanent ? d.permHouseName : d.presHouseName)}</Line></div>
                        <div className="py-0.5">Post Office: <Line className="min-w-[60%]">{val(d.sameAsPermanent ? d.permPostOffice : d.presPostOffice)}</Line></div>
                        <div className="py-0.5">Landmark: <Line className="min-w-[60%]">{val(d.sameAsPermanent ? d.permLandmark : d.presLandmark)}</Line></div>
                        <div className="py-0.5">District: <Line className="min-w-[60%]">{val(d.sameAsPermanent ? d.permDistrict : d.presDistrict)}</Line></div>
                        <div className="py-0.5">Pincode: <Line className="min-w-[60%]">{val(d.sameAsPermanent ? d.permPinCode : d.presPinCode)}</Line></div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Age <Line className="min-w-[2rem]">{val(d.age)}</Line></span>
                      <span>DOB <Line className="min-w-[5rem]">{fmtDate(d.dateOfBirth)}</Line></span>
                      <span>Height <Line className="min-w-[2rem]">{val(d.height)}</Line></span>
                      <span>Weight <Line className="min-w-[2rem]">{val(d.weight)}</Line></span>
                      <span>Blood Group <Line className="min-w-[2.2rem]">{val(d.bloodGroup)}</Line></span>
                      <span>Gender <Line className="min-w-[2.5rem]">{val(d.gender)}</Line></span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      <span>Marital Status <Line className="min-w-[5rem]">{val(d.maritalStatus)}</Line></span>
                      <span>Religion &amp; Caste <Line className="min-w-[7.5rem]">{val(d.religionCaste)}</Line></span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <span>Languages – Read <Line className="min-w-[50%]">{val(d.languagesRead)}</Line></span>
                      <span>Write <Line className="min-w-[50%]">{val(d.languagesWrite)}</Line></span>
                      <span>Speak <Line className="min-w-[50%]">{val(d.languagesSpeak)}</Line></span>
                      <span>Other <Line className="min-w-[50%]">{val(d.languagesOther)}</Line></span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      <span>Valid Driving License <Tick on={asBool(d.hasValidDrivingLicense ?? (d.drivingLicenseNumber ? true : false))} /></span>
                      {(d.hasValidDrivingLicense || d.confidentToDrive || driveTypes) ? (
                        <span>Confident to Drive <Tick on={asBool(d.confidentToDrive)} />{driveTypes ? <span> ({driveTypes})</span> : null}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="border w-[22%] p-2 align-top text-center">
                    <div className="text-[9.5px] font-bold uppercase mb-1 text-slate-500">Photo</div>
                    <div className="w-full aspect-[3/4] max-h-[50mm] mx-auto overflow-hidden border bg-white flex items-center justify-center">
                      {photoUrl ? (
                        <img src={photoUrl} alt="" className="h-full w-full object-cover object-left-top" />
                      ) : (
                        <div className="text-neutral-400 text-[10.5px]">Photo</div>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Educational Qualification */}
            <table className="w-full border-collapse border border-black mb-2.5">
              <thead>
                <tr><Th colSpan={6} className="py-1.5 px-2">Educational Qualification</Th></tr>
                <tr>
                  <Td className="font-semibold text-center w-[18%] py-1.5 px-2">Qualification</Td>
                  <Td className="font-semibold text-center py-1.5 px-2">School / College</Td>
                  <Td className="font-semibold text-center w-[16%] py-1.5 px-2">Course</Td>
                  <Td className="font-semibold text-center w-[10%] py-1.5 px-2">Marks</Td>
                  <Td className="font-semibold text-center w-[12%] py-1.5 px-2">Passing Year</Td>
                  <Td className="font-semibold text-center w-[12%] py-1.5 px-2">Mode</Td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td className="py-1.5 px-2">10th</Td>
                  <Td className="py-1.5 px-2">{val(d.class10School)}</Td>
                  <Td className="py-1.5 px-2">{val(d.class10Board)}</Td>
                  <Td className="text-center py-1.5 px-2">{val(d.class10Percentage)}</Td>
                  <Td className="text-center py-1.5 px-2">{val(d.class10PassingYear)}</Td>
                  <Td className="text-center py-1.5 px-2">{val(d.class10Mode)}</Td>
                </tr>
                <tr>
                  <Td className="py-1.5 px-2">12th</Td>
                  <Td className="py-1.5 px-2">{val(d.class12School)}</Td>
                  <Td className="py-1.5 px-2">{val(d.class12Stream)}</Td>
                  <Td className="text-center py-1.5 px-2">{val(d.class12Percentage)}</Td>
                  <Td className="text-center py-1.5 px-2">{val(d.class12PassingYear)}</Td>
                  <Td className="text-center py-1.5 px-2">{val(d.class12Mode)}</Td>
                </tr>
                {hasGrad && (
                  <tr>
                    <Td className="py-1.5 px-2">Graduation / Diploma</Td>
                    <Td className="py-1.5 px-2">{val(d.gradCollege)}</Td>
                    <Td className="py-1.5 px-2">{[val(d.gradCourse), val(d.gradStream)].filter(Boolean).join(' - ')}</Td>
                    <Td className="text-center py-1.5 px-2">{val(d.gradPercentage)}</Td>
                    <Td className="text-center py-1.5 px-2">{val(d.gradPassingYear)}</Td>
                    <Td className="text-center py-1.5 px-2">{val(d.gradMode)}</Td>
                  </tr>
                )}
                {hasPg && (
                  <tr>
                    <Td className="py-1.5 px-2">Post-Graduation / Diploma</Td>
                    <Td className="py-1.5 px-2">{val(d.postGradCollege)}</Td>
                    <Td className="py-1.5 px-2">{[val(d.postGradCourse), val(d.postGradStream)].filter(Boolean).join(' - ')}</Td>
                    <Td className="text-center py-1.5 px-2">{val(d.postGradPercentage)}</Td>
                    <Td className="text-center py-1.5 px-2">{val(d.postGradPassingYear)}</Td>
                    <Td className="text-center py-1.5 px-2">{val(d.postGradMode)}</Td>
                  </tr>
                )}
                <tr>
                  <Td colSpan={6} className="py-1.5 px-2">Computer Knowledge <Line className="min-w-[70%]">{computer}</Line></Td>
                </tr>
                {val(d.softwareCerts) ? (
                  <tr>
                    <Td colSpan={6} className="py-1.5 px-2">Other Software / Certifications <Line className="min-w-[55%]">{val(d.softwareCerts)}</Line></Td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* Family Details */}
            {family.length > 0 && (
              <table className="w-full border-collapse border border-black mb-2.5">
                <thead>
                  <tr><Th colSpan={6} className="py-1.5 px-2">Family Details</Th></tr>
                  <tr>
                    <Td className="font-semibold text-center w-[16%] py-1.5 px-2">Relationship</Td>
                    <Td className="font-semibold text-center py-1.5 px-2">Name</Td>
                    <Td className="font-semibold text-center w-[8%] py-1.5 px-2">Age</Td>
                    <Td className="font-semibold text-center w-[16%] py-1.5 px-2">Occupation</Td>
                    <Td className="font-semibold text-center py-1.5 px-2">Company / School Name</Td>
                    <Td className="font-semibold text-center w-[16%] py-1.5 px-2">Mobile Number</Td>
                  </tr>
                </thead>
                <tbody>
                  {family.map((row) => (
                    <tr key={row.rel + val(row.name)}>
                      <Td className="py-1.5 px-2">{row.rel}</Td>
                      <Td className="py-1.5 px-2">{val(row.name)}</Td>
                      <Td className="text-center py-1.5 px-2">{val(row.age)}</Td>
                      <Td className="py-1.5 px-2">{val(row.occ)}</Td>
                      <Td className="py-1.5 px-2">{val(row.co)}</Td>
                      <Td className="py-1.5 px-2">{val(row.ph)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Employment Record */}
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr><Th colSpan={8} className="py-1.5 px-2">2. Employment Record</Th></tr>
                <tr>
                  <Td colSpan={3} className="py-1.5 px-2">
                    Do you have any experience before? <Tick on={asBool(d.previousExperience)} />
                  </Td>
                  <Td colSpan={3} className="py-1.5 px-2">Total Experience <Line>{val(d.totalExperience)}</Line></Td>
                  <Td colSpan={2} className="py-1.5 px-2">Expected Salary <Line>{val(d.expectedSalary)}</Line></Td>
                </tr>
                {jobs.length > 0 && (
                  <tr>
                    <Td className="font-semibold text-center w-[6%] py-1.5 px-2">Sl. No.</Td>
                    <Td className="font-semibold text-center w-[22%] py-1.5 px-2">Previous Company Name &amp; Address</Td>
                    <Td className="font-semibold text-center w-[12%] py-1.5 px-2">Position Held</Td>
                    <Td className="font-semibold text-center w-[16%] py-1.5 px-2">Reporting Person</Td>
                    <Td className="font-semibold text-center w-[12%] whitespace-nowrap py-1.5 px-2">From</Td>
                    <Td className="font-semibold text-center w-[12%] whitespace-nowrap py-1.5 px-2">To</Td>
                    <Td className="font-semibold text-center w-[12%] py-1.5 px-2">Last Drawn Salary</Td>
                    <Td className="font-semibold text-center py-1.5 px-2">Reason for Leaving</Td>
                  </tr>
                )}
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr key={i}>
                    <Td className="text-center py-1.5 px-2">{i + 1}</Td>
                    <Td className="py-1.5 px-2">{val(job.co)}</Td>
                    <Td className="py-1.5 px-2">{val(job.pos)}</Td>
                    <Td className="py-1.5 px-2">
                      <div>{val(job.rep)}</div>
                      {val(job.repDesignation) ? <div className="text-[10px]">{val(job.repDesignation)}</div> : null}
                      {val(job.repPhone) ? <div className="text-[10px]">Phone: {val(job.repPhone)}</div> : null}
                    </Td>
                    <Td className="text-center whitespace-nowrap py-1.5 px-2">{fmtDate(job.from)}</Td>
                    <Td className="text-center whitespace-nowrap py-1.5 px-2">{fmtDate(job.to)}</Td>
                    <Td className="text-center py-1.5 px-2">{val(job.sal)}</Td>
                    <Td className="py-1.5 px-2">{val(job.reason)}</Td>
                  </tr>
                ))}
                <tr>
                  <Td colSpan={8} className="py-1.5 px-2">
                    How did you learn about the opening? <Line className="min-w-[65%]">{val(d.sourceOfOpening) || val(d.source)}</Line>
                  </Td>
                </tr>
                {val(d.referredBy) ? (
                  <tr>
                    <Td colSpan={8} className="py-1.5 px-2">Referred by / Friend / Relative working at Nippon Toyota <Line className="min-w-[45%]">{val(d.referredBy)}</Line></Td>
                  </tr>
                ) : null}
                <tr>
                  <Td colSpan={8} className="py-1.5 px-2">Ready to work in below-mentioned branches <Line className="min-w-[50%]">{val(d.preferredRegion)}</Line></Td>
                </tr>
                <tr>
                  <Td colSpan={8} className="py-1.5 px-2">If selected, when can you join? <Line className="min-w-[55%]">{fmtDate(d.expectedJoiningDate) || val(d.expectedJoiningDate)}</Line></Td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Page 1 Footer */}
          <div className="mt-3 pt-1.5 border-t border-dashed border-[#1e3a5f]/40 flex justify-between items-center text-[9.5px] font-semibold text-[#1e3a5f]/80">
            <span>Nippon Motor Corporation Pvt Ltd — Recruitment Confidential</span>
            <span className="font-bold tracking-wider uppercase">Page 1 of 2</span>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2 OF 2: General Info, References, Emergency Contacts & Declaration
         ══════════════════════════════════════════════════════════════════ */}
      <div className="iaf-page-wrap iaf-break">
        <div className="no-print mb-2.5 flex items-center justify-between px-3.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-black">2</span>
            <span className="text-[#1e3a5f] tracking-wide">PAGE 2 OF 2 (A4)</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium hidden sm:inline">General Information · References · Emergency Contacts · Declaration</span>
        </div>

        <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.38] antialiased">
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
            {hasExtra && (
              <table className="w-full border-collapse border border-black mb-3">
                <thead>
                  <tr><Th colSpan={2} className="py-1.5 px-2">Additional Information</Th></tr>
                </thead>
                <tbody>
                  {val(d.achievements) ? (
                    <tr>
                      <Td className="w-[18%] font-semibold py-1.5 px-2">Achievements</Td>
                      <Td className="py-1.5 px-2">{val(d.achievements)}</Td>
                    </tr>
                  ) : null}
                  {val(d.hobbies) ? (
                    <tr>
                      <Td className="font-semibold py-1.5 px-2">Hobbies</Td>
                      <Td className="py-1.5 px-2">{val(d.hobbies)}</Td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}

            {/* 3. General Information */}
            <table className="w-full border-collapse border border-black mb-3">
              <thead>
                <tr><Th colSpan={2} className="py-1.5 px-2">3. General Information</Th></tr>
              </thead>
              <tbody>
                {general.map(([letter, label, value]) => (
                  <tr key={letter}>
                    <Td className="py-1.5 px-2">{letter}. {label}</Td>
                    <Td className="w-[26%] text-center py-1.5 px-2">
                      <Tick on={asBool(value)} />
                    </Td>
                  </tr>
                ))}
                {val(d.medicalRemarks) ? (
                  <tr>
                    <Td colSpan={2} className="py-1.5 px-2">Medical remarks <Line className="min-w-[70%]">{val(d.medicalRemarks)}</Line></Td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* Reference */}
            {(val(d.refName) || val(d.refContactNumber) || d.hasReference) ? (
              <table className="w-full border-collapse border border-black mb-3">
                <thead>
                  <tr><Th colSpan={4} className="py-1.5 px-2">Reference Details</Th></tr>
                </thead>
                <tbody>
                  <tr>
                    <Td className="py-1.5 px-2">Name <Line>{val(d.refName)}</Line></Td>
                    <Td className="py-1.5 px-2">Role <Line>{val(d.refRole)}</Line></Td>
                    <Td className="py-1.5 px-2">Panchayat <Line>{val(d.refPanchayat)}</Line></Td>
                    <Td className="py-1.5 px-2">Contact <Line>{val(d.refContactNumber)}</Line></Td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            {/* 4. Emergency Contact Details */}
            <table className="w-full border-collapse border border-black mb-3">
              <thead>
                <tr><Th colSpan={5} className="py-1.5 px-2">4. Emergency Contact Details</Th></tr>
                <tr>
                  <Td className="font-semibold text-center w-[8%] py-1.5 px-2">Sl. No.</Td>
                  <Td className="font-semibold text-center w-[16%] py-1.5 px-2">Relation</Td>
                  <Td className="font-semibold text-center w-[22%] py-1.5 px-2">Name</Td>
                  <Td className="font-semibold text-center py-1.5 px-2">Address</Td>
                  <Td className="font-semibold text-center w-[18%] py-1.5 px-2">Contact Details</Td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td className="text-center py-1.5 px-2">1</Td>
                  <Td className="py-1.5 px-2">{val(d.emergency1Relation)}</Td>
                  <Td className="py-1.5 px-2">{val(d.emergency1Name)}</Td>
                  <Td className="py-1.5 px-2">{val(d.emergency1Address)}</Td>
                  <Td className="py-1.5 px-2">{val(d.emergency1Contact)}</Td>
                </tr>
                {hasEmergency2 && (
                  <tr>
                    <Td className="text-center py-1.5 px-2">2</Td>
                    <Td className="py-1.5 px-2">{val(d.emergency2Relation)}</Td>
                    <Td className="py-1.5 px-2">{val(d.emergency2Name)}</Td>
                    <Td className="py-1.5 px-2">{val(d.emergency2Address)}</Td>
                    <Td className="py-1.5 px-2">{val(d.emergency2Contact)}</Td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 5. Social Media & 6. Email */}
            <table className="w-full border-collapse border border-black mb-3.5">
              <thead>
                <tr><Th colSpan={4} className="py-1.5 px-2">5. Social Media Details &nbsp;|&nbsp; 6. E-Mail ID</Th></tr>
              </thead>
              <tbody>
                <tr>
                  <Td className="py-1.5 px-2">Facebook <Line className="min-w-[50%]">{val(d.facebookUrl)}</Line></Td>
                  <Td className="py-1.5 px-2">Instagram <Line className="min-w-[50%]">{val(d.instagramUrl)}</Line></Td>
                  <Td className="py-1.5 px-2">Twitter <Line className="min-w-[50%]">{val(d.twitterUrl)}</Line></Td>
                  <Td className="py-1.5 px-2">E-Mail ID <Line className="min-w-[50%]">{val(email)}</Line></Td>
                </tr>
              </tbody>
            </table>

            {/* Declaration */}
            <table className="w-full border-collapse border border-black mb-3">
              <thead>
                <tr><Th colSpan={3} className="py-1 px-2">Applicant Declaration</Th></tr>
              </thead>
              <tbody>
                <tr>
                  <Td colSpan={3} className="text-[10.5px] leading-relaxed p-2.5">
                    I hereby declare that the particulars given above are, to the best of my knowledge and belief,
                    correct and true. I understand that if appointed, any incorrect information given in this
                    application may be sufficient cause for termination of my services.
                  </Td>
                </tr>
                <tr>
                  <Td className="py-2 px-2">Place <Line className="min-w-[7rem]">{val(d.declarationPlace)}</Line></Td>
                  <Td className="py-2 px-2">Date <Line className="min-w-[7rem]">{fmtDate(d.declarationDate) || val(d.declarationDate)}</Line></Td>
                  <Td className="py-2 px-2">Signature of Applicant <Line className="min-w-[9rem]">{val(d.declarationName)}</Line></Td>
                </tr>
              </tbody>
            </table>

            {/* Injected Content on Page 2 (Interview Comments) */}
            {afterDeclaration}
          </div>

          {/* Page 2 Footer */}
          <div className="mt-3 pt-1.5 border-t border-dashed border-[#1e3a5f]/40 flex justify-between items-center text-[9.5px] font-semibold text-[#1e3a5f]/80">
            <span>Nippon Motor Corporation Pvt Ltd — Recruitment Confidential</span>
            <span className="font-bold tracking-wider uppercase">Confidential</span>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ATTACHED RESUME / CV
         ══════════════════════════════════════════════════════════════════ */}
      {!hideResume && resumeData && (
        <div className="iaf-page-wrap iaf-break">
          <div className="no-print mb-2.5 flex items-center justify-between px-3.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-black">
                📎
              </span>
              <span className="text-[#1e3a5f] tracking-wide">CANDIDATE RESUME / CV</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 font-medium hidden sm:inline truncate max-w-xs">
                {resumeData.fileName}
              </span>
              <a
                href={resumeData.blobUrl}
                download={resumeData.fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#1e3a5f] bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Resume
              </a>
            </div>
          </div>

          <div className="w-full max-w-[210mm] mx-auto overflow-visible print:border-none print:shadow-none">
            {isPdfContent(resumeData.contentType, resumeData.fileName) ? (
              <PdfViewer blob={resumeData.blob || undefined} url={resumeData.blobUrl} />
            ) : resumeData.blob ? (
              <DocxViewer blob={resumeData.blob} />
            ) : (
              <iframe
                src={resumeData.blobUrl}
                title={`${candidate.full_name} Resume`}
                className="w-full h-[85vh] min-h-[750px] border-0 block bg-white"
              />
            )}
          </div>
        </div>
      )}

      {!hideResume && resumeLoading && (
        <div className="iaf-page-wrap no-print py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#1e3a5f]" /> Loading attached resume...
        </div>
      )}
    </div>
  );
}
