import type { ReactNode } from 'react';
import type { Candidate } from '../../types';

interface InterviewApplicationFormDocumentProps {
  candidate: Candidate;
}

function blank(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  return String(value);
}

function yn(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

function joinParts(...parts: unknown[]): string {
  const filled = parts.map((p) => (p == null || p === '' ? '' : String(p).trim())).filter(Boolean);
  return filled.length ? filled.join(', ') : '—';
}

function cell(children: ReactNode, className = '') {
  return <td className={`border border-black p-0.5 align-top ${className}`}>{children}</td>;
}

export function InterviewApplicationFormDocument({ candidate }: InterviewApplicationFormDocumentProps) {
  const d = candidate.profile?.raw_data ?? {};
  const v = (key: string) => blank(d[key]);
  const photoUrl = candidate.profile?.photo_url;

  const appliedDate =
    d.appliedDate ||
    candidate.pre_form_submitted_at ||
    candidate.applied_at ||
    candidate.created_at;

  const mobile = d.mobileNumber || candidate.phone;
  const position = d.positionAppliedFor || candidate.position_applied_for;
  const email = d.emailId || candidate.email || candidate.profile?.email;

  const permAddress = joinParts(
    d.permHouseName,
    d.permPostOffice,
    d.permLandmark,
    d.permDistrict,
    d.permPinCode
  );
  const sameAsPerm = d.sameAsPermanent === true;
  const presentAddress = sameAsPerm
    ? permAddress
    : joinParts(
        d.presHouseName,
        d.presPostOffice,
        d.presLandmark,
        d.presDistrict,
        d.presPinCode
      );

  const driveDetail = [
    d.drive2Wheeler && '2W',
    d.drive3Wheeler && '3W',
    d.drive4Wheeler && '4W',
    d.driveHeavy && 'Heavy',
  ]
    .filter(Boolean)
    .join(', ');

  const computerKnowledge = [
    d.compWord && 'MS Word',
    d.compExcel && 'MS Excel',
    d.compPowerPoint && 'PowerPoint',
    d.compTally && 'Tally',
    d.compOther && 'Other',
  ]
    .filter(Boolean)
    .join(', ');

  const familyRows: { relation: string; name: unknown; age: unknown; occupation: unknown; company: unknown; phone: unknown }[] = [
    { relation: 'Father', name: d.fatherName, age: d.fatherAge, occupation: d.fatherOccupation, company: d.fatherCompany, phone: d.fatherPhone },
    { relation: 'Mother', name: d.motherName, age: d.motherAge, occupation: d.motherOccupation, company: d.motherCompany, phone: d.motherPhone },
    { relation: 'Spouse', name: d.spouseName, age: d.spouseAge, occupation: d.spouseOccupation, company: d.spouseCompany, phone: d.spousePhone },
    { relation: blank(d.child1Relation) !== '—' ? String(d.child1Relation) : 'Child 1', name: d.child1Name, age: d.child1Age, occupation: d.child1Occupation, company: d.child1Company, phone: d.child1Phone },
    { relation: blank(d.child2Relation) !== '—' ? String(d.child2Relation) : 'Child 2', name: d.child2Name, age: d.child2Age, occupation: d.child2Occupation, company: d.child2Company, phone: d.child2Phone },
    { relation: blank(d.sibling1Relation) !== '—' ? String(d.sibling1Relation) : 'Sibling 1', name: d.sibling1Name, age: d.sibling1Age, occupation: d.sibling1Occupation, company: d.sibling1Company, phone: d.sibling1Phone },
    { relation: blank(d.sibling2Relation) !== '—' ? String(d.sibling2Relation) : 'Sibling 2', name: d.sibling2Name, age: d.sibling2Age, occupation: d.sibling2Occupation, company: d.sibling2Company, phone: d.sibling2Phone },
  ];

  const jobs = [
    {
      company: d.prevCompanyName,
      position: d.prevPosition,
      reporting: d.prev1Reporting,
      from: d.prev1From,
      to: d.prev1To,
      salary: d.prev1Salary,
      reason: d.prev1Reason,
    },
    {
      company: d.prev2Name,
      position: d.prev2Position,
      reporting: d.prev2Reporting,
      from: d.prev2From,
      to: d.prev2To,
      salary: d.prev2Salary,
      reason: d.prev2Reason,
    },
    {
      company: d.prev3Name,
      position: d.prev3Position,
      reporting: d.prev3Reporting,
      from: d.prev3From,
      to: d.prev3To,
      salary: d.prev3Salary,
      reason: d.prev3Reason,
    },
    {
      company: d.prev4Name,
      position: d.prev4Position,
      reporting: d.prev4Reporting,
      from: d.prev4From,
      to: d.prev4To,
      salary: d.prev4Salary,
      reason: d.prev4Reason,
    },
  ];

  const generalQs: { letter: string; label: string; key: string }[] = [
    { letter: 'a', label: 'Have you ever been terminated from any previous employment?', key: 'prevTerminated' },
    { letter: 'b', label: 'Have you ever suffered from any nervous disorder?', key: 'nervousDisorder' },
    { letter: 'c', label: 'Do you have any physical disability?', key: 'physicalDisability' },
    { letter: 'd', label: 'Do you have any eye / colour / night blindness?', key: 'eyeVision' },
    { letter: 'e', label: 'Have you ever been convicted of any criminal offence?', key: 'criminalConviction' },
  ];

  return (
    <div className="w-[210mm] mx-auto bg-white text-black font-sans text-[9px] leading-tight box-border p-[6mm] print:p-[5mm]">
      {/* Company header */}
      <div className="text-center border border-black p-1.5 mb-1">
        <div className="font-bold text-[11px] tracking-wide uppercase">
          NIPPON MOTOR CORPORATION PVT LTD
        </div>
        <div className="text-[8px] mt-0.5">
          XIX/9C NIPPON TOWERS NH-47 HMT JUNCTION KALAMASSERY P.O. KOCHI-683104
        </div>
        <div className="text-[8px]">
          Ph 0484-2860331 / 8606986060 &nbsp;|&nbsp; recruitment@nippontoyota.com
        </div>
      </div>

      <div className="text-center font-bold text-[12px] uppercase tracking-wider border border-black border-t-0 py-1 mb-1">
        Interview Application Form
      </div>

      {/* Mobile / Date / Position */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed">
        <tbody>
          <tr>
            {cell(
              <>
                <span className="font-semibold">Mobile: </span>
                {blank(mobile)}
              </>,
              'w-[34%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Date: </span>
                {formatDate(typeof appliedDate === 'string' ? appliedDate : undefined)}
              </>,
              'w-[22%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Position Applied For: </span>
                {blank(position)}
              </>,
              'w-[24%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Position Suitable: </span>
                {v('positionSuitable')}
              </>,
              'w-[20%]'
            )}
          </tr>
        </tbody>
      </table>

      {/* 1. PERSONAL DATA */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed">
        <tbody>
          <tr>
            <td colSpan={4} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              1. Personal Data
            </td>
            <td rowSpan={8} className="border border-black w-[28mm] p-0.5 align-top">
              <div className="w-[26mm] h-[32mm] border border-dashed border-gray-500 mx-auto overflow-hidden flex items-center justify-center text-gray-400 text-[8px]">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Candidate"
                    className="h-full w-full object-cover object-left-top"
                  />
                ) : (
                  'Photo'
                )}
              </div>
            </td>
          </tr>
          <tr>
            {cell(<span className="font-semibold">Name</span>, 'w-[14%]')}
            {cell(blank(candidate.full_name), 'w-[58%]')}
            {cell(<span className="font-semibold">Gender</span>, 'w-[12%]')}
            {cell(v('gender'), 'w-[16%]')}
          </tr>
          <tr>
            {cell(<span className="font-semibold">Permanent Address</span>)}
            {cell(permAddress, 'col-span')}
            {cell(<span className="font-semibold">Present Address</span>)}
            {cell(presentAddress)}
          </tr>
          <tr>
            {cell(<span className="font-semibold">Age</span>)}
            {cell(v('age'))}
            {cell(<span className="font-semibold">DOB</span>)}
            {cell(formatDate(d.dateOfBirth))}
          </tr>
          <tr>
            {cell(<span className="font-semibold">Height</span>)}
            {cell(v('height'))}
            {cell(<span className="font-semibold">Weight</span>)}
            {cell(v('weight'))}
          </tr>
          <tr>
            {cell(<span className="font-semibold">Blood Group</span>)}
            {cell(v('bloodGroup'))}
            {cell(<span className="font-semibold">Marital Status</span>)}
            {cell(v('maritalStatus'))}
          </tr>
          <tr>
            {cell(<span className="font-semibold">Religion &amp; Caste</span>)}
            {cell(v('religionCaste'), '')}
            {cell(<span className="font-semibold">Confident to Drive</span>)}
            {cell(
              <>
                {yn(d.confidentToDrive)}
                {driveDetail ? ` (${driveDetail})` : ''}
              </>
            )}
          </tr>
          <tr>
            {cell(<span className="font-semibold">Languages</span>)}
            {cell(
              <>
                <span className="font-semibold">R:</span> {v('languagesRead')}{' '}
                <span className="font-semibold">W:</span> {v('languagesWrite')}{' '}
                <span className="font-semibold">S:</span> {v('languagesSpeak')}
                {d.languagesOther ? (
                  <>
                    {' '}
                    <span className="font-semibold">Other:</span> {v('languagesOther')}
                  </>
                ) : null}
              </>,
              ''
            )}
            {cell(<span className="font-semibold">IDs</span>)}
            {cell(
              <>
                <div>
                  <span className="font-semibold">Aadhaar:</span> {v('aadhaarNumber')}
                </div>
                <div>
                  <span className="font-semibold">PAN:</span> {v('panNumber')}
                </div>
                <div>
                  <span className="font-semibold">DL:</span> {v('drivingLicenseNumber')}
                </div>
                <div>
                  <span className="font-semibold">Passport:</span> {v('passportNumber')}
                </div>
              </>
            )}
          </tr>
        </tbody>
      </table>

      {/* EDUCATIONAL QUALIFICATION */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed text-[8px]">
        <thead>
          <tr>
            <td colSpan={6} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              Educational Qualification
            </td>
          </tr>
          <tr className="font-semibold text-center">
            {cell('Course / Level')}
            {cell('School / College')}
            {cell('Board / Stream / Course')}
            {cell('% / Marks')}
            {cell('Year')}
            {cell('Mode')}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cell('10th')}
            {cell(v('class10School'))}
            {cell(v('class10Board'))}
            {cell(v('class10Percentage'))}
            {cell(v('class10PassingYear'))}
            {cell(v('class10Mode'))}
          </tr>
          <tr>
            {cell('12th')}
            {cell(v('class12School'))}
            {cell(v('class12Stream'))}
            {cell(v('class12Percentage'))}
            {cell(v('class12PassingYear'))}
            {cell(v('class12Mode'))}
          </tr>
          <tr>
            {cell('Graduation / Diploma')}
            {cell(v('gradCollege'))}
            {cell(v('gradCourse'))}
            {cell(v('gradPercentage'))}
            {cell(v('gradPassingYear'))}
            {cell(v('gradMode'))}
          </tr>
          <tr>
            {cell('Post Graduation / Diploma')}
            {cell(v('postGradCollege'))}
            {cell(v('postGradCourse'))}
            {cell(v('postGradPercentage'))}
            {cell(v('postGradPassingYear'))}
            {cell(v('postGradMode'))}
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-black mb-1 table-fixed">
        <tbody>
          <tr>
            {cell(<span className="font-semibold">Computer Knowledge</span>, 'w-[22%]')}
            {cell(computerKnowledge || '—', 'w-[38%]')}
            {cell(<span className="font-semibold">Software / Certs</span>, 'w-[18%]')}
            {cell(v('softwareCerts'), 'w-[22%]')}
          </tr>
        </tbody>
      </table>

      {/* FAMILY DETAILS */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed text-[8px]">
        <thead>
          <tr>
            <td colSpan={6} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              Family Details
            </td>
          </tr>
          <tr className="font-semibold text-center">
            {cell('Relation')}
            {cell('Name')}
            {cell('Age')}
            {cell('Occupation')}
            {cell('Company')}
            {cell('Phone')}
          </tr>
        </thead>
        <tbody>
          {familyRows.map((row) => (
            <tr key={row.relation}>
              {cell(row.relation)}
              {cell(blank(row.name))}
              {cell(blank(row.age))}
              {cell(blank(row.occupation))}
              {cell(blank(row.company))}
              {cell(blank(row.phone))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* EMPLOYMENT RECORD */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed text-[8px]">
        <thead>
          <tr>
            <td colSpan={7} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              Employment Record
            </td>
          </tr>
          <tr>
            <td className="border border-black p-0.5 align-top" colSpan={2}>
              <span className="font-semibold">Previous Experience: </span>
              {yn(d.previousExperience)}
            </td>
            <td className="border border-black p-0.5 align-top" colSpan={3}>
              <span className="font-semibold">Total Experience: </span>
              {v('totalExperience')}
            </td>
            <td className="border border-black p-0.5 align-top" colSpan={2}>
              <span className="font-semibold">Expected Salary: </span>
              {v('expectedSalary')}
            </td>
          </tr>
          <tr className="font-semibold text-center">
            {cell('#')}
            {cell('Company & Address')}
            {cell('Position')}
            {cell('Reporting To')}
            {cell('From – To')}
            {cell('Last Salary')}
            {cell('Reason for Leaving')}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, idx) => (
            <tr key={idx} className="h-5">
              {cell(String(idx + 1), 'text-center w-[4%]')}
              {cell(blank(job.company), 'w-[22%]')}
              {cell(blank(job.position), 'w-[14%]')}
              {cell(blank(job.reporting), 'w-[14%]')}
              {cell(
                blank(job.from) === '—' && blank(job.to) === '—'
                  ? '—'
                  : `${blank(job.from)} – ${blank(job.to)}`,
                'w-[16%]'
              )}
              {cell(blank(job.salary), 'w-[12%]')}
              {cell(blank(job.reason), 'w-[18%]')}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Recruitment / additional */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed">
        <tbody>
          <tr>
            {cell(
              <>
                <span className="font-semibold">How did you learn of this opening? </span>
                {v('sourceOfOpening')}
              </>,
              'w-[50%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Referred by: </span>
                {v('referredBy')}
              </>,
              'w-[50%]'
            )}
          </tr>
          <tr>
            {cell(
              <>
                <span className="font-semibold">Ready to work in branches / preferred region: </span>
                {v('preferredRegion')}
              </>
            )}
            {cell(
              <>
                <span className="font-semibold">If selected, when can you join? </span>
                {formatDate(d.expectedJoiningDate) === '—'
                  ? v('expectedJoiningDate')
                  : formatDate(d.expectedJoiningDate)}
              </>
            )}
          </tr>
          <tr>
            {cell(
              <>
                <span className="font-semibold">Achievements: </span>
                {v('achievements')}
              </>
            )}
            {cell(
              <>
                <span className="font-semibold">Hobbies: </span>
                {v('hobbies')}
              </>
            )}
          </tr>
        </tbody>
      </table>

      {/* GENERAL INFORMATION */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed">
        <thead>
          <tr>
            <td colSpan={2} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              General Information
            </td>
          </tr>
        </thead>
        <tbody>
          {generalQs.map((q) => (
            <tr key={q.key}>
              {cell(
                <>
                  <span className="font-semibold">({q.letter})</span> {q.label}
                </>,
                'w-[88%]'
              )}
              {cell(yn(d[q.key]), 'w-[12%] text-center font-semibold')}
            </tr>
          ))}
          {d.medicalRemarks ? (
            <tr>
              {cell(
                <>
                  <span className="font-semibold">Remarks: </span>
                  {v('medicalRemarks')}
                </>,
                ''
              )}
              {cell('')}
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* EMERGENCY CONTACT */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed text-[8px]">
        <thead>
          <tr>
            <td colSpan={4} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              Emergency Contact
            </td>
          </tr>
          <tr className="font-semibold text-center">
            {cell('Relation')}
            {cell('Name')}
            {cell('Address')}
            {cell('Contact')}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cell(v('emergency1Relation'))}
            {cell(v('emergency1Name'))}
            {cell(v('emergency1Address'))}
            {cell(v('emergency1Contact'))}
          </tr>
          <tr>
            {cell(v('emergency2Relation'))}
            {cell(v('emergency2Name'))}
            {cell(v('emergency2Address'))}
            {cell(v('emergency2Contact'))}
          </tr>
        </tbody>
      </table>

      {/* SOCIAL + EMAIL */}
      <table className="w-full border-collapse border border-black mb-1 table-fixed">
        <tbody>
          <tr>
            <td colSpan={4} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              Social Media &amp; E-Mail ID
            </td>
          </tr>
          <tr>
            {cell(
              <>
                <span className="font-semibold">Facebook: </span>
                {v('facebookUrl')}
              </>,
              'w-[25%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Instagram: </span>
                {v('instagramUrl')}
              </>,
              'w-[25%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Twitter / X: </span>
                {v('twitterUrl')}
              </>,
              'w-[25%]'
            )}
            {cell(
              <>
                <span className="font-semibold">E-Mail ID: </span>
                {blank(email)}
              </>,
              'w-[25%]'
            )}
          </tr>
        </tbody>
      </table>

      {/* DECLARATION */}
      <table className="w-full border-collapse border border-black table-fixed">
        <tbody>
          <tr>
            <td colSpan={3} className="border border-black bg-gray-200 text-center font-bold py-0.5 uppercase text-[10px]">
              Declaration
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="border border-black p-1 text-[8px] leading-snug">
              I hereby declare that the particulars furnished above are true and correct to the best of
              my knowledge and belief. I understand that any false information or suppression of facts
              may lead to rejection of my candidature or termination of employment if already engaged.
            </td>
          </tr>
          <tr>
            {cell(
              <>
                <span className="font-semibold">Place: </span>
                {v('declarationPlace')}
              </>,
              'w-[33%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Date: </span>
                {formatDate(d.declarationDate) === '—'
                  ? v('declarationDate')
                  : formatDate(d.declarationDate)}
              </>,
              'w-[33%]'
            )}
            {cell(
              <>
                <span className="font-semibold">Signature / Name: </span>
                {v('declarationName')}
              </>,
              'w-[34%]'
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
