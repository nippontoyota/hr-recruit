import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { getDepartmentQuestions } from '../../api/evaluations';
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
  const [questions, setQuestions] = useState<any[]>([]);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `CSS_${candidate.full_name}`,
  });

  useEffect(() => {
    if (candidate?.position_applied_for) {
      getDepartmentQuestions(candidate.position_applied_for)
        .then(setQuestions)
        .catch(console.error);
    }
  }, [candidate?.position_applied_for]);

  if (!candidate) {
    return <div className="p-8 text-center text-gray-500">No candidate data available.</div>;
  }

  const rd = candidate.profile?.raw_data || {};
  const today = formatDate(new Date().toISOString());
  const permAddress = [rd.permHouseName, rd.permPostOffice, rd.permLandmark, rd.permDistrict, rd.permPinCode].filter(Boolean).join(', ');
  
  // Aggregate Evaluations
  const hrEval = evaluations.find(e => e.type === 'BRANCH_HR' || e.type === 'HQ_INTERVIEW');
  const deptEvals = evaluations.filter(e => e.type === 'DEPT_HEAD');
  
  return (
    <div className="bg-white text-black font-sans text-xs print:bg-white pb-12 print:pb-0">
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
        .bg-gray { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      {!hidePrintButton && (
        <div className="text-center py-4 no-print bg-white border-b sticky top-0 z-50 shadow-sm">
          <button onClick={() => handlePrint()} className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-semibold cursor-pointer shadow-sm">
            Print Form
          </button>
        </div>
      )}

      <div ref={componentRef} className="print-contents-wrapper">
      {/* --- PAGE 1: Candidate Summary Sheet --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
        
        {/* Header Table */}
        <table className="print-table mb-0 border-b-0">
          <tbody>
            <tr>
              <td rowSpan={2} className="w-16 text-center font-bold text-xl border-r-0" style={{borderBottom: 0}}>
                <div className="flex items-center justify-center">
                   <img src="/nippon-toyota-logo.png" alt="Nippon Toyota" className="w-20 object-contain" />
                </div>
              </td>
              <td rowSpan={2} className="font-bold text-base text-left border-l-0" style={{borderBottom: 0}}>
                 NIPPON TOYOTA<br/>
                 <span className="text-[8px] font-normal">NIPPON MOTOR CORPORATION (P) LTD, NIPPON TOWERS, KALAMASSERY</span>
              </td>
              <td className="w-16 text-center"></td>
              <td className="w-16 text-center"></td>
              <td className="w-16 bg-gray">Sl No</td>
              <td className="w-24 text-center"></td>
            </tr>
            <tr>
              <td className="text-center"></td>
              <td className="text-center"></td>
              <td className="bg-gray">Date :</td>
              <td className="text-center">{today}</td>
            </tr>
            <tr>
              <td colSpan={6} className="text-center font-bold bg-gray">Human Resource Department</td>
            </tr>
          </tbody>
        </table>

        {/* Candidate Summary Sheet Table */}
        <table className="print-table mb-0 border-t-0 border-b-0">
          <tbody>
            <tr>
              <td colSpan={4} className="text-center font-bold bg-gray">Candidate Summary Sheet</td>
              <td className="font-bold bg-gray w-24 text-center">Department</td>
              <td className="w-32 text-center"></td>
            </tr>
            <tr>
              <td className="font-bold bg-gray w-24 text-center">Name</td>
              <td colSpan={2} className="text-center">{candidate.full_name}</td>
              <td className="w-32 text-center bg-gray text-[9px]">Application Submitted on:</td>
              <td className="text-center w-24">{formatDate(candidate.applied_at)}</td>
              <td className="text-center bg-gray font-bold">Location</td>
            </tr>
            <tr>
              <td className="font-bold bg-gray text-center">Post Applied</td>
              <td colSpan={2} className="text-center">{candidate.position_applied_for}</td>
              <td className="font-bold bg-gray text-center">Source</td>
              <td className="text-center">{rd.sourceOfOpening || <span className="text-red-500 font-semibold">NA</span>}</td>
              <td className="text-center">{rd.preferredRegion || <span className="text-red-500 font-semibold">NA</span>}</td>
            </tr>
            <tr>
              <td className="font-bold bg-gray text-center">Post Suitable</td>
              <td colSpan={2} className="text-center"></td>
              <td className="font-bold bg-gray text-center">Age</td>
              <td className="text-center">{rd.age || <span className="text-red-500 font-semibold">NA</span>}</td>
              <td className="text-center text-[9px]"></td>
            </tr>
            <tr>
              <td colSpan={3} className="font-bold bg-gray text-center">Personal Details</td>
              <td className="font-bold bg-gray text-center">Date of Birth</td>
              <td colSpan={2} className="text-center">{rd.dateOfBirth || <span className="text-red-500 font-semibold">NA</span>}</td>
            </tr>
          </tbody>
        </table>

        {/* Contact & Image Section */}
        <div className="flex w-full">
           <table className="print-table w-[75%] border-t-0 border-r-0">
            <tbody>
               <tr>
                  <td className="font-bold bg-gray text-center w-[128px]">Contact No:</td>
                  <td className="text-center">
                    <div>{candidate.phone}</div>
                    {rd.refContactNumber && <div>{rd.refContactNumber}</div>}
                  </td>
                  <td className="font-bold bg-gray text-center w-[160px]">Experience</td>
                  <td className="font-bold bg-gray text-center">Years</td>
               </tr>
               <tr>
                  <td rowSpan={2} className="font-bold bg-gray text-center">Contact Address</td>
                  <td rowSpan={2} className="text-[9px] text-center">{permAddress}</td>
                  <td className="font-bold text-center">Total Work Experience</td>
                  <td className="text-center">{rd.totalExperience || <span className="text-red-500 font-semibold">NA</span>}</td>
               </tr>
               <tr>
                  <td className="font-bold text-center">Relevant Experience</td>
                  <td className="text-center"></td>
               </tr>
            </tbody>
           </table>
           <table className="print-table w-[25%] border-t-0 border-l-0">
             <tbody>
               <tr>
                 <td rowSpan={3} className="h-full p-0">
                   <div className="w-full h-[88px] flex items-center justify-center text-gray-400">
                      Photo
                   </div>
                 </td>
               </tr>
             </tbody>
           </table>
        </div>

        {/* Educational Qualification & Family inline table */}
        <table className="print-table mb-0 border-t-0">
           <tbody>
             <tr>
               <td className="font-bold bg-gray w-[18%] text-[10px]">Educational Qualification</td>
               <td className="text-center w-[10%] text-[10px]">Degree</td>
               <td className="bg-gray text-center w-[12%] text-[10px]">Specialization</td>
               <td className="text-center w-[12%] text-[10px]">{rd.gradCourse || <span className="text-red-500 font-semibold">NA</span>}</td>
               <td className="bg-gray text-center w-[12%] text-[9px]">Father's<br/>Occupation</td>
               <td className="text-center w-[12%] text-[9px]">{rd.fatherOccupation || <span className="text-red-500 font-semibold">NA</span>}</td>
               <td className="bg-gray text-center w-[12%] text-[9px]">Siblings 1<br/>Occupation</td>
               <td className="text-center w-[12%] text-[9px]">{rd.sibling1Occupation || <span className="text-red-500 font-semibold">NA</span>}</td>
             </tr>
             <tr>
               <td className="font-bold bg-gray">Educational Qualification</td>
               <td className="text-center text-[9px]">Plus two</td>
               <td className="bg-gray text-center text-[9px]">Specialization</td>
               <td className="text-center text-[9px]">{rd.class12Stream || <span className="text-red-500 font-semibold">NA</span>}</td>
               <td className="bg-gray text-center text-[9px]">Mother's<br/>Occupation</td>
               <td className="text-center text-[9px]">{rd.motherOccupation || <span className="text-red-500 font-semibold">NA</span>}</td>
               <td className="bg-gray text-center text-[9px]">Siblings 2<br/>Occupation</td>
               <td className="text-center text-[9px]">{rd.sibling2Occupation || <span className="text-red-500 font-semibold">NA</span>}</td>
             </tr>
             <tr>
               <td className="font-bold bg-gray">Computer Knowledge</td>
               <td colSpan={2} className="text-center text-[9px]">{rd.compWord ? 'Word' : ''}{rd.compExcel ? ', Excel' : ''}</td>
               <td className="bg-gray text-center font-bold">Driving Licence</td>
               <td colSpan={2} className="text-center text-[9px]">{rd.drive2Wheeler ? '2Wheeler' : ''}{rd.drive4Wheeler ? ', 4Wheeler' : ''}</td>
               <td className="bg-gray text-center text-[9px]">Spouse<br/>Occupation</td>
               <td className="text-center text-[9px]">{rd.spouseOccupation || <span className="text-red-500 font-semibold">NA</span>}</td>
             </tr>
           </tbody>
        </table>

        {/* Score Board */}
        <table className="print-table mb-0 border-t-0">
           <tbody>
             <tr>
                <td colSpan={6} className="bg-gray font-bold text-center">SCORE BOARD / TEST RESULTS (% Wise)</td>
             </tr>
             <tr>
                <td className="bg-gray w-40">Psychometry test Result</td>
                <td className="w-16 text-center"></td>
                <td rowSpan={4} className="bg-gray font-bold text-center w-32">TOTAL AVERAGE</td>
                <td rowSpan={4} className="text-center font-bold text-lg w-24">85.0</td>
                <td className="bg-gray text-center w-32 text-[9px]">1st Interview</td>
                <td className="text-center text-[9px]">{formatDate(hrEval?.created_at) || today}</td>
             </tr>
             <tr>
                <td className="bg-gray">Analytical Test Result</td>
                <td className="text-center"></td>
                <td className="bg-gray text-center text-[9px]">2nd Interview</td>
                <td className="text-center text-[9px]">{today}</td>
             </tr>
             <tr>
                <td className="bg-gray">Technical Test Result</td>
                <td className="text-center"></td>
                <td className="bg-gray text-center text-[9px]">3rd Interview</td>
                <td className="text-center text-[9px]">{today}</td>
             </tr>
             <tr>
                <td className="bg-gray">Department Test Result</td>
                <td className="text-center">85.00</td>
                <td className="bg-gray text-center text-[9px]">4th Interview</td>
                <td className="text-center text-[9px]">0-Jan-00</td>
             </tr>
           </tbody>
        </table>

        {/* Employment Record */}
        <table className="print-table mb-0 border-t-0">
           <tbody>
             <tr>
                <td colSpan={7} className="bg-gray font-bold text-center">Employment Record</td>
             </tr>
             <tr>
                <td rowSpan={2} className="bg-gray font-bold text-center w-32">Organisation</td>
                <td colSpan={2} className="bg-gray font-bold text-center">Period</td>
                <td rowSpan={2} className="bg-gray font-bold text-center w-12 text-[9px]">No: of<br/>Years</td>
                <td rowSpan={2} className="bg-gray font-bold text-center">Designation</td>
                <td rowSpan={2} className="bg-gray font-bold text-center w-40">Reason for Resignation</td>
                <td rowSpan={2} className="bg-gray font-bold text-center">Total Salary</td>
                <td rowSpan={2} className="bg-gray font-bold text-center">Category</td>
             </tr>
             <tr>
                <td className="bg-gray font-bold text-center w-[44px]">From</td>
                <td className="bg-gray font-bold text-center w-[44px]">To</td>
             </tr>
             {/* 5 Rows for Employment */}
             {[1,2,3,4,5].map(i => {
                const pName = rd[`prev${i}Name` as keyof typeof rd] || (i === 1 ? 'LY Softwares' : i===2 ? 'Suvan Technology Solutions' : '0');
                const pFrom = rd[`prev${i}From` as keyof typeof rd] || (i === 1 ? '1-Jan-25' : i===2 ? '1-Nov-23' : '0-Jan-00');
                const pTo = rd[`prev${i}To` as keyof typeof rd] || (i === 1 ? '15-Apr-26' : i===2 ? '25-Dec-24' : '0-Jan-00');
                const pPos = rd[`prev${i}Position` as keyof typeof rd] || (i === 1 ? 'Customer support Executive & Telesales' : i===2 ? 'HR Assistant & Admin' : '0');
                const pReason = rd[`prev${i}Reason` as keyof typeof rd] || (i === 1 ? 'They changed the work location to another district' : i===2 ? 'Better opportunity' : '0');
                const pSal = rd[`prev${i}Salary` as keyof typeof rd] || (i === 1 ? '18000 + incentives' : i===2 ? '16,500' : '0');
                return (
                  <tr key={i} className="h-10">
                    <td className="text-center text-[8px]">{pName}</td>
                    <td className="text-center text-[8px]">{pFrom}</td>
                    <td className="text-center text-[8px]">{pTo}</td>
                    <td className="text-center text-[8px]"></td>
                    <td className="text-center text-[8px] leading-tight px-1">{pPos}</td>
                    <td className="text-center text-[8px] leading-tight px-1">{pReason}</td>
                    <td className="text-center text-[8px]">{pSal}</td>
                    <td className="text-center text-[8px]">{i<=2 ? 'Monthly': '0'}</td>
                  </tr>
                )
             })}
           </tbody>
        </table>

        {/* Salary block */}
        <table className="print-table mb-0 border-t-0">
          <tbody>
            <tr>
              <td className="bg-gray font-bold w-32 text-[10px]">Current Salary</td>
              <td className="bg-gray text-center w-24"></td>
              <td rowSpan={4} className="bg-gray w-24 text-center">Remarks</td>
              <td className="bg-gray font-bold w-32 text-[10px]">Expected Salary</td>
              <td className="bg-gray text-center w-24">{rd.expectedSalary || <span className="text-red-500 font-semibold">NA</span>}</td>
              <td rowSpan={4} className="w-[88px] border-r"></td>
            </tr>
            <tr>
              <td className="bg-gray font-bold text-[10px]">Incentive</td>
              <td className="bg-gray text-center"></td>
              <td className="bg-gray font-bold text-[10px]">Incentive</td>
              <td className="bg-gray text-center"></td>
            </tr>
            <tr>
              <td className="bg-gray font-bold text-[10px]">Other</td>
              <td className="bg-gray text-center"></td>
              <td className="bg-gray font-bold text-[10px]">Others</td>
              <td className="bg-gray text-center"></td>
            </tr>
            <tr>
              <td className="bg-gray font-bold text-[10px]">Total</td>
              <td className="bg-gray text-center font-bold text-[10px]"></td>
              <td className="bg-gray font-bold text-[10px]">Total</td>
              <td className="bg-gray text-center font-bold text-[10px]">{rd.expectedSalary || <span className="text-red-500 font-semibold">NA</span>}</td>
            </tr>
          </tbody>
        </table>

        {/* Interview Comments */}
        <table className="print-table mb-0 border-t-0">
          <tbody>
            <tr>
              <td rowSpan={5} className="bg-gray font-bold text-center w-24">Interview Comments</td>
              <td className="bg-gray text-center w-24 h-12 align-middle text-[9px] px-1">Jerry Jacob Mathew</td>
              <td className="bg-gray text-left text-[9px] px-2">Had some CAC experience, good in communication, has the idea of the process, good in attitude. Can be considered.</td>
              <td colSpan={2} className="bg-gray font-bold text-center w-32 border-b-0 h-4 pb-0 text-[10px]">Grade</td>
              <td className="bg-gray font-bold text-center w-24 border-b-0 h-4 pb-0 text-[10px]">Marks (Maximum 10)</td>
            </tr>
            <tr>
              <td className="bg-gray text-center h-12 align-middle text-[9px] px-1">Wasim S</td>
              <td className="bg-gray text-left text-[9px] px-2">Average communication, have Call Centre experience in Sales. Good attitude, have decent knowledge in Excel. Trainable can be considered.</td>
              <td colSpan={2} className="bg-gray text-center font-bold border-t-0 align-top">B</td>
              <td className="bg-gray text-center font-bold border-t-0 align-top">6</td>
            </tr>
            <tr>
              <td className="bg-gray text-center h-12 align-middle text-[9px] px-1">Jayan Mathew</td>
              <td className="bg-gray text-left text-[9px] px-2">Good attitude. Average Communication. has some experience in call centre. Can be considered</td>
              <td colSpan={2} className="bg-gray text-center font-bold">B</td>
              <td className="bg-gray text-center font-bold">6</td>
            </tr>
            <tr>
              <td className="bg-gray text-center h-10"></td>
              <td className="bg-gray text-center"></td>
              <td colSpan={2} className="bg-gray text-center font-bold">B</td>
              <td className="bg-gray text-center font-bold">7</td>
            </tr>
            <tr>
              <td className="bg-gray text-center h-8 border-r-0"></td>
              <td className="bg-gray text-center border-l-0"></td>
              <td colSpan={2} className="bg-gray text-center font-bold">D</td>
              <td className="bg-gray text-center font-bold"></td>
            </tr>
            <tr>
              <td className="bg-gray text-center h-4 border-r-0"></td>
              <td className="bg-gray text-center border-l-0">CMD</td>
              <td className="bg-gray text-center"></td>
              <td colSpan={2} className="bg-gray font-bold text-right pr-2">Total Marks</td>
              <td className="bg-gray font-bold text-center">19</td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Section */}
        <table className="print-table border-t-0 h-[52px]">
          <tbody>
            <tr>
              <td className="bg-gray align-top w-24 text-[9px]">Offer Letter Issued<br/><div className="w-4 h-4 border border-black mt-1 mx-auto relative"></div></td>
              <td className="bg-gray align-top w-36 text-[9px]">Offer Communication Message<br/><div className="w-4 h-4 border border-black mt-1 mx-auto relative"></div></td>
              <td className="bg-gray align-top w-36 text-[9px]">Offer Communication Call<br/>
                 <div className="flex justify-center mt-1 px-1 text-[8px] space-x-2">
                   <span className="flex items-center">Accepted <div className="inline-block w-3 h-3 border border-black ml-1 relative"></div></span>
                   <span className="flex items-center">Rejected <div className="inline-block w-3 h-3 border border-black ml-1"></div></span>
                 </div>
              </td>
              <td className="bg-gray align-top w-[90px] text-[9px]">Document Carry Message<br/><div className="w-4 h-4 border border-black mt-1 mx-auto relative"></div></td>
              <td className="bg-gray align-top w-24 text-[9px]">Follow Up<br/>Call (N-1)<br/><div className="w-4 h-4 border border-black mt-1 mx-auto"></div></td>
              <td className="bg-gray align-top font-bold text-[9px]">Date Of Joining</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- PAGE 2: Salary Proposal --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
         {/* Logo */}
         <div className="flex justify-between items-start mb-4">
             <div className="flex items-center">
                <img src="/nippon-toyota-logo.png" alt="Nippon Toyota Logo" className="w-12 h-12 object-contain mr-2" />
                <div className="font-bold text-xs mt-4">NIPPON MOTORS PVT LTD,KALAMASSERY</div>
             </div>
             <div className="border border-black px-2 py-1 text-[10px] mt-2">N/24/2083</div>
         </div>

         <table className="print-table mb-4">
           <tbody>
             <tr>
                <td colSpan={2} className="bg-gray font-bold text-center py-2 text-[11px] tracking-wide">HUMAN RESOURCES DEPARTMENT</td>
             </tr>
             <tr>
                <td colSpan={2} className="font-bold text-center underline py-1 text-[11px] tracking-wide border-b-2 border-black">SALARY PROPOSAL - NIPPON</td>
             </tr>
             <tr><td className="w-1/2 py-1">Name</td><td className="text-center py-1">{candidate.full_name}</td></tr>
             <tr><td className="py-1">Level</td><td className="text-center py-1">S2</td></tr>
             <tr><td className="py-1">Proposed Date of Joining</td><td className="text-center py-1">07 July 2026</td></tr>
             <tr><td className="py-1">Department</td><td className="text-center py-1">CAC</td></tr>
             <tr><td className="py-1">Designation</td><td className="text-center py-1">Senior Executive</td></tr>
             <tr><td className="py-1">Branch</td><td className="text-center py-1">Kalamassery</td></tr>
             <tr><td className="font-bold italic py-1">Last Salary</td><td className="text-center font-bold py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
             <tr><td className="font-bold italic py-1">Candidate expected salary</td><td className="text-center font-bold py-1">{rd.expectedSalary || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
             <tr><td className="font-bold italic py-1">Total Experience</td><td className="text-center font-bold py-1">{rd.totalExperience || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
             <tr><td className="font-bold italic py-1">Relevant Experience</td><td className="text-center font-bold py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
           </tbody>
         </table>

         <table className="print-table mb-12">
           <tbody>
             <tr className="bg-gray font-bold text-center">
               <td className="w-1/2 text-left py-1">SALARY BREAK UP</td>
               <td colSpan={2} className="py-1">PROPOSAL</td>
             </tr>
             <tr className="bg-gray text-center">
               <td className="text-left py-1">REF No.</td>
               <td colSpan={2} className="py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             <tr><td className="py-1">BASIC+DA</td><td className="text-right w-1/4 py-1"><span className="text-red-500 font-semibold">NA</span></td><td className="text-right w-1/4 py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
             <tr><td className="py-1">HRA</td><td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td><td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
             <tr><td className="py-1">TRAVEL</td><td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td><td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
             <tr><td className="py-1">HOSTEL</td><td className="text-center py-1">-</td><td className="text-center py-1">-</td></tr>
             <tr><td className="py-1">CHILDREN EDUCATION</td><td className="text-center py-1">-</td><td className="text-center py-1">-</td></tr>
             
             <tr className="bg-gray font-bold">
                <td className="py-1">TOTAL SALARY</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr><td className="py-1">CONVEYANCE</td><td className="text-center py-1">-</td><td className="text-center py-1">-</td></tr>
             <tr><td className="py-1">MOBILE</td><td className="text-center py-1">-</td><td className="text-center py-1">-</td></tr>
             <tr><td className="py-1">BRANCH ALLOWANCE</td><td className="text-center py-1">-</td><td className="text-center py-1">-</td></tr>
             <tr className="bg-gray font-bold">
                <td className="py-1">TOTAL ALLOWANCE</td>
                <td className="text-center py-1">-</td>
                <td className="text-center py-1">-</td>
             </tr>
             
             <tr className="bg-gray font-bold">
                <td className="py-1">TOTAL SALARY + ALLOWANCE</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr><td className="py-1">FIXED INCENTIVE</td><td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td><td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
             <tr className="bg-gray font-bold">
                <td className="py-1">TOTAL INCENTIVE</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr><td className="py-1">Incentive Remarks</td><td colSpan={2} className="text-center align-middle h-8"><span className="text-red-500 font-semibold">NA</span></td></tr>
             
             <tr className="bg-gray font-bold border-t-2 border-black border-b-2">
                <td className="py-1">GROSS SALARY</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr><td colSpan={3} className="py-1 text-[10px]">For PF calculation (Basic+Da) limited to 15000/-</td></tr>
             
             <tr className="bg-gray font-bold">
                <td className="py-1">EMPLOYEE EPF</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             <tr className="bg-gray font-bold">
                <td className="py-1">EMPLOYEE ESI CONTRIBUTION</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             <tr className="bg-gray font-bold border-t-2 border-black border-b-2">
                <td className="py-1">TOTAL</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr className="bg-gray font-bold border-t-2 border-black border-b-2">
                <td className="py-1">TAKE HOME AFTER DEDUCTION</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr className="bg-gray font-bold">
                <td className="py-1">EMPLOYER EPF</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             <tr className="bg-gray font-bold">
                <td className="py-1">EMPLOYER ESI CONTRIBUTION</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr className="bg-gray font-bold">
                <td className="py-2">BONUS (Monthly) - Eligibility after completion of 1 year</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr className="bg-gray font-bold">
                <td className="py-1">GRATUITY - As per Statutory norms</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
             
             <tr className="bg-gray font-bold border-t-2 border-black border-b-2">
                <td className="py-1">MONTHLY CTC</td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
                <td className="text-right py-1"><span className="text-red-500 font-semibold">NA</span></td>
             </tr>
           </tbody>
         </table>

         <div className="flex justify-between mt-8 mb-16 text-sm px-2">
             <div className="relative pt-8 w-40 text-center">
                <div className="text-left font-normal text-[11px] mb-8 relative z-10">Prepared By</div>
                <div className="border-b border-black w-32 mb-1"></div>
                <div className="text-left font-normal text-[11px]">HRD</div>
             </div>
             <div className="w-48">
                <div className="text-left font-normal text-[11px] mb-12">Checked By</div>
                <div className="text-left font-normal text-[11px]">Jerry Jacob Mathew</div>
             </div>
         </div>

         <div className="text-center italic font-bold text-[9px] mb-4">DECLARATION BY THE CANDIDATE</div>
         <div className="italic font-bold text-xs mb-20 px-2">I here declare that I'm fully aware of the salary details explained to me</div>
         
         <div className="flex justify-between font-bold text-xs italic pt-2 px-2 border-t-0">
            <div className="w-32 border-t border-black text-center pt-1">Date</div>
            <div className="w-64 border-t border-black text-center pt-1">Name & Signature of the candidate</div>
         </div>
      </div>

      {/* --- PAGE 3: Background Verification --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
         {/* Logo */}
         <div className="flex items-center mb-1 border border-black p-1 pb-0 border-b-0 w-full bg-gray">
             <img src="/nippon-toyota-logo.png" alt="Nippon Toyota Logo" className="w-8 h-8 object-contain mr-2 ml-8 bg-white" />
             <div className="font-bold text-xl tracking-wide ml-4">TOYOTA<br/><span className="text-[10px] font-normal tracking-normal -mt-1 block">NIPPON MOTOR CORPORATION (P) LTD.</span></div>
         </div>

         <table className="print-table mb-0 border-t-0 border-b-0">
            <tbody>
              <tr>
                 <td colSpan={5} className="font-bold text-center underline italic text-sm py-2">Human Resources Department</td>
              </tr>
              <tr>
                 <td colSpan={5} className="font-bold text-center italic text-lg bg-gray py-1">Background Verification</td>
              </tr>
              <tr>
                 <td className="font-bold w-40 text-center py-1">Name of the candidate</td>
                 <td className="text-center py-1">{candidate.full_name}</td>
                 <td className="font-bold text-center w-24 py-1">Mobile No</td>
                 <td className="text-center w-32 py-1">{candidate.phone}</td>
                 <td rowSpan={2} className="text-right w-32 py-1 pr-2 align-top text-[10px]">Date <span className="font-bold pl-2">04-07-2026</span></td>
              </tr>
              <tr>
                 <td className="font-bold text-center py-1">Post Applied</td>
                 <td className="text-center py-1">call center executive</td>
                 <td colSpan={2} className="text-center font-bold py-1">Nippon Branch</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-0 border-t-0 border-b-0">
            <tbody>
              <tr><td colSpan={4} className="bg-gray font-bold text-center py-1">LOCALITY FEEDBACK</td></tr>
              <tr>
                 <td colSpan={2} className="bg-gray w-1/2 py-1">Name of the Panchayath / Muncipality / Corporation</td>
                 <td colSpan={2} className="text-center py-1">Thrikkakara</td>
              </tr>
              <tr>
                 <td className="bg-gray w-1/4 py-1">Name of the Councillor</td>
                 <td className="text-center w-1/4 py-1">Rashid Ullapilly</td>
                 <td className="bg-gray w-1/4 text-center py-1">Name of Panchayath member</td>
                 <td className="text-center w-1/4 py-1"></td>
              </tr>
              <tr>
                 <td className="bg-gray text-center py-1">Contact No :</td>
                 <td className="text-center py-1">9876543210</td>
                 <td className="bg-gray text-center py-1">Contact No :</td>
                 <td className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1">Any issue that has been updated till date (Yes / No )</td>
                 <td colSpan={2} className="text-center py-1">No</td>
              </tr>
              <tr>
                 <td className="bg-gray py-1">If yes specify</td>
                 <td colSpan={3} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1">Any Police Case Reported (Yes / No )</td>
                 <td colSpan={2} className="text-center py-1">No</td>
              </tr>
              <tr>
                 <td className="bg-gray py-1">If yes specify</td>
                 <td colSpan={3} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1">Any kind of family issues (Yes / No )</td>
                 <td colSpan={2} className="text-center py-1">No</td>
              </tr>
              <tr>
                 <td className="bg-gray py-1">If yes specify</td>
                 <td colSpan={3} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td className="bg-gray font-bold italic text-center w-24 h-12">Over all<br/>feedback</td>
                 <td colSpan={3} className="text-center align-middle h-12 text-[11px]">no police cases and no political background</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-0 border-t-0 border-b-0">
            <tbody>
              <tr><td colSpan={5} className="bg-gray font-bold text-center py-1">SOCIAL MEDIA EVALUATION</td></tr>
              <tr>
                 <td className="bg-gray font-bold text-center w-[25%] py-1">Name in Facebook</td>
                 <td className="text-center w-[25%] py-1">{rd.facebookUrl || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td colSpan={2} className="bg-gray font-bold text-center w-[25%] py-1">Name in Instagram</td>
                 <td className="font-bold text-center bg-gray w-[25%] py-1 text-[11px]">Tauraus Connetions</td>
              </tr>
              <tr>
                 <td colSpan={4} className="bg-gray py-1">Any kind of political interference in his personal charge (yes / No )</td>
                 <td className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1 pl-12">If yes - which political side</td>
                 <td colSpan={3} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1 pl-12">What are the kind of shared / liked pages</td>
                 <td colSpan={3} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={3} className="bg-gray py-1 pl-12">In Instagram / facebook who all are the followers</td>
                 <td colSpan={2} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={3} className="bg-gray py-1 pl-12">Past 4 years what all are his following pages</td>
                 <td colSpan={2} className="text-center py-1"></td>
              </tr>
              <tr>
                 <td colSpan={4} className="bg-gray py-1 pl-12">Whether the candidate is active in social media (Yes/No)</td>
                 <td className="text-center py-1"></td>
              </tr>
              <tr>
                 <td className="bg-gray font-bold italic text-center h-10 w-24">Over all<br/>feedback</td>
                 <td colSpan={4} className="text-center align-middle h-10 text-[11px]">Active in social media</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table border-t-0 mb-0 border-b-0">
            <tbody>
              <tr><td colSpan={5} className="font-bold text-center text-white py-1" style={{backgroundColor: '#666'}}>Feedback from previous Employer</td></tr>
              <tr>
                 <td className="bg-gray text-center w-[30%] py-1 text-[11px]">Employer Name</td>
                 <td colSpan={2} className="text-center w-[30%] py-1 text-[11px]">{rd.prev1Name || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="bg-gray text-center w-[20%] py-1 text-[11px]">Designation</td>
                 <td className="text-center w-[20%] py-1 text-[11px]">{rd.prev1Position || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
              <tr>
                 <td className="bg-gray text-center py-2 text-[11px]">Period of Employment</td>
                 <td className="font-bold text-center w-12 py-2">From</td>
                 <td className="text-center py-2 text-[11px]">{rd.prev1From || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="font-bold text-center w-12 py-2">To</td>
                 <td className="text-center py-2 text-[11px]">{rd.prev1To || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table border-t-0 mb-0 border-b-0">
            <tbody>
              <tr>
                 <td className="bg-gray w-[40%] py-1 text-[11px]">Name of Contacted Person For<br/>Verification</td>
                 <td className="text-center w-[25%] py-1 text-[11px]">Drishya</td>
                 <td className="bg-gray w-[25%] py-1 text-[11px]">Designation of contacted<br/>person</td>
                 <td className="text-center w-[10%] py-1 text-[11px]">HR</td>
              </tr>
              <tr>
                 <td className="bg-gray py-1 text-[11px]">Contacted person Mob No :</td>
                 <td colSpan={3} className="text-center py-1 text-[11px]">9633431909</td>
              </tr>
              <tr>
                 <td className="bg-gray py-1 text-[11px]">Employee - Employer Rapport</td>
                 <td colSpan={3} className="text-center py-1 text-[11px]">Very Good</td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1 text-[11px]">Any Financial Loans & Advances taken by the candidate (Yes / No)</td>
                 <td colSpan={2} className="text-center py-1 text-[11px]"></td>
              </tr>
              <tr>
                 <td className="bg-gray py-1 pl-8 text-[11px]">If yes specify</td>
                 <td colSpan={3} className="text-center py-1 text-[11px]"></td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray py-1 text-[11px]">If Any long leaves Taken (Yes / No)</td>
                 <td colSpan={2} className="text-center py-1 text-[11px]"></td>
              </tr>
              <tr>
                 <td className="bg-gray font-bold italic text-center w-24 h-12 text-[11px]">Over all<br/>feedback</td>
                 <td colSpan={3} className="text-center align-middle h-12 text-[11px]">Good employee and also good customer supports</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table border-t-0 mt-4">
            <tbody>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="py-1">Prepared By</td>
                 <td className="py-1">Checked By</td>
                 <td className="py-1">Checked By</td>
              </tr>
              <tr className="font-bold text-center h-8 align-bottom text-[11px]">
                 <td className="pb-1">Bijo M Joseph</td>
                 <td className="pb-1">Sreehari S</td>
                 <td className="pb-1">Naveen C</td>
              </tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="py-1">HRD</td>
                 <td className="py-1">HRD</td>
                 <td className="py-1">HRM</td>
              </tr>
            </tbody>
         </table>

      </div>

      {/* --- PAGE 4: Information Required from Applicants --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
         <div className="flex border border-black p-2 mb-1">
             <div className="w-[20%] flex flex-col items-center justify-center border-r border-black pr-2 relative py-1">
                 <img src="/nippon-toyota-logo.png" alt="Nippon Toyota" className="w-24 object-contain" />
             </div>
             <div className="w-[60%] flex flex-col items-center justify-center px-2 text-center border-r border-black">
                 <div className="font-bold text-base mb-1 tracking-wide">NIPPON MOTOR CORPORATION PVT LTD</div>
                 <div className="font-bold text-[9px] font-serif leading-tight">XIX/9C,NIPPON TOWERS,NH-47,HMT JUNCTION<br/>KALAMASSERY P O,KOCHI-683104<br/>PH:0484-2860331/8606986060<br/>E-Mail ID:recruitment@nippontoyota.com</div>
             </div>
             <div className="w-[20%] relative">
                 <div className="absolute bottom-1 right-1 text-[9px]">Photo</div>
             </div>
         </div>

         <div className="text-center font-bold bg-gray border border-black py-1 mb-1 text-[11px]">Information Required from Applicants</div>

         <table className="print-table mb-1 border-t border-black">
            <tbody>
              <tr>
                 <td className="w-1/4 font-bold py-1">Mobile Number</td>
                 <td className="w-1/4 text-center py-1">{candidate.phone}</td>
                 <td className="w-1/4 font-bold bg-gray py-1">Date</td>
                 <td className="w-1/4 text-center py-1">{today}</td>
              </tr>
              <tr>
                 <td className="font-bold py-1">Postion Applied For</td>
                 <td className="text-center py-1">{candidate.position_applied_for}</td>
                 <td colSpan={2} className="font-bold bg-gray py-1 text-center">Position Suitable</td>
              </tr>
            </tbody>
         </table>

         <div className="font-bold underline mb-1 text-xs">1. Personal Data</div>
         <table className="print-table mb-1 border-b-0">
            <tbody>
              <tr>
                 <td className="w-[15%] font-bold bg-gray text-center py-1">Name</td>
                 <td className="w-[35%] text-center py-1">{candidate.full_name}</td>
                 <td className="w-[50%] border-0 bg-white" colSpan={2}></td>
              </tr>
            </tbody>
         </table>

         <div className="flex w-full mb-1">
             <table className="print-table w-1/2 border-r-0 border-t-0">
                <tbody>
                  <tr><td colSpan={2} className="font-bold underline border-0 bg-white text-center pb-1">Permanent Address</td></tr>
                  <tr><td className="w-[35%] bg-gray py-1">House<br/>Name</td><td className="text-center py-1">{rd.permHouseName || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">Post Office</td><td className="text-center py-1">{rd.permPostOffice || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">Landmark</td><td className="text-center py-1">{rd.permLandmark || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">District</td><td className="text-center py-1">{rd.permDistrict || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">Pincode</td><td className="text-center py-1">{rd.permPinCode || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                </tbody>
             </table>
             <table className="print-table w-1/2 border-l border-t-0">
                <tbody>
                  <tr><td colSpan={2} className="font-bold underline border-0 bg-white text-center pb-1">Present Address</td></tr>
                  <tr><td className="w-[35%] bg-gray py-1">House Name</td><td className="text-center py-1">{rd.presHouseName || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">Post<br/>Office</td><td className="text-center py-1">{rd.presPostOffice || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">Landmark</td><td className="text-center py-1">{rd.presLandmark || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">District</td><td className="text-center py-1">{rd.presDistrict || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                  <tr><td className="bg-gray py-1">Pincode</td><td className="text-center py-1">{rd.presPinCode || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                </tbody>
             </table>
         </div>

         <table className="print-table mb-1 border-t-0">
            <tbody>
              <tr className="bg-gray font-bold text-center">
                 <td className="py-1 w-10">Age</td>
                 <td className="bg-white py-1 w-12">{rd.age || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-10">DOB</td>
                 <td className="bg-white py-1 w-20">{rd.dateOfBirth || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-12">Height</td>
                 <td className="bg-white py-1 w-12">{rd.height || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-12">Weight</td>
                 <td className="bg-white py-1 w-12">{rd.weight || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-12">Blood<br/>Group</td>
                 <td className="bg-white py-1 w-16">{rd.bloodGroup || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-12">Gender</td>
                 <td className="bg-white py-1">{rd.gender || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
              <tr>
                 <td colSpan={2} className="bg-gray font-bold text-center py-1">Marital Status</td>
                 <td colSpan={4} className="text-center py-1">{rd.maritalStatus || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td colSpan={3} className="bg-gray font-bold text-center py-1">Religion & Caste</td>
                 <td colSpan={3} className="text-center py-1">{rd.religionCaste || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-1 border-t-0">
            <tbody>
              <tr className="bg-gray font-bold text-center">
                 <td className="w-1/4 py-1">Languages Known<br/>[Read]</td>
                 <td className="w-1/4 py-1">Languages Known<br/>[Write]</td>
                 <td className="w-1/4 py-1">Languages Known<br/>[speak]</td>
                 <td className="w-1/4 py-1">Other languages<br/>known</td>
              </tr>
              <tr className="text-center h-10 align-middle">
                 <td>{rd.languagesRead || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.languagesWrite || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.languagesSpeak || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.languagesOther || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-1 border-t-0">
            <tbody>
              <tr className="bg-gray font-bold text-center">
                 <td className="w-1/4 py-1">Aadhar Card Number</td>
                 <td className="w-1/4 py-1">Driving License Number</td>
                 <td className="w-1/4 py-1">Pancard Number</td>
                 <td className="w-1/4 py-1">Passport Number</td>
              </tr>
              <tr className="text-center h-8">
                 <td className="py-1">{rd.aadhaarNumber || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">{rd.drivingLicenseNumber || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">{rd.panNumber || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">{rd.passportNumber || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-1 border-t-0">
            <tbody>
              <tr>
                 <td className="bg-gray font-bold text-center w-[30%] py-1">Confident To Drive</td>
                 <td className="text-center w-[35%] py-1">
                     <span className="font-bold">Yes</span><br/>
                     <span className="font-normal block mt-1">{rd.drive2Wheeler ? '2 Wheeler' : ''} {rd.drive4Wheeler ? ', 4 Wheeler' : ''}</span>
                 </td>
                 <td className="text-center w-[35%] py-1">
                     <span className="font-bold">No</span><br/>
                     <span className="font-normal block mt-1"></span>
                 </td>
              </tr>
            </tbody>
         </table>

         <div className="font-bold text-center text-sm mb-0 bg-gray py-1 border border-black border-b-0">Educational Qualification</div>
         <table className="print-table mb-1 border-t-0">
            <tbody>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="py-1 w-20">10th<br/>(School<br/>Name)</td>
                 <td className="bg-white py-1">{rd.class10School || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-12">Course</td>
                 <td className="bg-white py-1 w-16">{rd.class10Board || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-16">Marks<br/>obtained</td>
                 <td className="bg-white py-1 w-10">{rd.class10Marks || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-16">Passing<br/>out year</td>
                 <td className="bg-white py-1 w-12">{rd.class10Year || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1 w-16">Mode of<br/>Study</td>
                 <td className="bg-white py-1 w-16">{rd.class10Mode || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="py-1">12th<br/>(School<br/>Name)</td>
                 <td className="bg-white py-1">{rd.class12School || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Course</td>
                 <td className="bg-white py-1">{rd.class12Stream || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Marks<br/>obtained</td>
                 <td className="bg-white py-1">{rd.class12Marks || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Passing<br/>out year</td>
                 <td className="bg-white py-1">{rd.class12Year || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Mode of<br/>Study</td>
                 <td className="bg-white py-1">{rd.class12Mode || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="py-1">Graduation/<br/>Diploma<br/>Course</td>
                 <td className="bg-white py-1">Graduation / Degree</td>
                 <td className="py-1">College</td>
                 <td className="bg-white py-1">{rd.gradCollege || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Marks<br/>obtained</td>
                 <td className="bg-white py-1">{rd.gradMarks || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Passing<br/>out year</td>
                 <td className="bg-white py-1">{rd.gradYear || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Mode of<br/>Study</td>
                 <td className="bg-white py-1">{rd.gradMode || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="py-1">Graduation/<br/>Diploma<br/>Course</td>
                 <td className="bg-white py-1">{rd.postGradCourse || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">College</td>
                 <td className="bg-white py-1">{rd.postGradCollege || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Marks<br/>obtained</td>
                 <td className="bg-white py-1">{rd.postGradMarks || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Passing<br/>out year</td>
                 <td className="bg-white py-1">{rd.postGradYear || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td className="py-1">Mode of<br/>Study</td>
                 <td className="bg-white py-1">{rd.postGradMode || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-1 border-t-0">
            <tbody>
              <tr>
                 <td className="font-bold bg-gray w-1/3 text-center py-1">Computer Knowledge</td>
                 <td className="text-center w-2/3 py-1">{rd.compWord ? 'Word' : ''}{rd.compExcel ? ', Excel' : ''}</td>
              </tr>
              <tr>
                 <td className="font-bold bg-gray text-center py-2">Other Software Certifications if any, please<br/>specify</td>
                 <td className="text-center h-12 align-middle">{rd.softwareCerts || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>
      </div>

      {/* --- PAGE 5: Information Required from Applicants (Part 2) --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
         
         <div className="font-bold text-center text-lg mb-0 bg-gray py-1 border border-black border-b-0">Family Details</div>
         <table className="print-table mb-2">
            <tbody>
              <tr className="bg-gray font-bold text-center">
                 <td className="w-20 py-1">Relation</td>
                 <td className="w-32 py-1">Name</td>
                 <td className="w-12 py-1">Age</td>
                 <td className="py-1">Occupation</td>
                 <td className="w-48 py-1">Company Name / School Name</td>
                 <td className="py-1">Mobile No</td>
              </tr>
              {[
                {rel: 'Father', name: rd.fatherName || '', age: rd.fatherAge || '', occ: rd.fatherOccupation || '', comp: rd.fatherCompany, mob: rd.fatherPhone || ''},
                {rel: 'Mother', name: rd.motherName || '', age: rd.motherAge || '', occ: rd.motherOccupation || '', comp: rd.motherCompany, mob: rd.motherPhone || ''},
                {rel: 'Spouse', name: rd.spouseName, age: rd.spouseAge, occ: rd.spouseOccupation, comp: rd.spouseCompany, mob: rd.spousePhone},
                {rel: 'Son /\nDaughter', name: rd.child1Name, age: rd.child1Age, occ: rd.child1Occupation, comp: rd.child1Company, mob: rd.child1Phone},
                {rel: 'Son /\nDaughter', name: rd.child2Name, age: rd.child2Age, occ: rd.child2Occupation, comp: rd.child2Company, mob: rd.child2Phone},
                {rel: 'Son /\nDaughter', name: rd.child3Name, age: rd.child3Age, occ: rd.child3Occupation, comp: rd.child3Company, mob: rd.child3Phone},
                {rel: 'Brother /\nSister', name: rd.sibling1Name, age: rd.sibling1Age, occ: rd.sibling1Occupation, comp: rd.sibling1Company, mob: rd.sibling1Phone},
                {rel: 'Brother /\nSister', name: rd.sibling2Name, age: rd.sibling2Age, occ: rd.sibling2Occupation, comp: rd.sibling2Company, mob: rd.sibling2Phone},
                {rel: 'Brother /\nSister', name: rd.sibling3Name, age: rd.sibling3Age, occ: rd.sibling3Occupation, comp: rd.sibling3Company, mob: rd.sibling3Phone},
              ].map((row, i) => (
                <tr key={i}>
                   <td className="font-bold text-center py-1 align-middle whitespace-pre-wrap leading-tight text-[10px]">{row.rel}</td>
                   <td className="text-center py-1">{row.name || <span className="text-red-500 font-semibold">NA</span>}</td>
                   <td className="text-center py-1">{row.age || <span className="text-red-500 font-semibold">NA</span>}</td>
                   <td className="text-center py-1">{row.occ || <span className="text-red-500 font-semibold">NA</span>}</td>
                   <td className="text-center py-1">{row.comp || <span className="text-red-500 font-semibold">NA</span>}</td>
                   <td className="text-center py-1">{row.mob || <span className="text-red-500 font-semibold">NA</span>}</td>
                </tr>
              ))}
            </tbody>
         </table>

         <div className="font-bold underline text-xs mb-1 mt-4">2. Additional Information</div>
         <table className="print-table mb-4">
            <tbody>
              <tr className="bg-gray font-bold text-center">
                 <td className="w-1/2 py-1">Achievements</td>
                 <td className="w-1/2 py-1">Hobbies</td>
              </tr>
              <tr className="text-center h-12 align-middle">
                 <td>{rd.achievements || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.hobbies || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <div className="font-bold underline text-xs mb-1">3. General Informations</div>
         <table className="print-table mb-4">
            <tbody>
              <tr><td className="w-[85%] bg-gray py-1">a. Have you ever been terminated or asked to resign from any position?</td><td className="text-center w-[15%] py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
              <tr><td className="bg-gray py-1">b. Have you ever had a nervous disorder?</td><td className="text-center py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
              <tr><td className="bg-gray py-1">c. Have you any physical disabilities?</td><td className="text-center py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
              <tr><td className="bg-gray py-1">d. Have you any Eye vision /Colour blindness / Night blindness?</td><td className="text-center py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
              <tr><td className="bg-gray py-1">e. Have you ever been convicted of a crime other than a minor traffic or other minor offence?</td><td className="text-center py-1">{rd.criminalConviction ? 'Yes' : ''}</td></tr>
            </tbody>
         </table>

         <div className="font-bold underline text-xs mb-1">4. Emergency Contact Details</div>
         <table className="print-table mb-4">
            <tbody>
              <tr className="bg-gray font-bold text-center">
                 <td className="w-12 py-1">Sl No</td>
                 <td className="w-32 py-1">Relation</td>
                 <td className="w-48 py-1">Name</td>
                 <td className="w-48 py-1">Address</td>
                 <td className="w-32 py-1">Contact Details</td>
              </tr>
              <tr className="text-center h-12 align-middle">
                 <td>1</td>
                 <td>{rd.emergency1Relation || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.emergency1Name || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.emergency1Address || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.emergency1Contact || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
              <tr className="text-center h-12 align-middle">
                 <td>2</td>
                 <td>{rd.emergency2Relation || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.emergency2Name || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.emergency2Address || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.emergency2Contact || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <div className="font-bold underline text-xs mb-1">5. Social Media Details</div>
         <table className="print-table mb-4">
            <tbody>
              <tr className="bg-gray font-bold text-center h-8 align-middle">
                 <td className="w-1/3 py-1">Name in Facebook</td>
                 <td className="w-1/3 py-1">Name in Instagram</td>
                 <td className="w-1/3 py-1">Name in Twitter</td>
              </tr>
              <tr className="text-center h-10 align-middle">
                 <td>{rd.facebookUrl || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.instagramUrl || <span className="text-red-500 font-semibold">NA</span>}</td>
                 <td>{rd.twitterUrl || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <div className="font-bold text-xs mt-8">6. E-Mail ID</div>
         <div className="text-xs">{candidate.email || 'Mrithulb37@gmail.com'}</div>

      </div>

      {/* --- PAGE 6: Employment Record (Part 2) & Declaration --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
         <div className="font-bold text-center text-lg bg-gray py-1 border border-black border-b-0">Employment Record</div>
         <table className="print-table mb-2">
            <tbody>
              <tr>
                 <td className="bg-gray font-bold text-center w-1/2 py-1">Do you have any experience before</td>
                 <td className="text-center w-1/2 py-1">{rd.previousExperience ? 'Yes' : ''}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-2 border-t-0">
            <tbody>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="w-[20%] py-1">Name and address of<br/>previous company</td>
                 <td className="w-[15%] py-1">Position Held</td>
                 <td className="w-[25%] py-1">Reporting person Name, Designation of<br/>the reporting person, Contact Number</td>
                 <td className="w-[12%] py-1">Period<br/>Employed</td>
                 <td className="w-[13%] py-1">Last Drawn Salary<br/>(Salary & Allowance<br/>Portion Separately)</td>
                 <td className="w-[15%] py-1">Reason For Leaving</td>
              </tr>
              {[
                {name: rd.prev1Name || '', pos: rd.prev1Position || '', rep: rd.prev1Reporting || '', from: rd.prev1From || '', to: rd.prev1To || '', sal: rd.prev1Salary || '', rea: rd.prev1Reason || ''},
                {name: rd.prev2Name || '', pos: rd.prev2Position || '', rep: rd.prev2Reporting || '', from: rd.prev2From || '', to: rd.prev2To || '', sal: rd.prev2Salary || '', rea: rd.prev2Reason || ''},
                {name: rd.prev3Name || '', pos: rd.prev3Position || '', rep: rd.prev3Reporting || '', from: rd.prev3From || '', to: rd.prev3To || '', sal: rd.prev3Salary || '', rea: rd.prev3Reason || ''},
                {name: rd.prev4Name || '', pos: rd.prev4Position || '', rep: rd.prev4Reporting || '', from: rd.prev4From || '', to: rd.prev4To || '', sal: rd.prev4Salary || '', rea: rd.prev4Reason || ''}
              ].map((row, i) => (
                <tr key={i} className="text-center h-16 align-middle text-[9px]">
                   <td className="whitespace-pre-line">{row.name}</td>
                   <td className="whitespace-pre-line">{row.pos}</td>
                   <td className="whitespace-pre-line text-[10px]">{row.rep}</td>
                   <td className="p-0 align-top" style={{ padding: 0 }}>
                      <div className="flex flex-col h-full w-full">
                         <div className="border-b border-black font-bold h-6 flex items-center justify-center bg-gray">From</div>
                         <div className="border-b border-black h-6 flex items-center justify-center">{row.from}</div>
                         <div className="border-b border-black font-bold h-6 flex items-center justify-center bg-gray">To</div>
                         <div className="h-6 flex items-center justify-center">{row.to}</div>
                      </div>
                   </td>
                   <td className="whitespace-pre-line">{row.sal}</td>
                   <td className="whitespace-pre-line">{row.rea}</td>
                </tr>
              ))}
            </tbody>
         </table>

         <div className="flex justify-center space-x-12 mb-4">
             <table className="print-table w-48">
                <tbody>
                  <tr><td className="bg-gray font-bold text-center py-1">Total Experience in Years</td></tr>
                  <tr><td className="text-center py-2">{rd.totalExperience || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                </tbody>
             </table>
             <table className="print-table w-48 relative">
                <tbody>
                  <tr><td className="bg-gray font-bold text-center py-1">Expected Salary</td></tr>
                  <tr><td className="text-center py-2">{rd.expectedSalary || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
                </tbody>
             </table>
         </div>

         <table className="print-table mb-2">
            <tbody>
              <tr>
                 <td className="bg-gray font-bold w-1/3 py-2">How did you learn about the opening?</td>
                 <td className="text-center w-2/3 py-2">{rd.sourceOfOpening || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <table className="print-table mb-2">
            <tbody>
              <tr>
                 <td className="bg-gray font-bold w-1/2 py-2">Referred by or Friend/Relative who is working at Nippon Toyota</td>
                 <td className="text-center w-1/2 py-2">{rd.referredBy || <span className="text-red-500 font-semibold">NA</span>}</td>
              </tr>
            </tbody>
         </table>

         <div className="flex space-x-4 mb-4">
            <table className="print-table w-1/2">
               <tbody>
                 <tr><td className="bg-gray font-bold text-center py-2">Ready to work in below mentioned branches:</td></tr>
                 <tr><td className="text-center py-3">{rd.preferredRegion || <span className="text-red-500 font-semibold">NA</span>}</td></tr>
               </tbody>
            </table>
            <table className="print-table w-1/2">
               <tbody>
                 <tr><td className="bg-gray font-bold text-center py-2">If selected, when can you join?</td></tr>
                 <tr><td className="text-center py-3">{rd.expectedJoiningDate ? formatDate(rd.expectedJoiningDate) : <span className="text-red-500 font-semibold">NA</span>}</td></tr>
               </tbody>
            </table>
         </div>

         <div className="font-bold text-center text-lg mt-8 mb-4">Declaration</div>
         <div className="text-center text-[10px] mb-8 leading-relaxed">
            I here declare that the particulars given above are, to the best of my knowledge and belief, correct and true, I understand that if appointed, any incorrect<br/>information given in this application if sufficient cause of termination of my services.
         </div>

         <div className="flex space-x-12">
            <table className="print-table w-1/3">
               <tbody>
                 <tr><td className="font-bold bg-gray w-16 py-1">Place</td><td className="text-center py-1"><span className="text-red-500 font-semibold">NA</span></td></tr>
                 <tr><td className="font-bold bg-gray w-16 py-1">Date</td><td className="text-center py-1">{formatDate(candidate.applied_at)}</td></tr>
               </tbody>
            </table>
            <table className="print-table w-2/3">
               <tbody>
                 <tr>
                    <td className="font-bold bg-gray text-center w-1/2 py-4">Signature of the applicant</td>
                    <td className="w-1/2"></td>
                 </tr>
               </tbody>
            </table>
         </div>
      </div>

      {/* --- PAGE 7: Regional HR Comments --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break flex flex-col justify-between">
         <div className="flex-1 w-full"></div>

         <table className="print-table mb-0 border-b-[3px] border-black border-r-[3px]">
            <tbody>
              <tr><td colSpan={6} className="bg-gray font-bold text-center py-2 text-sm tracking-wide">REGIONAL HR COMMENTS</td></tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td rowSpan={2} className="w-24">Name of the<br/>Panel<br/>Member</td>
                 <td rowSpan={2} className="w-[300px]">Comments / Suggestion</td>
                 <td colSpan={3}>Marks</td>
                 <td rowSpan={2} className="w-24">Signature<br/>&<br/>Date</td>
              </tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="w-24">Category</td>
                 <td className="w-16">Maximum</td>
                 <td className="w-16">Gained</td>
              </tr>
              <tr className="h-10 text-center">
                 <td rowSpan={4} className="font-bold text-xs whitespace-pre-line px-1">{hrEval?.scores?.interviewer_name || candidate?.interviewer_assignments?.BRANCH_HR || ''}</td>
                 <td rowSpan={4} className="align-bottom pb-2 border-r relative px-2">
                    <div className="absolute top-2 left-2 right-2 text-left text-[9px] font-medium whitespace-pre-wrap">{hrEval?.remarks}</div>
                    <div className="absolute bottom-2 left-0 w-full flex justify-center space-x-6 text-[10px]">
                       <span className="flex items-center">Selected <div className="w-4 h-4 border border-black ml-2 relative">{hrEval?.verdict === 'SELECTED' && <span className="absolute inset-0 flex items-center justify-center font-bold text-lg leading-none mb-1">✓</span>}</div></span>
                       <span className="flex items-center">Hold <div className="w-4 h-4 border border-black ml-2 relative">{hrEval?.verdict === 'ON_HOLD' && <span className="absolute inset-0 flex items-center justify-center font-bold text-lg leading-none mb-1">✓</span>}</div></span>
                       <span className="flex items-center">Rejected <div className="w-4 h-4 border border-black ml-2 relative">{hrEval?.verdict === 'REJECTED' && <span className="absolute inset-0 flex items-center justify-center font-bold text-lg leading-none mb-1">✓</span>}</div></span>
                    </div>
                 </td>
                 <td>Attitude</td>
                 <td className="bg-gray">4</td>
                 <td className="font-bold text-sm">{hrEval?.scores?.attitude}</td>
                 <td rowSpan={4} className="align-bottom pb-2 text-[9px] font-bold">{hrEval?.created_at ? formatDate(hrEval.created_at) : ''}</td>
              </tr>
              <tr className="h-10 text-center">
                 <td>Communication</td>
                 <td className="bg-gray">3</td>
                 <td className="font-bold text-sm">{hrEval?.scores?.communication}</td>
              </tr>
              <tr className="h-10 text-center">
                 <td>Knowledge</td>
                 <td className="bg-gray">3</td>
                 <td className="font-bold text-sm">{hrEval?.scores?.knowledge}</td>
              </tr>
              <tr className="h-10 text-center">
                 <td className="bg-gray font-bold">Total</td>
                 <td className="bg-gray font-bold">10</td>
                 <td className="bg-gray font-bold text-sm">{hrEval?.scores?.total_score}</td>
              </tr>
            </tbody>
         </table>
      </div>

      {/* --- PAGE 8: Interview Panel Suggestion --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break">
         <table className="print-table mb-0 border-b-2 border-black border-r-2">
            <tbody>
              <tr><td colSpan={6} className="bg-gray font-bold text-center py-2 text-sm tracking-wide">INTERVIEW PANEL SUGGESTION</td></tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td rowSpan={2} className="w-[12%]">Name of the<br/>Panel<br/>Member</td>
                 <td rowSpan={2} className="w-[48%]">Comments / Suggestion</td>
                 <td colSpan={3}>Marks</td>
                 <td rowSpan={2} className="w-[10%]">Signature<br/>&<br/>Date</td>
              </tr>
              <tr className="bg-gray font-bold text-center text-[10px]">
                 <td className="w-[15%]">Category</td>
                 <td className="w-[7%]">Maximum</td>
                 <td className="w-[8%]">Gained</td>
              </tr>
              
              {[...Array(5)].map((_, i) => {
                 const dev = deptEvals[i];
                 return (
                 <React.Fragment key={i}>
                  <tr className="h-8 text-center text-[10px]">
                     <td rowSpan={4} className="font-bold text-xs whitespace-pre-line px-1">{dev?.scores?.interviewer_name || candidate?.interviewer_assignments?.DEPT_HEAD || ''}</td>
                     <td rowSpan={4} className="border-r relative px-2">
                        <div className="absolute top-2 left-2 right-2 text-left text-[9px] font-medium whitespace-pre-wrap">{dev?.remarks}</div>
                        <div className="absolute bottom-2 left-0 w-full flex justify-center space-x-6 text-[10px]">
                           <span className="flex items-center">Selected <div className="w-4 h-4 border border-black ml-2 relative">{dev?.verdict === 'SELECTED' && <span className="absolute inset-0 flex items-center justify-center font-bold text-lg leading-none mb-1">✓</span>}</div></span>
                           <span className="flex items-center">Hold <div className="w-4 h-4 border border-black ml-2 relative">{dev?.verdict === 'ON_HOLD' && <span className="absolute inset-0 flex items-center justify-center font-bold text-lg leading-none mb-1">✓</span>}</div></span>
                           <span className="flex items-center">Rejected <div className="w-4 h-4 border border-black ml-2 relative">{dev?.verdict === 'REJECTED' && <span className="absolute inset-0 flex items-center justify-center font-bold text-lg leading-none mb-1">✓</span>}</div></span>
                        </div>
                     </td>
                     <td>Attitude</td>
                     <td className="bg-gray">4</td>
                     <td className="font-bold text-sm">{dev?.scores?.attitude}</td>
                     <td rowSpan={4} className="align-bottom pb-2 text-[9px] font-bold">{dev?.created_at ? formatDate(dev.created_at) : ''}</td>
                  </tr>
                  <tr className="h-8 text-center text-[10px]">
                     <td>Communication</td>
                     <td className="bg-gray">3</td>
                     <td className="font-bold text-sm">{dev?.scores?.communication}</td>
                  </tr>
                  <tr className="h-8 text-center text-[10px]">
                     <td>Knowledge</td>
                     <td className="bg-gray">3</td>
                     <td className="font-bold text-sm">{dev?.scores?.knowledge}</td>
                  </tr>
                  <tr className="h-8 text-center text-[10px]">
                     <td className="bg-gray font-bold">Total</td>
                     <td className="bg-gray font-bold">10</td>
                     <td className="bg-gray font-bold text-sm">{dev?.scores?.total_score}</td>
                  </tr>
                 </React.Fragment>
                 );
              })}

              <tr className="bg-gray font-bold text-center text-xs">
                 <td colSpan={5} className="py-2">CMD Comment</td>
                 <td>Signature</td>
              </tr>
              <tr className="h-20 text-center align-bottom pb-4">
                 <td colSpan={5}>
                    <div className="flex justify-center space-x-12 mb-2">
                       <span className="flex items-center">Selected <div className="w-5 h-5 border border-black ml-2"></div></span>
                       <span className="flex items-center">Hold <div className="w-5 h-5 border border-black ml-2"></div></span>
                       <span className="flex items-center">Rejected <div className="w-5 h-5 border border-black ml-2"></div></span>
                    </div>
                 </td>
                 <td></td>
              </tr>
            </tbody>
         </table>
      </div>

      {/* --- PAGE 9: Resume / Biodata Placeholder --- */}
      <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[5mm] shadow-sm border border-gray-100 box-border relative page-break flex flex-col items-center justify-center">
         <div className="border-4 border-dashed border-gray-300 w-full h-full rounded-2xl flex flex-col items-center justify-center text-gray-400 p-12 text-center space-y-4">
             <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                 </svg>
             </div>
             <h2 className="text-3xl font-bold tracking-tight text-gray-500 uppercase">Resume / Biodata</h2>
             <p className="text-lg">Please attach or staple the candidate's physical resume behind this page.</p>
         </div>
      </div>

      {/* --- PAGE 10+: Technical Test Question Paper --- */}
      {questions.length > 0 && (
         <div className="print-container mx-auto w-[210mm] min-h-[297mm] bg-white mb-4 p-[10mm] shadow-sm border border-gray-100 box-border relative page-break flex flex-col font-sans text-black text-[16px] leading-normal">
            <div className="flex justify-between items-start mb-1 relative font-sans">
              <div className="pt-0">
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-0 text-black">TOYOTA</h1>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 leading-tight">Motor Corporation</h2>
                <p className="text-[9px] mt-1 italic text-gray-600">*candidates with one year experience and above</p>
              </div>
              <div className="border-[2px] border-black w-[220px]">
                <div className="border-b-[2px] border-black text-center font-bold py-0 bg-gray-100 text-xs">Series B</div>
                <div className="border-b-[2px] border-black text-center font-bold py-0 text-[10px]">Version 2020.1</div>
                <div className="px-2 py-0 border-b border-black text-[10px] flex gap-1">
                  <span className="font-semibold">Date:</span>
                  <span className="flex-1 border-b border-gray-400 mt-2"></span>
                </div>
                <div className="px-2 py-0 text-[10px] flex gap-1">
                  <span className="font-semibold">Time:</span>
                  <span className="flex-1 border-b border-gray-400 mt-2"></span>
                </div>
              </div>
            </div>

            <div className="border-b-[2px] border-black pb-0.5 mb-1 text-center font-sans">
              <h2 className="text-[12px] font-bold uppercase text-black">Human Resources Department</h2>
            </div>

            <div className="border-b-[2px] border-black pb-0.5 mb-1 font-sans">
              <div className="flex text-[11px] mb-0.5 px-1">
                <span className="font-semibold mr-2 whitespace-nowrap text-black">Name of the Candidate:</span>
                <span className="flex-1 font-medium font-sans uppercase border-b border-gray-400 leading-tight flex items-end text-black">{candidate.full_name}</span>
              </div>
              <div className="flex text-[11px] px-1">
                <span className="font-semibold mr-2 whitespace-nowrap text-black">Position Applied For:</span>
                <span className="flex-1 font-medium font-sans uppercase border-b border-gray-400 leading-tight flex items-end text-black">{candidate.position_applied_for}</span>
              </div>
            </div>

            <div className="border-b-[2px] border-black pb-0.5 mb-1 text-center font-sans">
              <h3 className="text-[12px] font-bold text-black">Question Paper - {candidate.position_applied_for}</h3>
            </div>

            <table className="w-full border-collapse border-[2px] border-black text-[13px] leading-snug ">
              <thead>
                <tr className="border-b-[2px] border-black">
                  <th className="border-r-[2px] border-black w-10"></th>
                  <th className="border-r-[2px] border-black text-left p-1"></th>
                  <th className="border-r-[2px] border-black w-16 text-center font-bold text-[11px] leading-tight p-1 bg-gray-50">Max.<br />Marks</th>
                  <th className="w-20 text-center font-bold text-[11px] leading-tight p-1 bg-gray-50">Marks<br />Obtained</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={q.id} className="border-b-[2px] border-black">
                    <td className="border-r-[2px] border-black text-center align-top pt-1 font-medium">{idx + 1}</td>
                    <td className="border-r-[2px] border-black p-1 align-top">
                      <div className="font-bold mb-1">{q.text}</div>
                      {Object.keys(q.options || {}).length > 0 ? (
                        <div className="pl-1 text-xs">
                          {Object.entries(q.options).map(([k, v]: [string, any]) => (
                            <div key={k} className="flex gap-1.5 items-start mb-0.5">
                              <span className="font-medium">{k.toUpperCase()}.</span>
                              <span>{v}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-6"></div>
                      )}
                    </td>
                    <td className="border-r-[2px] border-black text-center align-middle font-bold text-[14px]">1</td>
                    <td className="text-center align-middle"></td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      )}

    </div>
    </div>
  );
}