
import type { Candidate, Evaluation } from '../../types';

interface CandidateSummaryDocumentProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  hidePrintButton?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function CandidateSummaryDocument({ candidate, evaluations, hidePrintButton = false }: CandidateSummaryDocumentProps) {
  if (!candidate) {
    return <div className="p-8 text-center text-gray-500">No candidate data available.</div>;
  }

  const rd = candidate.profile?.raw_data || {};
  const today = formatDate(new Date().toISOString());
  const permAddress = [rd.permHouseName, rd.permPostOffice, rd.permLandmark, rd.permDistrict, rd.permPinCode].filter(Boolean).join(', ');
  
  // Aggregate Evaluations
  const branchHrEval = evaluations.find(e => e.type === 'BRANCH_HR');
  const deptEval = evaluations.find(e => e.type === 'DEPT_HEAD');
  
  // Example averages (normally from backend if applicable)
  const hrScore = branchHrEval?.scores ? ((branchHrEval.scores.communication || 0) + (branchHrEval.scores.technical || 0)) / 2 : 0;
  
  return (
    <div className="bg-gray-100 min-h-screen text-black font-sans text-xs print:bg-white pb-12 print:pb-0">
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; }
          .print-container { margin: 0 !important; width: 210mm !important; min-height: 297mm !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
        .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 4px; font-size: 10px; word-wrap: break-word; }
        .print-table th { background-color: #f3f4f6; font-weight: bold; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      `}</style>

      {!hidePrintButton && (
        <div className="text-center py-4 no-print bg-white border-b sticky top-0 z-50 shadow-sm">
          <button onClick={() => window.print()} className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-semibold cursor-pointer shadow-sm">
            Print Form
          </button>
        </div>
      )}

      {/* --- PAGE 1: Candidate Summary Sheet --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative page-break">
        
        {/* Header Table */}
        <table className="print-table mb-2">
          <tbody>
            <tr>
              <td rowSpan={2} className="w-16 text-center font-bold text-lg">NT</td>
              <td rowSpan={2} className="font-bold text-base text-center">NIPPON TOYOTA<br/><span className="text-[10px] font-normal">NIPPON MOTOR CORPORATION (P) LTD, NIPPON TOWERS, KALAMASSERY</span></td>
              <td className="w-16 text-center">74</td>
              <td className="w-16 text-center">Good</td>
              <td className="w-16">Sl No</td>
              <td className="w-24"></td>
            </tr>
            <tr>
              <td className="text-center">A</td>
              <td className="text-center">***</td>
              <td>Date :</td>
              <td>{today}</td>
            </tr>
            <tr>
              <td colSpan={6} className="text-center font-bold bg-gray-100">Human Resource Department</td>
            </tr>
          </tbody>
        </table>

        {/* Candidate Summary Sheet Table */}
        <table className="print-table mb-2">
          <tbody>
            <tr>
              <td colSpan={4} className="text-center font-bold bg-gray-100">Candidate Summary Sheet</td>
              <td className="font-bold w-24">Department</td>
              <td className="w-32">{candidate.position_applied_for || ''}</td>
            </tr>
            <tr>
              <td className="font-bold w-32">Name</td>
              <td colSpan={2}>{candidate.full_name}</td>
              <td className="w-40 text-right pr-2 text-[9px]">Application Submitted on:</td>
              <td colSpan={2}>{formatDate(candidate.applied_at)}</td>
            </tr>
            <tr>
              <td className="font-bold">Post Applied</td>
              <td colSpan={2}>{candidate.position_applied_for}</td>
              <td className="font-bold bg-gray-100 text-center w-24">Source</td>
              <td colSpan={2}>{candidate.source}</td>
            </tr>
            <tr>
              <td className="font-bold bg-gray-100">Personal Details</td>
              <td colSpan={2}></td>
              <td className="font-bold bg-gray-100 text-center">Age</td>
              <td colSpan={2}>{rd.age || ''}</td>
            </tr>
            <tr>
              <td className="font-bold">Contact No:</td>
              <td colSpan={2}>{candidate.phone}<br/>{rd.refContactNumber}</td>
              <td className="font-bold">Date of Birth</td>
              <td colSpan={2}>{rd.dateOfBirth || ''}</td>
            </tr>
            <tr>
              <td rowSpan={2} className="font-bold">Contact Address</td>
              <td colSpan={2} rowSpan={2}>{permAddress}</td>
              <td className="font-bold bg-gray-100 text-center">Experience</td>
              <td colSpan={2} className="text-center font-bold bg-gray-100">Years</td>
            </tr>
            <tr>
              <td className="font-bold">Total Work Experience</td>
              <td colSpan={2}>{rd.totalExperience || 'Fresher'}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex w-full mb-2">
           <table className="print-table w-3/4">
            <tbody>
              <tr>
                <td className="font-bold w-32">Educational Qualification</td>
                <td className="text-center">Degree</td>
                <td className="text-center">Specialization</td>
                <td className="text-center">{rd.gradCourse || ''}</td>
              </tr>
              <tr>
                <td className="font-bold">Educational Qualification</td>
                <td className="text-center">Plus two</td>
                <td className="text-center">Specialization</td>
                <td className="text-center">{rd.class12Stream || ''}</td>
              </tr>
              <tr>
                <td className="font-bold">Computer Knowledge</td>
                <td colSpan={2} className="text-center">Word, Excel</td>
                <td className="text-center font-bold">Driving Licence</td>
              </tr>
            </tbody>
           </table>
           <div className="w-1/4 border-t border-r border-b border-black flex flex-col">
              <div className="flex-1 border-b border-black text-[10px] p-1">Father's Occupation: </div>
              <div className="flex-1 border-b border-black text-[10px] p-1">Mother's Occupation: </div>
              <div className="flex-1 text-[10px] p-1">Spouse Occupation: </div>
           </div>
        </div>

        {/* Score Board */}
        <table className="print-table mb-2">
          <tbody>
            <tr>
              <td colSpan={5} className="text-center font-bold bg-gray-100">SCORE BOARD / TEST RESULTS (% Wise)</td>
            </tr>
            <tr>
              <td className="font-bold">Psychometry test Result</td>
              <td className="w-16 text-center">0.00</td>
              <td rowSpan={4} className="font-bold text-center w-32 align-middle">TOTAL AVERAGE</td>
              <td rowSpan={4} className="text-center w-24 align-middle font-bold text-base">{hrScore > 0 ? hrScore : ''}</td>
              <td>1st Interview: {branchHrEval ? formatDate(branchHrEval.scheduled_time || branchHrEval.updated_at) : ''}</td>
            </tr>
            <tr>
              <td className="font-bold">Analytical Test Result</td>
              <td className="text-center">0.00</td>
              <td>2nd Interview: {deptEval ? formatDate(deptEval.scheduled_time || deptEval.updated_at) : ''}</td>
            </tr>
            <tr>
              <td className="font-bold">Technical Test Result</td>
              <td className="text-center">0.00</td>
              <td>3rd Interview: </td>
            </tr>
            <tr>
              <td className="font-bold">Department Test Result</td>
              <td className="text-center">0.00</td>
              <td>4th Interview: </td>
            </tr>
          </tbody>
        </table>

        {/* Employment Record */}
        <table className="print-table mb-2">
          <tbody>
            <tr>
              <td colSpan={7} className="text-center font-bold bg-gray-100">Employment Record</td>
            </tr>
            <tr>
              <th className="w-32">Organisation</th>
              <th colSpan={2}>Period (From - To)</th>
              <th className="w-12">Years</th>
              <th>Designation</th>
              <th>Reason for Resignation</th>
              <th>Total Salary</th>
            </tr>
            {/* Render 1 actual row if available, and 4 blank rows */}
            <tr className="h-10">
              <td>{rd.prevCompanyName || ''}</td>
              <td colSpan={2}></td>
              <td>{rd.totalExperience && rd.totalExperience !== 'Fresher' ? rd.totalExperience : ''}</td>
              <td>{rd.prevPosition || ''}</td>
              <td></td>
              <td></td>
            </tr>
            {[...Array(4)].map((_, i) => (
              <tr key={i} className="h-10">
                <td></td><td colSpan={2}></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Salary */}
        <table className="print-table mb-2">
          <tbody>
            <tr>
              <td className="font-bold w-32">Current Salary</td>
              <td className="w-24"></td>
              <td rowSpan={4} className="w-32 font-bold text-center align-middle">Remarks</td>
              <td className="font-bold">Expected Salary</td>
              <td className="w-24 text-center">{rd.expectedSalary || ''}</td>
              <td rowSpan={4}></td>
            </tr>
            <tr>
              <td className="font-bold">Incentive</td>
              <td></td>
              <td className="font-bold">Incentive</td>
              <td></td>
            </tr>
            <tr>
              <td className="font-bold">Others</td>
              <td></td>
              <td className="font-bold">Others</td>
              <td></td>
            </tr>
            <tr>
              <td className="font-bold">Total</td>
              <td></td>
              <td className="font-bold">Total</td>
              <td className="text-center font-bold">{rd.expectedSalary || ''}</td>
            </tr>
          </tbody>
        </table>

        {/* Interview Comments */}
        <table className="print-table mb-2">
          <tbody>
            <tr>
              <td colSpan={4} className="text-center font-bold bg-gray-100">Interview Comments</td>
            </tr>
            <tr>
              <th className="w-32">Evaluator</th>
              <th>Comments</th>
              <th className="w-16">Grade</th>
              <th className="w-24">Marks (Max 10)</th>
            </tr>
            {/* Populate up to 3 evaluations */}
            {evaluations.slice(0, 3).map((ev) => (
              <tr key={ev.id} className="h-12">
                <td className="font-bold">{ev.type.replace('_', ' ')}</td>
                <td>{ev.remarks || ''}</td>
                <td className="text-center">{ev.verdict === 'SELECTED' ? 'A' : ev.verdict === 'ON_HOLD' ? 'B' : ''}</td>
                <td className="text-center"></td>
              </tr>
            ))}
            {/* Fill remaining with blank rows to ensure 3 rows total */}
            {[...Array(Math.max(0, 3 - evaluations.length))].map((_, i) => (
              <tr key={`blank-${i}`} className="h-12">
                <td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

      {/* --- PAGE 2: Applicant Information Form --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative page-break">
        <div className="flex border border-black mb-4">
           <div className="w-32 border-r border-black flex items-center justify-center p-2 font-bold text-xl">NT</div>
           <div className="flex-1 p-2 text-center">
             <div className="font-bold text-base">NIPPON MOTOR CORPORATION PVT LTD</div>
             <div className="text-[10px]">XIX/9C, NIPPON TOWERS, NH-47, HMT JUNCTION</div>
             <div className="text-[10px]">KALAMASSERY P O, KOCHI-683104</div>
             <div className="text-[10px]">PH:0484-2860331 / 8606986060</div>
             <div className="text-[10px]">E-Mail ID: recruitment@nippontoyota.com</div>
           </div>
           <div className="w-32 border-l border-black p-2 flex flex-col justify-end text-center text-[9px] text-gray-400">Photo</div>
        </div>

        <table className="print-table mb-4">
          <tbody>
            <tr>
              <td colSpan={4} className="text-center font-bold bg-gray-100">Information Required from Applicants</td>
            </tr>
            <tr>
              <td className="font-bold w-32">Mobile Number</td>
              <td>{candidate.phone}</td>
              <td className="font-bold w-32">Date</td>
              <td>{today}</td>
            </tr>
            <tr>
              <td className="font-bold">Position Applied For</td>
              <td>{candidate.position_applied_for}</td>
              <td className="font-bold">Position Suitable</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div className="font-bold underline mb-2">1. Personal Data</div>
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <td className="font-bold w-32">Name</td>
              <td colSpan={3}>{candidate.full_name}</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-bold text-center bg-gray-100 w-1/2">Permanent Address</td>
              <td colSpan={2} className="font-bold text-center bg-gray-100 w-1/2">Present Address</td>
            </tr>
            <tr>
              <td className="w-24">House Name</td><td>{rd.permHouseName || ''}</td>
              <td className="w-24">House Name</td><td>{rd.presHouseName || ''}</td>
            </tr>
            <tr>
              <td>Post Office</td><td>{rd.permPostOffice || ''}</td>
              <td>Post Office</td><td>{rd.presPostOffice || ''}</td>
            </tr>
            <tr>
              <td>Landmark</td><td>{rd.permLandmark || ''}</td>
              <td>Landmark</td><td>{rd.presLandmark || ''}</td>
            </tr>
            <tr>
              <td>District</td><td>{rd.permDistrict || ''}</td>
              <td>District</td><td>{rd.presDistrict || ''}</td>
            </tr>
            <tr>
              <td>Pincode</td><td>{rd.permPinCode || ''}</td>
              <td>Pincode</td><td>{rd.presPinCode || ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table mb-4 text-center">
          <tbody>
            <tr>
              <td className="font-bold w-12">Age</td><td>{rd.age || ''}</td>
              <td className="font-bold w-12">DOB</td><td>{rd.dateOfBirth || ''}</td>
              <td className="font-bold w-16">Height</td><td>{rd.height || ''}</td>
              <td className="font-bold w-16">Weight</td><td>{rd.weight || ''}</td>
              <td className="font-bold w-20">Blood Group</td><td>{rd.bloodGroup || ''}</td>
              <td className="font-bold w-16">Gender</td><td>{rd.gender || ''}</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-bold">Marital Status</td>
              <td colSpan={4}>{rd.maritalStatus || ''}</td>
              <td colSpan={2} className="font-bold">Religion & Caste</td>
              <td colSpan={4}>{rd.religionCaste || ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table mb-4">
          <tbody>
            <tr>
              <th className="text-center">Languages Known [Read]</th>
              <th className="text-center">Languages Known [Write]</th>
              <th className="text-center">Languages Known [Speak]</th>
              <th className="text-center">Other languages known</th>
            </tr>
            <tr className="text-center h-8">
              <td>{rd.languagesRead || ''}</td>
              <td>{rd.languagesWrite || ''}</td>
              <td>{rd.languagesSpeak || ''}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <table className="print-table mb-4 text-center">
          <tbody>
            <tr>
              <th className="w-1/4">Aadhar Card Number</th>
              <th className="w-1/4">Driving License Number</th>
              <th className="w-1/4">Pancard Number</th>
              <th className="w-1/4">Passport Number</th>
            </tr>
            <tr>
              <td>{rd.aadhaarNumber || ''}</td>
              <td>{rd.drivingLicenseNumber || ''}</td>
              <td>{rd.panNumber || ''}</td>
              <td>{rd.passportNumber || ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table mb-4">
          <tbody>
            <tr>
              <td colSpan={8} className="text-center font-bold bg-gray-100">Educational Qualification</td>
            </tr>
            <tr>
              <th>Level</th>
              <th>School/College Name</th>
              <th>Course</th>
              <th>Marks obtained</th>
              <th>Passing out year</th>
              <th>Mode of Study</th>
            </tr>
            <tr>
              <td className="font-bold">10th</td>
              <td>{rd.class10School || ''}</td>
              <td>{rd.class10Board || ''}</td>
              <td>{rd.class10Percentage || ''}</td>
              <td>{rd.class10PassingYear || ''}</td>
              <td>{rd.class10Mode || ''}</td>
            </tr>
            <tr>
              <td className="font-bold">12th</td>
              <td>{rd.class12School || ''}</td>
              <td>{rd.class12Stream || ''}</td>
              <td>{rd.class12Percentage || ''}</td>
              <td>{rd.class12PassingYear || ''}</td>
              <td>{rd.class12Mode || ''}</td>
            </tr>
            <tr>
              <td className="font-bold">Graduation</td>
              <td>{rd.gradCollege || ''}</td>
              <td>{rd.gradCourse || ''}</td>
              <td>{rd.gradPercentage || ''}</td>
              <td>{rd.gradPassingYear || ''}</td>
              <td>Regular</td>
            </tr>
            <tr>
              <td className="font-bold">Post Grad</td>
              <td>{rd.postGradCollege || ''}</td>
              <td>{rd.postGradCourse || ''}</td>
              <td>{rd.postGradPercentage || ''}</td>
              <td>{rd.postGradPassingYear || ''}</td>
              <td>Regular</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- PAGE 3: Family Details & General --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative">
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <td colSpan={6} className="text-center font-bold bg-gray-100">Family Details</td>
            </tr>
            <tr>
              <th>Relation</th>
              <th>Name</th>
              <th>Age</th>
              <th>Occupation</th>
              <th>Company Name / School Name</th>
              <th>Mobile Number</th>
            </tr>
            {['Father', 'Mother', 'Spouse', 'Son / Daughter', 'Son / Daughter', 'Brother / Sister', 'Brother / Sister'].map((rel, i) => (
              <tr key={i} className="h-8">
                <td className="font-bold">{rel}</td>
                <td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="font-bold underline mb-2 text-sm">2. Additional Information</div>
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <th className="w-1/2 text-center">Achievements</th>
              <th className="w-1/2 text-center">Hobbies</th>
            </tr>
            <tr className="h-12">
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div className="font-bold underline mb-2 text-sm">3. General Informations</div>
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <td>a. Have you ever been terminated or asked to resign from any position?</td>
              <td className="w-20 text-center">{rd.prevTerminated ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>b. Have you ever had a nervous disorder?</td>
              <td className="text-center">{rd.nervousDisorder ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>c. Have you any physical disabilities?</td>
              <td className="text-center">{rd.physicalDisability ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>d. Have you any Eye vision /Colour blindness / Night blindness?</td>
              <td className="text-center">{rd.eyeVision ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>e. Have you ever been convicted of a crime other than a minor traffic or other minor offence?</td>
              <td className="text-center">{rd.criminalConviction ? 'Yes' : 'No'}</td>
            </tr>
          </tbody>
        </table>

        <div className="font-bold underline mb-2 text-sm">4. Emergency Contact Details</div>
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <th>Sl No</th>
              <th>Relation</th>
              <th>Name</th>
              <th>Address</th>
              <th>Contact Details</th>
            </tr>
            <tr className="h-10">
              <td className="text-center">1</td><td></td><td></td><td></td><td></td>
            </tr>
            <tr className="h-10">
              <td className="text-center">2</td><td></td><td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>

        <div className="font-bold underline mb-2 text-sm">5. Social Media Details</div>
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <th className="w-1/3 text-center">Name in Facebook</th>
              <th className="w-1/3 text-center">Name in Instagram</th>
              <th className="w-1/3 text-center">Name in Twitter</th>
            </tr>
            <tr className="h-10 text-center">
              <td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>

        <div className="font-bold mb-1 text-sm">6. E-Mail ID</div>
        <div className="border border-black p-2 mb-4 h-8">{candidate.email || ''}</div>
      </div>

      {/* --- PAGE 4-6: Additional HR Remarks & Blank Space --- */}
      {[4, 5, 6].map((pageNum) => (
        <div key={pageNum} className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative page-break">
          <table className="print-table w-full h-full border-none">
            <tbody>
              <tr>
                <td className="text-center font-bold text-gray-400 align-middle border-none">
                  [PAGE {pageNum} - ADDITIONAL EVALUATOR REMARKS / INTERNAL NOTES]
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* --- PAGE 7: Employment Record --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative page-break">
        <h2 className="text-center font-bold text-xl mb-6">Employment Record</h2>
        <table className="print-table mb-4">
          <tbody>
            <tr>
              <th className="w-64 text-left">Do you have any experience before</th>
              <td className="text-center font-bold">{rd.previousExperience ? 'Yes' : 'No'}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table mb-6">
          <tbody>
            <tr>
              <th className="w-1/6">Name and address of previous company</th>
              <th className="w-1/6">Position Held</th>
              <th className="w-1/4">Reporting person Name, Designation of the reporting person, Contact Number</th>
              <th className="w-1/6">Period Employed (From - To)</th>
              <th className="w-1/6">Last Drawn Salary (Salary & Allowance Portion Separately)</th>
              <th className="w-1/6">Reason For Leaving</th>
            </tr>
            {[1, 2, 3, 4].map((num) => (
              <tr key={num} className="h-16 text-center">
                <td>{rd[`prev${num}Name` as keyof typeof rd] || (num === 1 ? rd.prevCompanyName : '') || ''}</td>
                <td>{rd[`prev${num}Position` as keyof typeof rd] || (num === 1 ? rd.prevPosition : '') || ''}</td>
                <td>{rd[`prev${num}Reporting` as keyof typeof rd] || ''}</td>
                <td>
                  <div className="flex flex-col h-full text-xs">
                    <div className="flex justify-between border-b border-gray-300 pb-1"><span>From</span> <span>{rd[`prev${num}From` as keyof typeof rd] || ''}</span></div>
                    <div className="flex justify-between pt-1"><span>To</span> <span>{rd[`prev${num}To` as keyof typeof rd] || ''}</span></div>
                  </div>
                </td>
                <td>{rd[`prev${num}Salary` as keyof typeof rd] || ''}</td>
                <td>{rd[`prev${num}Reason` as keyof typeof rd] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="print-table mb-8">
          <tbody>
            <tr className="h-12">
              <th className="w-1/2">Total Experience in Years</th>
              <td className="text-center font-bold">{rd.totalExperience || ''}</td>
            </tr>
            <tr className="h-12">
              <th className="w-1/2">Expected Salary</th>
              <td className="text-center font-bold">{rd.expectedSalary || ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table mb-8">
          <tbody>
            <tr className="h-10">
              <th className="w-1/2 text-left px-2">How did you learn about the opening?</th>
              <td className="text-center">{rd.sourceOfOpening || ''}</td>
            </tr>
            <tr className="h-10">
              <th className="w-1/2 text-left px-2">Referred by or Friend/Relative who is working at Nippon Toyota</th>
              <td className="text-center">{rd.referredBy || ''}</td>
            </tr>
            <tr className="h-10">
              <th className="w-1/2 text-center">Ready to work in below mentioned branches:</th>
              <th className="w-1/2 text-center">If selected, when can you join?</th>
            </tr>
            <tr className="h-12">
              <td className="text-center">{rd.preferredRegion || candidate.branch_location || ''}</td>
              <td className="text-center font-bold">{rd.expectedJoiningDate || ''}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-center font-bold text-lg mb-4 mt-12">Declaration</div>
        <p className="text-center text-[11px] mb-8 italic px-4">
          I here declare that the particulars given above are, to the best of my knowledge and belief, correct and true. I understand that if appointed, any incorrect information given in this application if sufficient cause of termination of my services.
        </p>

        <table className="print-table">
          <tbody>
            <tr className="h-12">
              <th className="w-24">Place</th>
              <td className="w-1/3"></td>
              <th className="w-1/3 bg-gray-100 row-span-2 text-center align-middle">Signature of the applicant</th>
              <td className="row-span-2"></td>
            </tr>
            <tr className="h-12">
              <th className="w-24">Date</th>
              <td className="w-1/3 text-center">{today}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- PAGE 8: Background Verification --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative page-break">
        
        <table className="print-table w-full mb-2">
          <tbody>
            <tr>
              <td rowSpan={2} className="w-24 text-center font-bold text-2xl">NT</td>
              <td rowSpan={2} className="font-bold text-xl text-center">TOYOTA<br/><span className="text-xs font-normal">NIPPON MOTOR CORPORATION (P) LTD.</span></td>
            </tr>
            <tr></tr>
            <tr>
              <td colSpan={2} className="text-center italic font-semibold border-b-0 pb-1 pt-2">Human Resources Department</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center font-bold text-lg border-t-0 pt-0 pb-2">Background Verification</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table w-full mb-1">
          <tbody>
            <tr>
              <th className="w-1/4">Name of the candidate</th>
              <td className="w-1/4 text-center">{candidate.full_name}</td>
              <th className="w-1/6">Mobile No</th>
              <td className="w-1/6 text-center">{candidate.phone}</td>
              <td rowSpan={2} className="text-center align-bottom text-[10px]">Date: {today}</td>
            </tr>
            <tr>
              <th className="w-1/4">Post Applied</th>
              <td className="w-1/4 text-center">{candidate.position_applied_for}</td>
              <th className="w-1/6 text-center" colSpan={2}>{candidate.branch_location}</th>
            </tr>
          </tbody>
        </table>

        <table className="print-table w-full mb-1">
          <tbody>
            <tr><th colSpan={4} className="text-center bg-gray-200">LOCALITY FEEDBACK</th></tr>
            <tr>
              <td className="w-1/3">Name of the Panchayath / Muncipality / Corporation</td>
              <td colSpan={3} className="text-center">{rd.refPanchayat || ''}</td>
            </tr>
            <tr>
              <td className="w-1/4">Name of the Councillor</td>
              <td className="w-1/4 text-center"></td>
              <td className="w-1/4">Name of Panchayath member</td>
              <td className="w-1/4 text-center"></td>
            </tr>
            <tr>
              <td className="w-1/4 text-center">Contact No :</td>
              <td className="w-1/4 text-center"></td>
              <td className="w-1/4 text-center">Contact No :</td>
              <td className="w-1/4 text-center"></td>
            </tr>
            <tr>
              <td colSpan={2}>Any issue that has been updated till date (Yes / No )</td>
              <td colSpan={2} className="text-center"></td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center text-gray-500 text-[10px]">If yes specify</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}>Any Police Case Reported (Yes / No )</td>
              <td colSpan={2} className="text-center"></td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center text-gray-500 text-[10px]">If yes specify</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}>Any kind of family issues (Yes / No )</td>
              <td colSpan={2} className="text-center"></td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center text-gray-500 text-[10px]">If yes specify</td>
              <td colSpan={2}></td>
            </tr>
            <tr className="h-10">
              <th className="italic text-center align-middle w-1/4">Over all<br/>feedback</th>
              <td colSpan={3} className="text-center align-middle"></td>
            </tr>
          </tbody>
        </table>

        <table className="print-table w-full mb-1">
          <tbody>
            <tr><th colSpan={4} className="text-center bg-gray-200">SOCIAL MEDIA EVALUATION</th></tr>
            <tr>
              <th className="w-1/4 text-center">Name in Facebook</th>
              <td className="w-1/4 text-center">{rd.facebookUrl || ''}</td>
              <th className="w-1/4 text-center">Name in Instagram</th>
              <td className="w-1/4 text-center">{rd.instagramUrl || ''}</td>
            </tr>
            <tr>
              <th className="text-center">Twitter / LinkedIn Connections</th>
              <td colSpan={3} className="text-center">{rd.twitterUrl || ''}</td>
            </tr>
            <tr>
              <td colSpan={2}>Any kind of political interference in his personal charge (yes / No )</td>
              <td colSpan={2} className="text-center"></td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center text-gray-500 text-[10px]">If yes - which political side</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}>What are the kind of shared / liked pages</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}>In Instagram / facebook who all are the followers</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}>Past 4 years what all are his following pages</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center">Whether the candidate is active in social media (Yes/No)</td>
              <td colSpan={2}></td>
            </tr>
            <tr className="h-10">
              <th className="italic text-center align-middle w-1/4">Over all<br/>feedback</th>
              <td colSpan={3} className="text-center align-middle"></td>
            </tr>
          </tbody>
        </table>

        <table className="print-table w-full mb-1">
          <tbody>
            <tr><th colSpan={5} className="text-center bg-gray-500 text-white">Feedback from previous Employer</th></tr>
            <tr className="text-center">
              <th className="w-1/5">Employer Name</th>
              <td className="w-1/4"></td>
              <th className="w-1/6">Designation</th>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <th className="text-center h-12">Period of Employment</th>
              <th className="text-center border-r-0">From</th>
              <td className="border-l-0 text-center"></td>
              <th className="text-center border-r-0">To</th>
              <td className="border-l-0 text-center"></td>
            </tr>
            <tr>
              <th className="text-center h-12">Name of Contacted Person For Verification</th>
              <td colSpan={2}></td>
              <th className="text-center">Designation of contacted person</th>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2}>Contacted person Mob No :</td>
              <td colSpan={3}></td>
            </tr>
            <tr>
              <td colSpan={2}>Employee - Employer Rapport</td>
              <td colSpan={3}></td>
            </tr>
            <tr>
              <td colSpan={3}>Any Financial Loans & Advances taken by the candidate (Yes / No)</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={3} className="text-center text-[10px] text-gray-500">If yes specify</td>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={3}>If Any long leaves Taken (Yes / No)</td>
              <td colSpan={2}></td>
            </tr>
            <tr className="h-10">
              <th className="italic text-center align-middle w-1/4">Over all<br/>feedback</th>
              <td colSpan={4} className="text-center align-middle"></td>
            </tr>
          </tbody>
        </table>

        <table className="print-table w-full mt-4">
          <tbody>
            <tr className="text-center bg-gray-100">
              <th className="w-1/3">Prepared By</th>
              <th className="w-1/3">Checked By</th>
              <th className="w-1/3">Checked By</th>
            </tr>
            <tr className="h-12">
              <td></td><td></td><td></td>
            </tr>
            <tr className="text-center">
              <td className="text-gray-500 font-bold">HRD</td>
              <td className="text-gray-500 font-bold">HRD</td>
              <td className="text-gray-500 font-bold">HRM</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- PAGE 9: Resume / Biodata --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative flex flex-col items-center justify-center page-break">
        <div className="border-4 border-dashed border-gray-300 rounded-xl p-16 text-center max-w-lg">
           <h2 className="text-3xl font-bold text-gray-400 mb-4">RESUME / BIODATA</h2>
           <p className="text-gray-500 text-lg mb-8">Please attach the candidate's physical resume behind this page.</p>
           {candidate.has_resume ? (
             <div className="text-gray-400">Digital resume is available in the system.</div>
           ) : (
             <div className="text-gray-400">No digital resume uploaded</div>
           )}
        </div>
      </div>

      {/* --- PAGE 10: Technical Test Marks --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white my-8 p-[10mm] shadow-lg box-border relative">
        <table className="print-table w-full mb-4">
          <tbody>
            <tr>
              <th className="w-1/2 text-left font-bold text-lg p-2">TOYOTA<br/><span className="text-xs font-normal">NIPPON MOTOR CORPORATION</span></th>
              <td className="w-1/2 p-0 align-top">
                <table className="w-full h-full border-none">
                  <tbody>
                    <tr><td className="border-none font-bold">Series B</td></tr>
                    <tr><td className="border-none">Version 2020.1</td></tr>
                    <tr><td className="border-none">Date: {today}</td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <th colSpan={2} className="text-center font-bold">Human Resources Department</th>
            </tr>
            <tr>
              <th className="w-1/2 text-left p-2">Name of the Candidate: {candidate.full_name}</th>
              <th className="w-1/2 text-left p-2">Position Applied For: {candidate.position_applied_for}</th>
            </tr>
            <tr>
              <th colSpan={2} className="text-center font-bold text-lg p-2 bg-gray-100">Question Paper - Call Centre</th>
            </tr>
          </tbody>
        </table>

        <table className="print-table w-full">
          <thead>
            <tr>
              <th className="w-12 text-center">No</th>
              <th className="text-left">Question</th>
              <th className="w-16 text-center">Max. Marks</th>
              <th className="w-20 text-center">Marks Obtained</th>
            </tr>
          </thead>
          <tbody>
            {[
              "What is the position of Toyota in global automobile industry?",
              "Which are existing models of Toyota in India?",
              "How many dealership does Nippon Toyota have in Kerala?",
              "You should greet & say the Company's name when you answer the phone (True/False)",
              "Apologise to the customer, even if any mistake was done by another staff (True/False)",
              "Which of the following is a communication type? (Verbal & Non verbal, Positive/Negative, One way/Two way)",
              "Which of the following are barriers to effective communication? (Noise, Frame of mind, Difficult words, Listening skills)",
              "Is effective communication an important skill as an individual and professional (True/False)",
              "When having a disagreement, I typically: (Lower voice, Maintain normal level, Raise voice)",
              "The way we communicate makes an impression on others (True/False)",
              "Why do customers usually complain? (Needs not met, Building relationship, Fond of increasing network)"
            ].map((q, i) => (
              <tr key={i} className="h-14">
                <td className="text-center">{i + 1}</td>
                <td className="font-medium pr-4">{q}</td>
                <td className="text-center font-bold">1</td>
                <td className="text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
