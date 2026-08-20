import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Candidate, Evaluation } from '../../types';
import type { BgSignature, BgVerificationData } from '../../lib/bgVerification';
import { fetchCandidateResumeBlob } from '../../api/candidates';
import { getDepartmentQuestions } from '../../api/evaluations';
import { CandidateSummarySheet } from './CandidateSummarySheet';
import { InterviewApplicationFormDocument } from './InterviewApplicationFormDocument';
import { SalaryProposalSheetDocument } from './SalaryProposalSheetDocument';
import { interviewTitle } from '../../lib/interviewTitle';
import { formatDate } from '../../lib/dateTime';
import { PdfViewer, DocxViewer } from '../ui';

interface HoReviewPacketProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  includeCss?: boolean;
  includeSalaryProposal?: boolean;
}

function isPdfContent(contentType?: string, fileName?: string): boolean {
  const ct = (contentType || '').toLowerCase();
  const fn = (fileName || '').toLowerCase();
  return ct.includes('pdf') || fn.endsWith('.pdf') || fn.includes('.pdf?');
}

function val(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).trim();
}

function fmtDate(value?: string): string {
  if (!value) return '';
  return formatDate(value);
}

function interviewLabel(ev: Evaluation, indexInType: number): string {
  const custom = String(ev.scores?.custom_title || '').trim();
  if (custom) return custom;
  const base = interviewTitle(ev);
  if (ev.type === 'DEPT_HEAD' && indexInType > 1) return `${base} ${indexInType}`;
  return base;
}

function hasAnyValue(obj: unknown): boolean {
  if (obj == null || obj === '') return false;
  if (typeof obj === 'object') return Object.values(obj as object).some(hasAnyValue);
  return true;
}

function pairs(entries: [string, unknown][]): [string, string][] {
  return entries
    .map(([label, value]) => [label, val(value)] as [string, string])
    .filter(([, value]) => value);
}

function PairRows({ items }: { items: [string, unknown][] }) {
  const filled = pairs(items);
  if (!filled.length) return null;
  const rows: [string, string][][] = [];
  for (let i = 0; i < filled.length; i += 2) {
    rows.push(filled.slice(i, i + 2));
  }
  return rows.map((row) => (
    <tr key={row[0][0]}>
      {row.map(([label, value]) => (
        <td key={label} className="border px-1.5 py-0.5" colSpan={row.length === 1 ? 4 : 2}>
          <span className="font-semibold">{label}: </span>
          {value}
        </td>
      ))}
    </tr>
  ));
}

function sigLine(sig?: BgSignature): string {
  if (!sig) return '';
  return [val(sig.name), val(sig.role), fmtDate(sig.at)].filter(Boolean).join(' · ');
}

