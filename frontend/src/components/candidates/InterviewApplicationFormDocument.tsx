import type { ReactNode } from 'react';
import type { Candidate } from '../../types';
import { formatDate } from '../../lib/dateTime';

interface InterviewApplicationFormDocumentProps {
  candidate: Candidate;
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

export function InterviewApplicationFormDocument({ candidate }: InterviewApplicationFormDocumentProps) {
  const d = (candidate.profile?.raw_data ?? {}) as Record<string, unknown>;
  const photoUrl = candidate.profile?.photo_url;
  const applied = d.appliedDate || candidate.pre_form_submitted_at || candidate.applied_at || candidate.created_at;
  const mobile = d.mobileNumber || candidate.phone;
  const position = d.positionAppliedFor || candidate.position_applied_for;
  const email = d.emailId || candidate.email || candidate.profile?.email;

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
          co: row.company,
          pos: row.position,
          rep: row.reporting,
          from: row.fromDate ?? row.from,
          to: row.toDate ?? row.to,
          sal: row.salary,
          reason: row.reason,
        }))
    : [];
  const jobs = (listedJobs.length
    ? listedJobs
    : [
        { co: d.prevCompanyName, pos: d.prevPosition, rep: d.prev1Reporting, from: d.prev1From, to: d.prev1To, sal: d.prev1Salary, reason: d.prev1Reason },
        { co: d.prev2Name, pos: d.prev2Position, rep: d.prev2Reporting, from: d.prev2From, to: d.prev2To, sal: d.prev2Salary, reason: d.prev2Reason },
        { co: d.prev3Name, pos: d.prev3Position, rep: d.prev3Reporting, from: d.prev3From, to: d.prev3To, sal: d.prev3Salary, reason: d.prev3Reason },
        { co: d.prev4Name, pos: d.prev4Position, rep: d.prev4Reporting, from: d.prev4From, to: d.prev4To, sal: d.prev4Salary, reason: d.prev4Reason },
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

  const hasGrad = !!(val(d.gradCollege) || val(d.gradCourse) || val(d.gradPercentage));
  const hasPg = !!(val(d.postGradCollege) || val(d.postGradCourse) || val(d.postGradPercentage));
  const hasEmergency2 = !!(val(d.emergency2Name) || val(d.emergency2Contact));
  const hasExtra = !!(val(d.achievements) || val(d.hobbies));

  return (
    <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.35] antialiased">
      <div className="flex items-start gap-3 mb-2">
        <img
          src="/nippon-toyota-logo.png"
          alt="Nippon Toyota"
          className="h-[14mm] w-auto object-contain shrink-0 bg-transparent"
        />
        <div className="flex-1 text-center min-w-0 pt-0.5">
          <div className="font-bold text-[15px] tracking-[0.04em] uppercase leading-tight">
            Nippon Motor Corporation Pvt Ltd
          </div>
          <div className="text-[10px] leading-tight mt-0.5">
            XIX/9C, Nippon Towers, NH-47, HMT Junction, Kalamassery P.O., Kochi – 683104
          </div>
          <div className="text-[10px] leading-tight">
            Ph: 0484-2860331 / 8606986060 &nbsp;|&nbsp; E-Mail: recruitment@nippontoyota.com
          </div>
        </div>
      </div>
      <div className="iaf-rule border-t-2 mb-0" />
      <div className="iaf-title font-bold text-[13px] uppercase tracking-[0.12em] text-center py-1.5 mb-2 border-x border-b">
        Interview Application Form
      </div>

      <table className="w-full border-collapse border border-black mb-1.5">
        <tbody>
          <tr>
            <Td className="w-[38%]">Mobile Number <Line className="min-w-[9rem]">{val(mobile)}</Line></Td>
            <Td>Date <Line className="min-w-[6rem]">{fmtDate(applied)}</Line></Td>
          </tr>
          <tr>
            <Td>
              Position Applied For <Line className="min-w-[8rem]">{val(position)}</Line>
              {val(d.branchName) ? (
                <span> · Branch <Line>{val(d.branchName)}</Line></span>
              ) : null}
            </Td>
            <Td>Position Suitable <Line className="min-w-[8rem]">{val(d.positionSuitable)}</Line></Td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-black mb-1.5">
        <tbody>
          <tr>
            <Th colSpan={2}>1. Personal Data</Th>
          </tr>
          <tr>
            <td className="border p-1.5 align-top w-[78%]">
              <div className="mb-1">
                Full Name <Line className="min-w-[70%]">{candidate.full_name}</Line>
                {val(d.nameAadhaar) && val(d.nameAadhaar) !== candidate.full_name ? (
                  <div className="mt-0.5">Name as per Aadhaar <Line className="min-w-[60%]">{val(d.nameAadhaar)}</Line></div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div>
                  <div className="font-bold mb-0.5">Permanent Address</div>
                  <div>House Name: <Line className="min-w-[70%]">{val(d.permHouseName)}</Line></div>
                  <div>Post Office: <Line className="min-w-[70%]">{val(d.permPostOffice)}</Line></div>
                  <div>Landmark: <Line className="min-w-[70%]">{val(d.permLandmark)}</Line></div>
                  <div>District: <Line className="min-w-[70%]">{val(d.permDistrict)}</Line></div>
                  <div>Pincode: <Line className="min-w-[70%]">{val(d.permPinCode)}</Line></div>
                </div>
                <div>
                  <div className="font-bold mb-0.5">Present Address</div>
                  <div>House Name: <Line className="min-w-[70%]">{val(d.sameAsPermanent ? d.permHouseName : d.presHouseName)}</Line></div>
                  <div>Post Office: <Line className="min-w-[70%]">{val(d.sameAsPermanent ? d.permPostOffice : d.presPostOffice)}</Line></div>
                  <div>Landmark: <Line className="min-w-[70%]">{val(d.sameAsPermanent ? d.permLandmark : d.presLandmark)}</Line></div>
                  <div>District: <Line className="min-w-[70%]">{val(d.sameAsPermanent ? d.permDistrict : d.presDistrict)}</Line></div>
                  <div>Pincode: <Line className="min-w-[70%]">{val(d.sameAsPermanent ? d.permPinCode : d.presPinCode)}</Line></div>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>Age <Line className="min-w-[2rem]">{val(d.age)}</Line></span>
                <span>DOB <Line className="min-w-[5rem]">{fmtDate(d.dateOfBirth)}</Line></span>
                <span>Height <Line className="min-w-[2.5rem]">{val(d.height)}</Line></span>
                <span>Weight <Line className="min-w-[2.5rem]">{val(d.weight)}</Line></span>
                <span>Blood Group <Line className="min-w-[2.5rem]">{val(d.bloodGroup)}</Line></span>
                <span>Gender <Line className="min-w-[3rem]">{val(d.gender)}</Line></span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3">
                <span>Marital Status <Line className="min-w-[5rem]">{val(d.maritalStatus)}</Line></span>
                <span>Religion &amp; Caste <Line className="min-w-[8rem]">{val(d.religionCaste)}</Line></span>
              </div>
              <div className="mt-0.5 grid grid-cols-2 gap-x-2">
                <span>Languages Known – Read <Line className="min-w-[55%]">{val(d.languagesRead)}</Line></span>
                <span>Write <Line className="min-w-[55%]">{val(d.languagesWrite)}</Line></span>
                <span>Speak <Line className="min-w-[55%]">{val(d.languagesSpeak)}</Line></span>
                <span>Other <Line className="min-w-[55%]">{val(d.languagesOther)}</Line></span>
              </div>
              <div className="mt-0.5 grid grid-cols-2 gap-x-2">
                <span>Aadhaar <Line className="min-w-[60%]">{val(d.aadhaarNumber)}</Line></span>
                <span>Driving License <Line className="min-w-[55%]">{val(d.drivingLicenseNumber)}</Line></span>
                <span>PAN <Line className="min-w-[60%]">{val(d.panNumber)}</Line></span>
                <span>Passport <Line className="min-w-[55%]">{val(d.passportNumber)}</Line></span>
              </div>
              <div className="mt-0.5">
                Confident to Drive <Tick on={asBool(d.confidentToDrive)} />
                {driveTypes ? <span> ({driveTypes})</span> : null}
              </div>
            </td>
            <td className="border w-[22%] p-1.5 align-top text-center">
              <div className="text-[9px] font-bold uppercase mb-0.5">Photo</div>
              <div className="w-full aspect-[3/4] max-h-[48mm] mx-auto overflow-hidden border bg-white">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="h-full w-full object-cover object-left-top" />
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-400 text-[11px]">Photo</div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-black mb-1.5">
        <thead>
          <tr><Th colSpan={6}>Educational Qualification</Th></tr>
          <tr>
            <Td className="font-semibold text-center w-[18%]">Qualification</Td>
            <Td className="font-semibold text-center">School / College</Td>
            <Td className="font-semibold text-center w-[16%]">Course</Td>
            <Td className="font-semibold text-center w-[10%]">Marks</Td>
            <Td className="font-semibold text-center w-[12%]">Passing Year</Td>
            <Td className="font-semibold text-center w-[12%]">Mode of Study</Td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>10th</Td>
            <Td>{val(d.class10School)}</Td>
            <Td>{val(d.class10Board)}</Td>
            <Td className="text-center">{val(d.class10Percentage)}</Td>
            <Td className="text-center">{val(d.class10PassingYear)}</Td>
            <Td className="text-center">{val(d.class10Mode)}</Td>
          </tr>
          <tr>
            <Td>12th</Td>
            <Td>{val(d.class12School)}</Td>
            <Td>{val(d.class12Stream)}</Td>
            <Td className="text-center">{val(d.class12Percentage)}</Td>
            <Td className="text-center">{val(d.class12PassingYear)}</Td>
            <Td className="text-center">{val(d.class12Mode)}</Td>
          </tr>
          {hasGrad && (
            <tr>
              <Td>Graduation / Diploma</Td>
              <Td>{val(d.gradCollege)}</Td>
              <Td>{val(d.gradCourse)}</Td>
              <Td className="text-center">{val(d.gradPercentage)}</Td>
              <Td className="text-center">{val(d.gradPassingYear)}</Td>
              <Td className="text-center">{val(d.gradMode)}</Td>
            </tr>
          )}
          {hasPg && (
            <tr>
              <Td>Post-Graduation / Diploma</Td>
              <Td>{val(d.postGradCollege)}</Td>
              <Td>{val(d.postGradCourse)}</Td>
              <Td className="text-center">{val(d.postGradPercentage)}</Td>
              <Td className="text-center">{val(d.postGradPassingYear)}</Td>
              <Td className="text-center">{val(d.postGradMode)}</Td>
            </tr>
          )}
          <tr>
            <Td colSpan={6}>Computer Knowledge <Line className="min-w-[70%]">{computer}</Line></Td>
          </tr>
          {val(d.softwareCerts) ? (
            <tr>
              <Td colSpan={6}>Other Software / Certifications <Line className="min-w-[55%]">{val(d.softwareCerts)}</Line></Td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {family.length > 0 && (
        <table className="w-full border-collapse border border-black mb-1.5">
          <thead>
            <tr><Th colSpan={6}>Family Details</Th></tr>
            <tr>
              <Td className="font-semibold text-center w-[16%]">Relationship</Td>
              <Td className="font-semibold text-center">Name</Td>
              <Td className="font-semibold text-center w-[8%]">Age</Td>
              <Td className="font-semibold text-center w-[16%]">Occupation</Td>
              <Td className="font-semibold text-center">Company / School Name</Td>
              <Td className="font-semibold text-center w-[16%]">Mobile Number</Td>
            </tr>
          </thead>
          <tbody>
            {family.map((row) => (
              <tr key={row.rel + val(row.name)}>
                <Td>{row.rel}</Td>
                <Td>{val(row.name)}</Td>
                <Td className="text-center">{val(row.age)}</Td>
                <Td>{val(row.occ)}</Td>
                <Td>{val(row.co)}</Td>
                <Td>{val(row.ph)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <table className="w-full border-collapse border border-black mb-1.5">
        <thead>
          <tr><Th colSpan={7}>2. Employment Record</Th></tr>
          <tr>
            <Td colSpan={3}>
              Do you have any experience before? <Tick on={asBool(d.previousExperience)} />
            </Td>
            <Td colSpan={2}>Total Experience <Line>{val(d.totalExperience)}</Line></Td>
            <Td colSpan={2}>Expected Salary <Line>{val(d.expectedSalary)}</Line></Td>
          </tr>
          {jobs.length > 0 && (
            <tr>
              <Td className="font-semibold text-center w-[22%]">Previous Company Name &amp; Address</Td>
              <Td className="font-semibold text-center w-[12%]">Position Held</Td>
              <Td className="font-semibold text-center w-[18%]">Reporting Person</Td>
              <Td className="font-semibold text-center w-[10%]">From</Td>
              <Td className="font-semibold text-center w-[10%]">To</Td>
              <Td className="font-semibold text-center w-[14%]">Last Drawn Salary</Td>
              <Td className="font-semibold text-center">Reason for Leaving</Td>
            </tr>
          )}
        </thead>
        <tbody>
          {jobs.map((job, i) => (
            <tr key={i}>
              <Td>{val(job.co)}</Td>
              <Td>{val(job.pos)}</Td>
              <Td>{val(job.rep)}</Td>
              <Td className="text-center">{val(job.from)}</Td>
              <Td className="text-center">{val(job.to)}</Td>
              <Td className="text-center">{val(job.sal)}</Td>
              <Td>{val(job.reason)}</Td>
            </tr>
          ))}
          <tr>
            <Td colSpan={7}>
              How did you learn about the opening? <Line className="min-w-[70%]">{val(d.sourceOfOpening) || val(d.source)}</Line>
            </Td>
          </tr>
          {val(d.referredBy) ? (
            <tr>
              <Td colSpan={7}>Referred by / Friend / Relative working at Nippon Toyota <Line className="min-w-[50%]">{val(d.referredBy)}</Line></Td>
            </tr>
          ) : null}
          <tr>
            <Td colSpan={7}>Ready to work in below-mentioned branches <Line className="min-w-[55%]">{val(d.preferredRegion)}</Line></Td>
          </tr>
          <tr>
            <Td colSpan={7}>If selected, when can you join? <Line className="min-w-[60%]">{fmtDate(d.expectedJoiningDate) || val(d.expectedJoiningDate)}</Line></Td>
          </tr>
        </tbody>
      </table>

      {hasExtra && (
        <table className="w-full border-collapse border border-black mb-1.5">
          <thead>
            <tr><Th colSpan={2}>Additional Information</Th></tr>
          </thead>
          <tbody>
            {val(d.achievements) ? (
              <tr>
                <Td className="w-[18%] font-semibold">Achievements</Td>
                <Td>{val(d.achievements)}</Td>
              </tr>
            ) : null}
            {val(d.hobbies) ? (
              <tr>
                <Td className="font-semibold">Hobbies</Td>
                <Td>{val(d.hobbies)}</Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      <table className="w-full border-collapse border border-black mb-1.5">
        <thead>
          <tr><Th colSpan={2}>3. General Information</Th></tr>
        </thead>
        <tbody>
          {general.map(([letter, label, value]) => (
            <tr key={letter}>
              <Td>{letter}. {label}</Td>
              <Td className="w-[28%] text-center">
                <Tick on={asBool(value)} />
              </Td>
            </tr>
          ))}
          {val(d.medicalRemarks) ? (
            <tr>
              <Td colSpan={2}>Medical remarks <Line className="min-w-[70%]">{val(d.medicalRemarks)}</Line></Td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {(val(d.refName) || val(d.refContactNumber) || d.hasReference) ? (
        <table className="w-full border-collapse border border-black mb-1.5">
          <thead>
            <tr><Th colSpan={4}>Reference</Th></tr>
          </thead>
          <tbody>
            <tr>
              <Td>Name <Line>{val(d.refName)}</Line></Td>
              <Td>Role <Line>{val(d.refRole)}</Line></Td>
              <Td>Panchayat <Line>{val(d.refPanchayat)}</Line></Td>
              <Td>Contact <Line>{val(d.refContactNumber)}</Line></Td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <table className="w-full border-collapse border border-black mb-1.5">
        <thead>
          <tr><Th colSpan={5}>4. Emergency Contact Details</Th></tr>
          <tr>
            <Td className="font-semibold text-center w-[8%]">Sl. No.</Td>
            <Td className="font-semibold text-center w-[16%]">Relation</Td>
            <Td className="font-semibold text-center w-[22%]">Name</Td>
            <Td className="font-semibold text-center">Address</Td>
            <Td className="font-semibold text-center w-[18%]">Contact Details</Td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td className="text-center">1</Td>
            <Td>{val(d.emergency1Relation)}</Td>
            <Td>{val(d.emergency1Name)}</Td>
            <Td>{val(d.emergency1Address)}</Td>
            <Td>{val(d.emergency1Contact)}</Td>
          </tr>
          {hasEmergency2 && (
            <tr>
              <Td className="text-center">2</Td>
              <Td>{val(d.emergency2Relation)}</Td>
              <Td>{val(d.emergency2Name)}</Td>
              <Td>{val(d.emergency2Address)}</Td>
              <Td>{val(d.emergency2Contact)}</Td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="w-full border-collapse border border-black mb-1.5">
        <thead>
          <tr><Th colSpan={4}>5. Social Media Details &nbsp;|&nbsp; 6. E-Mail ID</Th></tr>
        </thead>
        <tbody>
          <tr>
            <Td>Facebook <Line className="min-w-[55%]">{val(d.facebookUrl)}</Line></Td>
            <Td>Instagram <Line className="min-w-[55%]">{val(d.instagramUrl)}</Line></Td>
            <Td>Twitter <Line className="min-w-[55%]">{val(d.twitterUrl)}</Line></Td>
            <Td>E-Mail ID <Line className="min-w-[55%]">{val(email)}</Line></Td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-black">
        <thead>
          <tr><Th colSpan={3}>Declaration</Th></tr>
        </thead>
        <tbody>
          <tr>
            <Td colSpan={3} className="text-[10px] leading-snug py-1.5">
              I hereby declare that the particulars given above are, to the best of my knowledge and belief,
              correct and true. I understand that if appointed, any incorrect information given in this
              application may be sufficient cause for termination of my services.
            </Td>
          </tr>
          <tr>
            <Td>Place <Line className="min-w-[6rem]">{val(d.declarationPlace)}</Line></Td>
            <Td>Date <Line className="min-w-[6rem]">{fmtDate(d.declarationDate) || val(d.declarationDate)}</Line></Td>
            <Td>Signature of Applicant <Line className="min-w-[8rem]">{val(d.declarationName)}</Line></Td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
