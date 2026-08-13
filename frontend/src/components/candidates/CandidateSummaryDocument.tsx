import React from 'react';
import type { Candidate, Evaluation } from '../../types';

interface CandidateSummaryDocumentProps {
  candidate: Candidate;
  evaluations: Evaluation[];
}

export function CandidateSummaryDocument({ candidate, evaluations }: CandidateSummaryDocumentProps) {
  const getEval = (type: string) => evaluations.find(e => e.type === type);
  const hrEval = getEval('BRANCH_HR');
  const deptEval = getEval('DEPT_HEAD');
  const hqEval1 = getEval('HQ_INTERVIEW_1');
  const hqEval2 = getEval('HQ_INTERVIEW_2');
  const techEval = getEval('TECHNICAL_TEST');

  // Format Date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).format(d);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[10mm] text-black font-sans text-xs box-border scale-[0.8] md:scale-100 origin-top">
      {/* HEADER SECTION */}
      <div className="border border-black mb-2 flex items-center p-2 gap-4">
        <div className="w-24 h-12 flex items-center justify-center font-bold text-lg border-2 border-black rounded-full italic shrink-0">
          TOYOTA
        </div>
        <div className="flex-1 text-center">
          <h1 className="font-bold text-sm tracking-wide">NIPPON MOTOR CORPORATION (P) LTD, NIPPON TOWERS, KALAMASSERY</h1>
        </div>
      </div>
      
      <div className="text-center font-bold border-b border-black pb-1 mb-2">Human Resource Department</div>
      
      {/* CANDIDATE SUMMARY SHEET */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed">
        <tbody>
          <tr className="border border-black">
            <td colSpan={6} className="bg-gray-200 text-center font-bold border border-black py-1">Candidate Summary Sheet</td>
          </tr>
          <tr className="border border-black text-[10px]">
            <td className="border border-black p-1 font-semibold w-[15%]">Name</td>
            <td className="border border-black p-1 w-[25%]">{candidate.full_name}</td>
            <td className="border border-black p-1 font-semibold w-[15%]">Application Submitted on:</td>
            <td className="border border-black p-1 w-[15%]">{formatDate(candidate.created_at)}</td>
            <td className="border border-black p-1 font-semibold w-[15%]">Department</td>
            <td className="border border-black p-1 w-[15%]">{candidate.department || ''}</td>
          </tr>
          <tr className="border border-black text-[10px]">
            <td className="border border-black p-1 font-semibold">Post Applied</td>
            <td className="border border-black p-1">{candidate.department}</td>
            <td className="border border-black p-1 font-semibold">Source</td>
            <td className="border border-black p-1">{candidate.source}</td>
            <td className="border border-black p-1 font-semibold">Location</td>
            <td className="border border-black p-1">{candidate.branch_location || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* PERSONAL DETAILS */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed text-[10px]">
        <tbody>
          <tr className="border border-black">
            <td colSpan={4} className="bg-gray-200 text-center font-bold border border-black py-1">Personal Details</td>
            <td rowSpan={7} className="border border-black w-[20%] p-1 text-center align-middle">
               <div className="w-[35mm] h-[45mm] border border-dashed border-gray-400 mx-auto flex items-center justify-center text-gray-400">
                  Photo
               </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold w-[15%]">Contact No:</td>
            <td className="border border-black p-1 w-[25%]">{candidate.phone}</td>
            <td className="border border-black p-1 font-semibold w-[15%]">Date of Birth</td>
            <td className="border border-black p-1 w-[25%]"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Contact Address</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold bg-gray-200 text-center" colSpan={2}>Experience</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Email</td>
            <td className="border border-black p-1">{candidate.email}</td>
            <td className="border border-black p-1 font-semibold text-center">Total Work Experience</td>
            <td className="border border-black p-1 text-center"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Educational Qualification</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold text-center">Father's Occupation</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Computer Knowledge</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold text-center">Mother's Occupation</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Driving Licence</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold text-center">Spouse Occupation</td>
            <td className="border border-black p-1"></td>
          </tr>
        </tbody>
      </table>

      {/* SCORE BOARD / TEST RESULTS */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed text-[10px]">
        <tbody>
          <tr className="border border-black">
            <td colSpan={4} className="bg-gray-200 text-center font-bold border border-black py-1">SCORE BOARD / TEST RESULTS (% Wise)</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold w-[25%]">Psychometry test Result</td>
            <td className="border border-black p-1 text-center w-[15%]"></td>
            <td rowSpan={4} className="border border-black p-1 text-center align-middle font-bold w-[30%]">
              TOTAL AVERAGE <br/><span className="text-sm"></span>
            </td>
            <td className="border border-black p-1 font-semibold w-[30%]">1st Interview: <span className="float-right">{hrEval ? formatDate(hrEval.created_at) : ''}</span></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Analytical Test Result</td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 font-semibold">2nd Interview: <span className="float-right">{deptEval ? formatDate(deptEval.created_at) : ''}</span></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Technical Test Result</td>
            <td className="border border-black p-1 text-center">{techEval?.scores?.percentage ? `${techEval.scores.percentage}%` : ''}</td>
            <td className="border border-black p-1 font-semibold">3rd Interview: <span className="float-right"></span></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Department Test Result</td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 font-semibold">4th Interview: <span className="float-right"></span></td>
          </tr>
        </tbody>
      </table>

      {/* EMPLOYMENT RECORD */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed text-[10px]">
        <thead>
          <tr className="bg-gray-200 border border-black text-center font-bold">
            <td colSpan={6} className="py-1 border border-black">Employment Record</td>
          </tr>
          <tr className="border border-black font-semibold text-center">
            <td className="border border-black p-1 w-[20%]">Organisation</td>
            <td className="border border-black p-1 w-[20%]">Period</td>
            <td className="border border-black p-1 w-[10%]">No. of Years</td>
            <td className="border border-black p-1 w-[15%]">Designation</td>
            <td className="border border-black p-1 w-[20%]">Reason for Resignation</td>
            <td className="border border-black p-1 w-[15%]">Total Salary</td>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((row) => (
            <tr key={row} className="border border-black text-center h-8">
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* SALARY EXPECTATION */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed text-[10px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 font-semibold w-[20%]">Current Salary</td>
            <td className="border border-black p-1 w-[20%]"></td>
            <td rowSpan={4} className="border border-black p-1 text-center align-middle font-semibold w-[20%]">Remarks</td>
            <td className="border border-black p-1 font-semibold w-[20%]">Expected Salary</td>
            <td className="border border-black p-1 w-[20%]"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Incentive</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold">Incentive</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Others</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold">Others</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Total</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 font-semibold">Total</td>
            <td className="border border-black p-1"></td>
          </tr>
        </tbody>
      </table>

      {/* INTERVIEW COMMENTS */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed text-[10px]">
        <tbody>
          <tr className="bg-gray-200 border border-black text-center font-bold">
            <td className="border border-black p-1 w-[15%]"></td>
            <td className="border border-black p-1 w-[20%]">Interviewer</td>
            <td className="border border-black p-1 w-[45%]">Interview Comments</td>
            <td className="border border-black p-1 w-[10%]">Grade</td>
            <td className="border border-black p-1 w-[10%]">Marks (Max 10)</td>
          </tr>
          
          <tr className="border border-black text-center h-16">
             <td className="border border-black p-1 font-bold text-center align-middle" rowSpan={3}>Interview Comments</td>
             <td className="border border-black p-1">BRANCH HR</td>
             <td className="border border-black p-2 text-left align-top">{hrEval?.remarks || ''}</td>
             <td className="border border-black p-1">{hrEval?.verdict?.charAt(0) || ''}</td>
             <td className="border border-black p-1">{hrEval?.scores?.total_score || ''}</td>
          </tr>
          <tr className="border border-black text-center h-16">
             <td className="border border-black p-1">DEPT HEAD</td>
             <td className="border border-black p-2 text-left align-top">{deptEval?.remarks || ''}</td>
             <td className="border border-black p-1">{deptEval?.verdict?.charAt(0) || ''}</td>
             <td className="border border-black p-1">{deptEval?.scores?.total_score || ''}</td>
          </tr>
          <tr className="border border-black text-center h-16">
             <td className="border border-black p-1">HEAD OFFICE</td>
             <td className="border border-black p-2 text-left align-top">{hqEval1?.remarks || ''}</td>
             <td className="border border-black p-1">{hqEval1?.verdict?.charAt(0) || ''}</td>
             <td className="border border-black p-1">{hqEval1?.scores?.total_score || ''}</td>
          </tr>
          <tr className="border border-black text-center h-16">
             <td className="border border-black p-1 font-bold text-center align-middle" colSpan={2}>CMD</td>
             <td className="border border-black p-2 text-left align-top">{hqEval2?.remarks || ''}</td>
             <td className="border border-black p-1">{hqEval2?.verdict?.charAt(0) || ''}</td>
             <td className="border border-black p-1">{hqEval2?.scores?.total_score || ''}</td>
          </tr>
          <tr className="border border-black text-center">
             <td colSpan={3} className="border border-black p-1"></td>
             <td className="border border-black p-1 font-bold text-right">Total Marks</td>
             <td className="border border-black p-1 font-bold">
               { [hrEval, deptEval, hqEval1, hqEval2].reduce((sum, ev) => sum + (Number(ev?.scores?.total_score) || 0), 0) || '' }
             </td>
          </tr>
        </tbody>
      </table>
      
      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-5 gap-0 border border-black text-[10px] text-center mt-4 h-16">
         <div className="border-r border-black p-2">
            <div className="font-semibold mb-2">Offer Letter Issued</div>
            <div className="w-4 h-4 border border-black mx-auto"></div>
         </div>
         <div className="border-r border-black p-2 col-span-2">
            <div className="font-semibold mb-2">Offer Communication Message</div>
            <div className="flex justify-center gap-4">
               <div>Accepted <div className="w-4 h-4 border border-black inline-block ml-1 align-middle"></div></div>
               <div>Rejected <div className="w-4 h-4 border border-black inline-block ml-1 align-middle"></div></div>
            </div>
         </div>
         <div className="border-r border-black p-2">
            <div className="font-semibold mb-2">Document Carry Message</div>
            <div className="w-4 h-4 border border-black mx-auto"></div>
         </div>
         <div className="p-2 flex flex-col justify-between text-left border-l-0">
            <div className="font-semibold">Follow Up Call (N-1) <div className="w-4 h-4 border border-black inline-block float-right"></div></div>
            <div className="font-semibold">Date Of Joining: ___________</div>
         </div>
      </div>
    </div>
  );
}