/** 2. Interview Comments & Notes Content */
function InterviewNotesContent({ candidate, evaluations }: { candidate: Candidate; evaluations: Evaluation[] }) {
  const typeCounts: Record<string, number> = {};
  const interviews = evaluations
    .filter((ev) => ev.type !== 'TECHNICAL_TEST')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((ev) => {
      typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1;
      return { ev, label: interviewLabel(ev, typeCounts[ev.type]) };
    });

  if (interviews.length === 0) return null;

  return (
    <div className="mt-4 pt-2 border-t-2 border-[#1e3a5f]">
      <div className="iaf-th font-bold text-[11.5px] uppercase tracking-wide text-center py-1 mb-2 border">
        2. Interview Evaluations & Comments
      </div>
      <p className="text-[9.5px] mb-1.5 font-medium text-slate-700">
        {candidate.full_name} · {interviews.length} interview{interviews.length === 1 ? '' : 's'} conducted
      </p>
      <div className="space-y-1.5">
        {interviews.map(({ ev, label }) => {
          const s = ev.scores || {};
          const marks = s.total_score
            ?? ((Number(s.attitude) || 0) + (Number(s.communication) || 0) + (Number(s.knowledge) || 0) || '');
          const pending = ev.status !== 'EVALUATED';
          return (
            <table key={ev.id} className="w-full border-collapse border border-black iaf-block text-[10.5px]">
              <tbody>
                <tr>
                  <td colSpan={3} className="iaf-th border px-1.5 py-0.5 font-bold uppercase text-[10.5px]">
                    {label}
                    {s.interviewer_name ? ` · ${s.interviewer_name}` : ''}
                    {ev.verdict ? ` · ${String(ev.verdict).replace(/_/g, ' ')}` : pending ? ' · Pending' : ''}
                  </td>
                </tr>
                <tr>
                  <td className="border px-1.5 py-0.5 w-[28%]">
                    Date: <b>{fmtDate(ev.updated_at || ev.created_at)}</b>
                  </td>
                  <td className="border px-1.5 py-0.5">
                    Attitude {s.attitude ?? '–'} · Communication {s.communication ?? '–'} · Knowledge {s.knowledge ?? '–'}
                  </td>
                  <td className="border px-1.5 py-0.5 w-[18%] text-center">
                    Marks: <b>{marks || '–'}</b>/10
                  </td>
                </tr>
                {(ev.interview_mode || ev.location_or_link || ev.scheduled_time) ? (
                  <tr>
                    <td className="border px-1.5 py-0.5" colSpan={3}>
                      {[
                        ev.interview_mode && `Mode: ${String(ev.interview_mode).replace(/_/g, ' ')}`,
                        ev.scheduled_time && `Scheduled: ${fmtDate(ev.scheduled_time)}`,
                        ev.location_or_link && `Location: ${ev.location_or_link}`,
                      ].filter(Boolean).join(' · ')}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="border px-1.5 py-1 whitespace-pre-wrap" colSpan={3}>
                    <span className="font-semibold text-slate-800">Remarks / Feedback: </span>
                    {ev.remarks?.trim() || (pending ? 'Not evaluated yet.' : 'No remarks.')}
                  </td>
                </tr>
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}

/** 3. Attached Candidate Resume Block */
function ResumeBlock({ candidate }: { candidate: Candidate }) {
  const [resumeData, setResumeData] = useState<{
    blob: Blob | null;
    blobUrl: string;
    fileName: string;
    contentType: string;
    sourceUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidate?.id) return;
    const controller = new AbortController();
    setLoading(true);

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
        // Silently skip if no resume is uploaded
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [candidate?.id]);

  if (loading) {
    return (
      <div className="iaf-page-wrap no-print py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#1e3a5f]" /> Loading attached resume...
      </div>
    );
  }

  if (!resumeData) return null;

  return (
    <div className="iaf-page-wrap iaf-break">
      <div className="no-print mb-2.5 flex items-center justify-between px-3.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-black">
            📎
          </span>
          <span className="text-[#1e3a5f] tracking-wide font-bold uppercase">
            3. Candidate Resume / CV
          </span>
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
  );
}

function hasTechResult(ev: Evaluation): boolean {
  if (ev.type !== 'TECHNICAL_TEST') return false;
  const s = ev.scores || {};
  return !!(
    ev.status === 'EVALUATED' ||
    ev.verdict ||
    s.percentage != null ||
    s.question_scores ||
    s.candidate_answers
  );
}

function answerLabel(q: { options?: Record<string, string> } | undefined, key: unknown): string {
  const k = val(key);
  if (!k) return '—';
  const opt = q?.options?.[k];
  return opt ? `${k}. ${opt}` : k;
}

/** 4. Technical Test Results Content */
function TechnicalTestContent({ candidate, evaluations }: { candidate: Candidate; evaluations: Evaluation[] }) {
  const tech = evaluations.find(hasTechResult);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!tech) return;
    getDepartmentQuestions({ candidateId: candidate.id })
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }, [tech, candidate.id]);

  if (!tech) return null;

  const s = tech.scores || {};
  const answers = (s.candidate_answers || {}) as Record<string, string>;
  const qScores = (s.question_scores || {}) as Record<string, number>;
  const rows = (questions.length
    ? questions.map((q: any, i: number) => ({
        n: i + 1,
        text: val(q.text),
        answer: answerLabel(q, answers[String(q.id)] ?? answers[q.id]),
        mark: qScores[String(q.id)] ?? qScores[q.id],
      }))
    : Object.keys({ ...qScores, ...answers }).map((id, i) => ({
        n: i + 1,
        text: `Question ${i + 1}`,
        answer: answerLabel(undefined, answers[id]),
        mark: qScores[id],
      }))
  );

  return (
    <div>
      <div className="iaf-th font-bold text-[11.5px] uppercase tracking-wide text-center py-1 mb-1.5 border">
        4. Technical Test Results
      </div>
      <table className="w-full border-collapse border border-black mb-1.5 text-[10.5px]">
        <tbody>
          <tr>
            <td className="border px-1.5 py-0.5">
              <span className="font-semibold">Score: </span>
              <b>{s.percentage != null ? `${s.percentage}%` : '—'}</b>
              {s.correct_answers != null && s.total_questions != null
                ? ` (${s.correct_answers}/${s.total_questions})`
                : ''}
            </td>
            <td className="border px-1.5 py-0.5">
              <span className="font-semibold">Verdict: </span>
              <b>{tech.verdict || '—'}</b>
            </td>
            <td className="border px-1.5 py-0.5">
              <span className="font-semibold">Date: </span>
              {fmtDate(tech.updated_at || tech.created_at)}
            </td>
          </tr>
        </tbody>
      </table>
      {rows.length > 0 && (
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr>
              <td className="iaf-th border px-1 py-0.5 text-center w-[8%]">Q#</td>
              <td className="iaf-th border px-1 py-0.5">Question</td>
              <td className="iaf-th border px-1 py-0.5 w-[28%]">Candidate Answer</td>
              <td className="iaf-th border px-1 py-0.5 text-center w-[10%]">Mark</td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.n}>
                <td className="border px-1 py-0.5 text-center font-medium">{row.n}</td>
                <td className="border px-1 py-0.5">{row.text}</td>
                <td className="border px-1 py-0.5">{row.answer}</td>
                <td className="border px-1 py-0.5 text-center font-bold">
                  {row.mark === 0 || row.mark === 1 ? row.mark : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** 5. Background Verification Details Content */
function BackgroundVerificationContent({ candidate }: { candidate: Candidate }) {
  const saved = candidate.profile?.raw_data?.bg_verification as Partial<BgVerificationData> | undefined;
  if (!saved || !hasAnyValue(saved)) return null;

  const locality = saved.locality || {};
  const social = saved.social || {};
  const employer = saved.employer || {};
  const signatures = saved.signatures || {};
  const meta = saved.meta || {};

  const localityRows: [string, unknown][] = [
    ['Panchayath / Municipality', locality.panchayathName],
    ['Councillor', locality.councillorName],
    ['Panchayath member', locality.panchayathMemberName],
    ['Councillor contact', locality.contactNoCouncillor],
    ['Member contact', locality.contactNoMember],
    ['Any issue updated', locality.anyIssueUpdated],
    ['Issue details', locality.anyIssueSpecify],
    ['Police case reported', locality.policeCaseReported],
    ['Police case details', locality.policeCaseSpecify],
    ['Family issues', locality.familyIssues],
    ['Family issue details', locality.familyIssuesSpecify],
    ['Overall locality feedback', locality.overallFeedbackLocality],
  ];
  const socialRows: [string, unknown][] = [
    ['Facebook name', social.facebookName],
    ['Instagram name', social.instagramName],
    ['Political interference', social.politicalInterference],
    ['Political side', social.politicalSide],
    ['Shared / liked pages', social.sharedLikedPages],
    ['Followers', social.instagramFacebookFollowers],
    ['Following (past 4 years)', social.followingPages4Years],
    ['Active on social media', social.activeInSocialMedia],
    ['Overall social feedback', social.overallFeedbackSocialMedia],
  ];
  const employerRows: [string, unknown][] = [
    ['Employer name', employer.employerName],
    ['Designation', employer.designation],
    ['From', employer.periodOfEmploymentFrom],
    ['To', employer.periodOfEmploymentTo],
    ['Total years', employer.totalYearOfEmployment],
    ['Contacted person', employer.contactedPersonName],
    ['Contacted designation', employer.contactedPersonDesignation],
    ['Contacted mobile', employer.contactedPersonMobNo],
    ['Employee–employer rapport', employer.employeeEmployerRapport],
    ['Financial loans taken', employer.financialLoansTaken],
    ['Loan details', employer.financialLoansSpecify],
    ['Long leaves taken', employer.longLeavesTaken],
    ['Overall employer feedback', employer.overallFeedbackEmployer],
  ];
  const signatureRows: [string, unknown][] = [
    ['Prepared by', sigLine(signatures.preparedBy)],
    ['Checked by (HRD)', sigLine(signatures.checkedBy1)],
    ['Checked by (HRM)', sigLine(signatures.checkedBy2)],
  ];

  return (
    <div className="mt-4 pt-2 border-t-2 border-[#1e3a5f]">
      <div className="iaf-th font-bold text-[11.5px] uppercase tracking-wide text-center py-1 mb-1.5 border">
        5. Background Verification Details
      </div>
      <table className="w-full border-collapse border border-black mb-1.5 text-[10.5px]">
        <tbody>
          <tr>
            <td className="border px-1.5 py-0.5" colSpan={2}>
              <span className="font-semibold">Candidate: </span>{candidate.full_name}
            </td>
            <td className="border px-1.5 py-0.5" colSpan={2}>
              <span className="font-semibold">Verification Date: </span>{fmtDate(meta.completedAt) || '—'}
            </td>
          </tr>
          {val(meta.totalWorkExperience) ? (
            <tr>
              <td className="border px-1.5 py-0.5" colSpan={4}>
                <span className="font-semibold">Total work experience: </span>{val(meta.totalWorkExperience)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {pairs(localityRows).length > 0 && (
        <table className="w-full border-collapse border border-black mb-1.5 iaf-block text-[10px]">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-0.5 font-bold uppercase text-[10px] text-center">
                Locality Feedback
              </td>
            </tr>
            <PairRows items={localityRows} />
          </tbody>
        </table>
      )}

      {pairs(socialRows).length > 0 && (
        <table className="w-full border-collapse border border-black mb-1.5 iaf-block text-[10px]">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-0.5 font-bold uppercase text-[10px] text-center">
                Social Media Evaluation
              </td>
            </tr>
            <PairRows items={socialRows} />
          </tbody>
        </table>
      )}

      {pairs(employerRows).length > 0 && (
        <table className="w-full border-collapse border border-black mb-1.5 iaf-block text-[10px]">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-0.5 font-bold uppercase text-[10px] text-center">
                Previous Employer Feedback
              </td>
            </tr>
            <PairRows items={employerRows} />
          </tbody>
        </table>
      )}

      {pairs(signatureRows).length > 0 && (
        <table className="w-full border-collapse border border-black iaf-block text-[10px]">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-0.5 font-bold uppercase text-[10px] text-center">
                Signatures & Sign-off
              </td>
            </tr>
            <PairRows items={signatureRows} />
          </tbody>
        </table>
      )}
    </div>
  );
}

export function HoReviewPacket({
  candidate,
  evaluations,
  includeCss = false,
  includeSalaryProposal = false,
}: HoReviewPacketProps) {
  const hasTech = evaluations.some(hasTechResult);
  const bgData = candidate.profile?.raw_data?.bg_verification;
  const hasBg = bgData && hasAnyValue(bgData);

  return (
    <div className="iaf-doc space-y-6 print:space-y-0 print:gap-0">
      {/* 1. Candidate Summary Sheet (CSS) */}
      {includeCss && (
        <div className="iaf-page-wrap iaf-break print:m-0 print:p-0">
          <div className="w-[210mm] mx-auto shadow-md print:w-full print:shadow-none print:m-0 print:p-0">
            <CandidateSummarySheet candidate={candidate} evaluations={evaluations} />
          </div>
        </div>
      )}

      {/* 2. Application Form (Pages 1 & 2) + 3. Interview Comments & Evaluations */}
      <InterviewApplicationFormDocument
        candidate={candidate}
        hideResume={true}
        afterDeclaration={
          <InterviewNotesContent candidate={candidate} evaluations={evaluations} />
        }
      />

      {/* 4. Candidate Resume / CV */}
      <ResumeBlock candidate={candidate} />

      {/* 5. Technical Test Results & 6. Background Verification Details */}
      {(hasTech || hasBg) && (
        <div className="iaf-page-wrap iaf-break print:m-0 print:p-0">
          <section className="iaf-sheet iaf-form font-sans text-[10.5px] leading-[1.3] antialiased print:p-0 print:border-none print:shadow-none">
            <TechnicalTestContent candidate={candidate} evaluations={evaluations} />
            <BackgroundVerificationContent candidate={candidate} />
          </section>
        </div>
      )}

      {/* 7. Salary Proposal Sheet */}
      {includeSalaryProposal && (
        <div className="iaf-page-wrap iaf-break print:m-0 print:p-0">
          <div className="w-[210mm] mx-auto shadow-md print:w-full print:shadow-none print:m-0 print:p-0">
            <SalaryProposalSheetDocument candidate={candidate} />
          </div>
        </div>
      )}
    </div>
  );
}
