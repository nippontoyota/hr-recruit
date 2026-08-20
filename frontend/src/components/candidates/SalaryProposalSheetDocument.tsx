import type { Candidate } from '../../types';
import { formatDate } from '../../lib/dateTime';

interface SalaryProposalSheetDocumentProps {
  candidate: Candidate;
  className?: string;
}

function fmtMoney(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return '—';
  if (val === 0) return '0';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

function getNum(sal: Record<string, unknown> | undefined, ...keys: string[]): number | null {
  if (!sal) return null;
  for (const k of keys) {
    const v = sal[k];
    if (v != null && v !== '') {
      const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function getStr(sal: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!sal) return '';
  for (const k of keys) {
    const v = sal[k];
    if (v != null && v !== '') return String(v).trim();
  }
  return '';
}

export function SalaryProposalSheetDocument({ candidate, className = '' }: SalaryProposalSheetDocumentProps) {
  const sal = (candidate.salary_data || {}) as Record<string, unknown>;
  const raw = (candidate.profile?.raw_data || {}) as Record<string, unknown>;

  // Metadata
  const jobCode = getStr(sal, 'job code', 'job_code', 'Job Code', 'candidate_id') || candidate.candidate_id || candidate.id.slice(0, 8);
  const name = getStr(sal, 'name', 'Name') || candidate.full_name;
  const level = getStr(sal, 'level', 'Level') || (raw.level as string) || '—';
  const rawDoj = getStr(sal, 'proposed doj', 'proposed_doj', 'Proposed DOJ') || candidate.profile?.joining_date;
  const proposedDoj = rawDoj ? formatDate(rawDoj) : '—';
  const department = getStr(sal, 'department', 'Department') || candidate.department || '—';
  const designation = getStr(sal, 'designation', 'Designation') || candidate.position_applied_for || '—';
  const branch = getStr(sal, 'branch', 'Branch') || candidate.branch_location || 'Kalamassery';
  const lastSalary = getNum(sal, 'last salary', 'last_salary', 'Last Salary') ?? (candidate.profile?.current_salary ? Number(candidate.profile.current_salary) : null);
  const expectedSalary = getStr(sal, 'candidate expected salary', 'candidate_expected_salary', 'Candidate Expected Salary') || (candidate.profile?.expected_salary ? String(candidate.profile.expected_salary) : '—');
  const totalExp = getStr(sal, 'total experience', 'total_experience', 'Total Experience ') || (raw.totalWorkExperience ? `${raw.totalWorkExperience} Year(s)` : '—');
  const relevantExp = getStr(sal, 'relevant experience', 'relevant_experience', 'Relevant Experience') || (raw.relevantWorkExperience ? `${raw.relevantWorkExperience} Year(s)` : '—');

  // Breakdown figures
  const basicDa = getNum(sal, 'basic da', 'basic_da', 'Basic+DA') ?? 0;
  const hra = getNum(sal, 'hra', 'HRA') ?? 0;
  const travel = getNum(sal, 'travel', 'Travel') ?? 0;
  const hostel = getNum(sal, 'hostel', 'Hostel') ?? 0;
  const childrenEducation = getNum(sal, 'children education', 'children_education', 'Children Education') ?? 0;
  const totalSalary = getNum(sal, 'total salary', 'total_salary', 'Total Salary') ?? (basicDa + hra + travel + hostel + childrenEducation);

  const conveyance = getNum(sal, 'conveyance', 'Conveyance') ?? 0;
  const mobile = getNum(sal, 'mobile', 'Mobile') ?? 0;
  const branchAllowance = getNum(sal, 'branch allowance', 'branch_allowance', 'Branch Allowance') ?? 0;
  const totalAllowance = getNum(sal, 'total allowance', 'total_allowance', 'Total Allowance') ?? (conveyance + mobile + branchAllowance);

  const totalSalaryAllowance = getNum(sal, 'total salary allowance', 'total_salary_allowance', 'Total Salary+Allowance') ?? (totalSalary + totalAllowance);

  const fixedIncentive = getNum(sal, 'fixed incentive', 'fixed_incentive', 'Fixed Incentive') ?? 0;
  const totalIncentive = getNum(sal, 'total incentive', 'total_incentive', 'Total Incentive') ?? fixedIncentive;
  const incentiveRemarks = getStr(sal, 'incentive remarks', 'incentive ramarks', 'incentive_remarks', 'Incentive Ramarks');

  const grossSalary = getNum(sal, 'gross salary', 'gross_salary', 'Gross Salary') ?? (totalSalaryAllowance + totalIncentive);

  // Deductions
  const pfEmployee = getNum(sal, 'pf employee', 'pf_employee', 'PF Employee') ?? Math.round(Math.min(basicDa, 15000) * 0.12);
  const esiEmployee = getNum(sal, 'esi employee', 'esi_employee', 'ESI Employee') ?? (grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0);
  const totalDeductions = getNum(sal, 'total', 'total deductions', 'total_deductions', 'Total') ?? (pfEmployee + esiEmployee);
  const takeHome = getNum(sal, 'total monthly take home after deduction', 'take home', 'take_home', 'Total Monthly  Take Home After Deduction') ?? (grossSalary - totalDeductions);

  // Employer Contributions
  const pfEmployer = getNum(sal, 'pf employer', 'pf_employer', 'PF Employer') ?? pfEmployee;
  const esiEmployer = getNum(sal, 'esi employer', 'esi_employer', 'ESI Employer') ?? (grossSalary <= 21000 ? Math.round(grossSalary * 0.0325) : 0);
  const bonusMonthly = getNum(sal, 'bonus monthly', 'bonus_monthly', 'Bonus-Monthly') ?? Math.round((basicDa * 0.0833));
  const bonusYearly = getNum(sal, 'bonus yearly', 'bonus_yearly', 'Bonus-Yearly') ?? (bonusMonthly * 12);
  const gratuityMonthly = getNum(sal, 'gratuity monthly', 'gratuity_monthly', 'Gratuity-Monthly') ?? Math.round((basicDa * 15 / 26 / 12));
  const gratuityYearly = getNum(sal, 'gratuity yearly', 'gratuity_yearly', 'Gratuity-Yearly') ?? (gratuityMonthly * 12);

  const monthlyCtc = getNum(sal, 'monthly ctc', 'monthly_ctc', 'Monthly-CTC') ?? (totalSalary + totalAllowance + totalIncentive + pfEmployer + esiEmployer + bonusMonthly + gratuityMonthly);
  const yearlyCtc = getNum(sal, 'yearly ctc', 'yearly_ctc', 'Yearly CTC') ?? (monthlyCtc * 12);

  const todayStr = formatDate(new Date().toISOString());

  return (
    <div className={`iaf-sheet iaf-form font-sans text-[10px] leading-[1.25] antialiased bg-white text-black w-[210mm] min-h-[297mm] p-[6mm_8mm] shadow-lg border border-slate-300 print:shadow-none print:border-none ${className}`}>
      {/* Top Ref Bar */}
      <div className="flex justify-between items-center text-[10px] font-bold mb-1 border-b border-black pb-1">
        <span className="text-slate-700">REF No.: <span className="text-black font-black">{jobCode}</span></span>
        <span className="text-slate-500 uppercase tracking-widest text-[9px]">CONFIDENTIAL · PROPOSAL</span>
      </div>

      {/* Main Header */}
      <div className="text-center mb-4">
        <h1 className="text-[13px] font-black tracking-wide uppercase text-[#1e3a5f]">
          NIPPON MOTOR CORPORATION (P) LTD, {branch.toUpperCase()}
        </h1>
        <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-700 mt-0.5">
          HUMAN RESOURCES DEPARTMENT
        </h2>
        <div className="inline-block bg-[#1e3a5f] text-white font-extrabold text-[11.5px] tracking-widest uppercase px-4 py-0.5 mt-1.5 rounded-xs">
          SALARY PROPOSAL - NIPPON
        </div>
      </div>

      {/* Candidate Details Grid */}
      <table className="w-full border-collapse border border-black mb-4 text-[10.5px]">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100 w-[24%]">Name</td>
            <td className="border border-black px-2 py-1 font-semibold w-[26%]">{name}</td>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100 w-[24%]">Level</td>
            <td className="border border-black px-2 py-1 font-semibold w-[26%]">{level}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Proposed Date of Joining</td>
            <td className="border border-black px-2 py-1 font-semibold">{proposedDoj}</td>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Department</td>
            <td className="border border-black px-2 py-1 font-semibold">{department}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Designation</td>
            <td className="border border-black px-2 py-1 font-semibold">{designation}</td>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Branch</td>
            <td className="border border-black px-2 py-1 font-semibold">{branch}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Last Salary</td>
            <td className="border border-black px-2 py-1 font-semibold">{fmtMoney(lastSalary)}</td>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Candidate Expected Salary</td>
            <td className="border border-black px-2 py-1 font-semibold">{expectedSalary}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Total Experience</td>
            <td className="border border-black px-2 py-1 font-semibold">{totalExp}</td>
            <td className="border border-black px-2 py-1 font-bold bg-slate-100">Relevant Experience</td>
            <td className="border border-black px-2 py-1 font-semibold">{relevantExp}</td>
          </tr>
        </tbody>
      </table>

      {/* Salary Breakdown Table */}
      <table className="w-full border-collapse border border-black mb-4 text-[10.5px]">
        <thead>
          <tr className="bg-[#1e3a5f] text-white">
            <th className="border border-black px-2 py-1.5 text-left font-bold w-[54%]">SALARY BREAK UP</th>
            <th className="border border-black px-2 py-1.5 text-right font-bold w-[23%]">MONTHLY (₹)</th>
            <th className="border border-black px-2 py-1.5 text-right font-bold w-[23%]">YEARLY (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-2 py-0.5">BASIC + DA</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(basicDa)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(basicDa * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">HRA</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(hra)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(hra * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">TRAVEL</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(travel)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(travel * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">HOSTEL</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(hostel)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(hostel * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">CHILDREN EDUCATION</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(childrenEducation)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(childrenEducation * 12)}</td>
          </tr>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-2 py-1">TOTAL SALARY</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalSalary)}</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalSalary * 12)}</td>
          </tr>

          {/* Allowances */}
          <tr>
            <td className="border border-black px-2 py-0.5">CONVEYANCE</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(conveyance)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(conveyance * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">MOBILE</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(mobile)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(mobile * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">BRANCH ALLOWANCE</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(branchAllowance)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(branchAllowance * 12)}</td>
          </tr>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-2 py-1">TOTAL ALLOWANCE</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalAllowance)}</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalAllowance * 12)}</td>
          </tr>

          {/* Salary + Allowance */}
          <tr className="bg-slate-200 font-extrabold text-[11px]">
            <td className="border border-black px-2 py-1">TOTAL SALARY + ALLOWANCE</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalSalaryAllowance)}</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalSalaryAllowance * 12)}</td>
          </tr>

          {/* Incentives */}
          <tr>
            <td className="border border-black px-2 py-0.5">FIXED INCENTIVE</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(fixedIncentive)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(fixedIncentive * 12)}</td>
          </tr>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-2 py-1">TOTAL INCENTIVE</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalIncentive)}</td>
            <td className="border border-black px-2 py-1 text-right">{fmtMoney(totalIncentive * 12)}</td>
          </tr>
          {incentiveRemarks ? (
            <tr className="bg-amber-50/50">
              <td colSpan={3} className="border border-black px-2 py-1 text-[10px] text-slate-700 italic">
                <span className="font-bold not-italic text-black">Incentive Remarks: </span>{incentiveRemarks}
              </td>
            </tr>
          ) : null}

          {/* Gross Salary */}
          <tr className="bg-[#1e3a5f]/15 font-black text-[11.5px] border-t-2 border-black">
            <td className="border border-black px-2 py-1.5 uppercase">GROSS SALARY</td>
            <td className="border border-black px-2 py-1.5 text-right text-[#1e3a5f]">{fmtMoney(grossSalary)}</td>
            <td className="border border-black px-2 py-1.5 text-right text-[#1e3a5f]">{fmtMoney(grossSalary * 12)}</td>
          </tr>

          {/* Deductions Subheader */}
          <tr className="bg-slate-50">
            <td colSpan={3} className="border border-black px-2 py-0.5 text-[9.5px] text-slate-600 italic">
              * For PF calculation (Basic+DA) limited to ₹15,000/-
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">EMPLOYEE EPF (12%)</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium text-rose-700">{fmtMoney(pfEmployee)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium text-rose-700">{fmtMoney(pfEmployee * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">EMPLOYEE ESI CONTRIBUTION (0.75%)</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium text-rose-700">{fmtMoney(esiEmployee)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium text-rose-700">{fmtMoney(esiEmployee * 12)}</td>
          </tr>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-2 py-1">TOTAL DEDUCTIONS</td>
            <td className="border border-black px-2 py-1 text-right text-rose-800">{fmtMoney(totalDeductions)}</td>
            <td className="border border-black px-2 py-1 text-right text-rose-800">{fmtMoney(totalDeductions * 12)}</td>
          </tr>

          {/* Take Home */}
          <tr className="bg-emerald-50 font-black text-[11.5px] border-y-2 border-black">
            <td className="border border-black px-2 py-1.5 text-emerald-900 uppercase">TAKE HOME AFTER DEDUCTION</td>
            <td className="border border-black px-2 py-1.5 text-right text-emerald-900">{fmtMoney(takeHome)}</td>
            <td className="border border-black px-2 py-1.5 text-right text-emerald-900">{fmtMoney(takeHome * 12)}</td>
          </tr>

          {/* Employer Contributions & CTC */}
          <tr>
            <td className="border border-black px-2 py-0.5">EMPLOYER EPF (12%)</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(pfEmployer)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(pfEmployer * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">EMPLOYER ESI CONTRIBUTION (3.25%)</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(esiEmployer)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(esiEmployer * 12)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">BONUS (Monthly) - Eligibility after completion of 1 year</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(bonusMonthly)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(bonusYearly)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0.5">GRATUITY - As per Statutory norms</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(gratuityMonthly)}</td>
            <td className="border border-black px-2 py-0.5 text-right font-medium">{fmtMoney(gratuityYearly)}</td>
          </tr>

          {/* Monthly CTC */}
          <tr className="bg-[#1e3a5f] text-white font-black text-[12px]">
            <td className="border border-black px-2 py-2 uppercase tracking-wide">MONTHLY CTC / YEARLY CTC</td>
            <td className="border border-black px-2 py-2 text-right">{fmtMoney(monthlyCtc)}</td>
            <td className="border border-black px-2 py-2 text-right">{fmtMoney(yearlyCtc)}</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures & Approvals */}
      <table className="w-full border-collapse border border-black mb-4 text-[10px]">
        <tbody>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-2 py-1 w-1/2">Prepared By</td>
            <td className="border border-black px-2 py-1 w-1/2">Checked By</td>
          </tr>
          <tr className="h-10">
            <td className="border border-black px-2 py-1 align-bottom">
              <div className="font-semibold text-slate-800">HRD</div>
              <div className="text-[9px] text-slate-500">{todayStr}</div>
            </td>
            <td className="border border-black px-2 py-1 align-bottom">
              <div className="font-semibold text-slate-800">Head Office HR Manager</div>
              <div className="text-[9px] text-slate-500">Jerry Jacob Mathew</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Candidate Declaration */}
      <div className="border border-black p-2.5 bg-slate-50 text-[10px] space-y-2">
        <div className="font-bold uppercase tracking-wider text-center border-b border-slate-300 pb-1">
          DECLARATION BY THE CANDIDATE
        </div>
        <p className="italic text-slate-700 leading-relaxed">
          &quot;I hereby declare that I am fully aware of the salary details and structure explained to me.&quot;
        </p>
        <div className="flex justify-between items-end pt-3 text-[9.5px]">
          <div>
            <span className="font-bold">Date:</span> ___________________
          </div>
          <div className="text-right">
            <span className="font-bold">Name &amp; Signature of Candidate:</span> __________________________
          </div>
        </div>
      </div>
    </div>
  );
}
