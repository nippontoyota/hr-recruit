import React from 'react';
import type { Candidate } from '../../types';

interface BackgroundVerificationDocumentProps {
  candidate: Candidate;
}

export function BackgroundVerificationDocument({ candidate }: BackgroundVerificationDocumentProps) {
  const bgData = candidate.profile?.raw_data?.bg_verification || {
    locality: {},
    social: {},
    employer: {}
  };
  const locality = bgData.locality;
  const social = bgData.social;
  const employer = bgData.employer;

  // Format Date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[10mm] text-black font-sans text-xs box-border scale-[0.8] md:scale-100 origin-top mt-8">
      {/* HEADER SECTION */}
      <div className="border border-black mb-2">
        <div className="flex items-center p-2 border-b border-black">
           <div className="w-24 flex items-center justify-center font-bold text-lg border-2 border-black rounded-full italic shrink-0 px-2 py-1 mr-4">
            TOYOTA
           </div>
           <div className="flex-1 font-bold tracking-wider">
             NIPPON MOTOR CORPORATION (P) LTD.
           </div>
        </div>
        <div className="text-center italic font-semibold border-b border-black py-1">
          Human Resources Department
        </div>
        <div className="text-center font-bold italic text-sm py-1 bg-gray-100">
          Background Verification
        </div>
      </div>
      
      {/* TOP META DATA */}
      <table className="w-full border-collapse border border-black mb-0 table-fixed text-[10px]">
        <tbody>
          <tr className="border border-black">
            <td className="border border-black p-1 font-semibold w-[20%]">Name of the candidate</td>
            <td className="border border-black p-1 w-[20%]">{candidate.full_name}</td>
            <td className="border border-black p-1 font-semibold w-[15%] text-center">Mobile No</td>
            <td className="border border-black p-1 w-[25%] text-center">{candidate.phone}</td>
            <td className="border border-black p-1 w-[20%]"></td>
          </tr>
          <tr className="border border-black">
            <td className="border border-black p-1 font-semibold">Post Applied</td>
            <td className="border border-black p-1">{candidate.position_applied_for}</td>
            <td colSpan={2} className="border border-black p-1 text-center font-semibold">Nippon Branch: {candidate.branch_location || ''}</td>
            <td className="border border-black p-1">Date: <span className="font-semibold">{formatDate(candidate.created_at)}</span></td>
          </tr>
        </tbody>
      </table>

      {/* LOCALITY FEEDBACK */}
      <table className="w-full border-collapse border-l border-r border-black mb-0 table-fixed text-[10px]">
        <tbody>
          <tr className="border-b border-black bg-gray-200">
            <td colSpan={4} className="text-center font-bold py-1">LOCALITY FEEDBACK</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold w-[40%]" colSpan={2}>Name of the Panchayath / Muncipality / Corporation</td>
            <td className="p-1 w-[60%]" colSpan={2}>{locality.panchayathName}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold w-[25%]">Name of the Councillor</td>
            <td className="border-r border-black p-1 w-[25%]">{locality.councillorName}</td>
            <td className="border-r border-black p-1 font-semibold w-[25%]">Name of Panchayath member</td>
            <td className="p-1 w-[25%]">{locality.panchayathMemberName}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-center">Contact No :</td>
            <td className="border-r border-black p-1">{locality.contactNoCouncillor}</td>
            <td className="border-r border-black p-1 font-semibold text-center">Contact No :</td>
            <td className="p-1">{locality.contactNoMember}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>Any issue that has been updated till date (Yes / No )</td>
            <td className="p-1 text-center font-bold">{locality.anyIssueUpdated}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right">If yes specify</td>
            <td className="p-1" colSpan={3}>{locality.anyIssueSpecify}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>Any Police Case Reported (Yes / No )</td>
            <td className="p-1 text-center font-bold">{locality.policeCaseReported}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right">If yes specify</td>
            <td className="p-1" colSpan={3}>{locality.policeCaseSpecify}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>Any kind of family issues (Yes / No )</td>
            <td className="p-1 text-center font-bold">{locality.familyIssues}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right">If yes specify</td>
            <td className="p-1" colSpan={3}>{locality.familyIssuesSpecify}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-bold italic text-center w-[15%]">Over all<br/>feedback</td>
            <td className="p-2 text-center" colSpan={3}>{locality.overallFeedbackLocality}</td>
          </tr>
        </tbody>
      </table>

      {/* SOCIAL MEDIA EVALUATION */}
      <table className="w-full border-collapse border-l border-r border-black mb-0 table-fixed text-[10px]">
        <tbody>
          <tr className="border-b border-black bg-gray-200">
            <td colSpan={4} className="text-center font-bold py-1">SOCIAL MEDIA EVALUATION</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold w-[20%]">Name in Facebook</td>
            <td className="border-r border-black p-1 w-[30%]">{social.facebookName}</td>
            <td className="border-r border-black p-1 font-semibold text-center w-[25%]">Name in Instagram</td>
            <td className="p-1 w-[25%]">{social.instagramName}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>Any kind of political interference in his personal charge (yes / No )</td>
            <td className="p-1 text-center font-bold">{social.politicalInterference}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right" colSpan={2}>If yes - which political side</td>
            <td className="p-1" colSpan={2}>{social.politicalSide}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right" colSpan={2}>What are the kind of shared / liked pages</td>
            <td className="p-1" colSpan={2}>{social.sharedLikedPages}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right" colSpan={2}>In Instagram / facebook who all are the followers</td>
            <td className="p-1" colSpan={2}>{social.instagramFacebookFollowers}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right" colSpan={2}>Past 4 years what all are his following pages</td>
            <td className="p-1" colSpan={2}>{social.followingPages4Years}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>Whether the candidate is active in social media (Yes/No)</td>
            <td className="p-1 text-center font-bold">{social.activeInSocialMedia}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-bold italic text-center w-[15%]">Over all<br/>feedback</td>
            <td className="p-2 text-center" colSpan={3}>{social.overallFeedbackSocialMedia}</td>
          </tr>
        </tbody>
      </table>

      {/* FEEDBACK FROM PREVIOUS EMPLOYER */}
      <table className="w-full border-collapse border border-black mb-2 table-fixed text-[10px]">
        <tbody>
          <tr className="border-b border-black bg-gray-200">
            <td colSpan={4} className="text-center font-bold py-1">Feedback from previous Employer</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold w-[25%]">Employer Name</td>
            <td className="border-r border-black p-1 w-[35%]">{employer.employerName}</td>
            <td className="border-r border-black p-1 font-semibold w-[20%] text-center">Designation</td>
            <td className="p-1 w-[20%] text-center">{employer.designation}</td>
          </tr>
          <tr className="border-b border-black text-center h-16">
            <td className="border-r border-black p-1 font-semibold">Period of Employment</td>
            <td className="border-r border-black p-1 h-full">
              <div className="flex h-full items-center justify-between px-2">
                <div><span className="font-semibold">From</span> <br/> {employer.periodOfEmploymentFrom}</div>
                <div><span className="font-semibold">To</span> <br/> {employer.periodOfEmploymentTo}</div>
              </div>
            </td>
            <td className="border-r border-black p-1 font-semibold">Total year of<br/>Employment</td>
            <td className="p-1 font-bold">{employer.totalYearOfEmployment}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-center">Name of Contacted Person For<br/>Verification</td>
            <td className="border-r border-black p-1 text-center">{employer.contactedPersonName}</td>
            <td className="border-r border-black p-1 font-semibold text-center">Designation of contacted<br/>person</td>
            <td className="p-1 text-center">{employer.contactedPersonDesignation}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-center">Contacted person Mob No :</td>
            <td className="p-1 text-center" colSpan={3}>{employer.contactedPersonMobNo}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-center">Employee - Employer Rapport</td>
            <td className="p-1 text-center" colSpan={3}>{employer.employeeEmployerRapport}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>Any Financial Loans & Advances taken by the candidate (Yes / No)</td>
            <td className="p-1 text-center font-bold">{employer.financialLoansTaken}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold text-right" colSpan={2}>If yes specify</td>
            <td className="p-1" colSpan={2}>{employer.financialLoansSpecify}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 font-semibold" colSpan={3}>If Any long leaves Taken (Yes / No)</td>
            <td className="p-1 text-center font-bold">{employer.longLeavesTaken}</td>
          </tr>
          <tr className="border-b border-black h-12">
            <td className="border-r border-black p-1 font-bold italic text-center w-[15%]">Over all<br/>feedback</td>
            <td className="p-2 text-center align-middle" colSpan={3}>{employer.overallFeedbackEmployer}</td>
          </tr>
        </tbody>
      </table>

      {/* SIGNATURES */}
      <table className="w-full border-collapse border border-black table-fixed text-[10px] text-center">
        <tbody>
          <tr className="border-b border-black font-semibold">
            <td className="border-r border-black py-1">Prepared By</td>
            <td className="border-r border-black py-1">Checked By</td>
            <td className="py-1">Checked By</td>
          </tr>
          <tr className="border-b border-black h-8 align-bottom font-semibold">
            <td className="border-r border-black pb-1"></td>
            <td className="border-r border-black pb-1"></td>
            <td className="pb-1"></td>
          </tr>
          <tr className="font-semibold bg-gray-100">
            <td className="border-r border-black py-1">HRD</td>
            <td className="border-r border-black py-1">HRD</td>
            <td className="py-1">HRM</td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}
