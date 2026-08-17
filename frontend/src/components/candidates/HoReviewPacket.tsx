import { useEffect, useState } from 'react';
import type { Candidate, Evaluation } from '../../types';
import type { BgSignature, BgVerificationData } from '../../lib/bgVerification';
import { getDepartmentQuestions } from '../../api/evaluations';
import { InterviewApplicationFormDocument } from './InterviewApplicationFormDocument';
import { interviewTitle } from '../../lib/interviewTitle';
import { formatDate } from '../../lib/dateTime';

interface HoReviewPacketProps {
  candidate: Candidate;
  evaluations: Evaluation[];
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
        <td key={label} className="border px-1.5 py-1" colSpan={row.length === 1 ? 4 : 2}>
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

function BackgroundVerificationBlock({ candidate }: { candidate: Candidate }) {
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
    <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.35]">
      <div className="iaf-th font-bold text-[13px] uppercase tracking-wide text-center py-1.5 mb-2 border">
        Background Verification
      </div>
      <table className="w-full border-collapse border mb-1.5">
        <tbody>
          <tr>
            <td className="border px-1.5 py-1" colSpan={2}>
              <span className="font-semibold">Candidate: </span>{candidate.full_name}
            </td>
            <td className="border px-1.5 py-1" colSpan={2}>
              <span className="font-semibold">Date: </span>{fmtDate(meta.completedAt) || '—'}
            </td>
          </tr>
          {val(meta.totalWorkExperience) ? (
            <tr>
              <td className="border px-1.5 py-1" colSpan={4}>
                <span className="font-semibold">Total work experience: </span>{val(meta.totalWorkExperience)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {pairs(localityRows).length > 0 && (
        <table className="w-full border-collapse border mb-1.5">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-1 font-bold uppercase text-[11px] text-center">
                Locality Feedback
              </td>
            </tr>
            <PairRows items={localityRows} />
          </tbody>
        </table>
      )}

      {pairs(socialRows).length > 0 && (
        <table className="w-full border-collapse border mb-1.5">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-1 font-bold uppercase text-[11px] text-center">
                Social Media Evaluation
              </td>
            </tr>
            <PairRows items={socialRows} />
          </tbody>
        </table>
      )}

      {pairs(employerRows).length > 0 && (
        <table className="w-full border-collapse border mb-1.5">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-1 font-bold uppercase text-[11px] text-center">
                Previous Employer Feedback
              </td>
            </tr>
            <PairRows items={employerRows} />
          </tbody>
        </table>
      )}

      {pairs(signatureRows).length > 0 && (
        <table className="w-full border-collapse border">
          <tbody>
            <tr>
              <td colSpan={4} className="iaf-th border px-1.5 py-1 font-bold uppercase text-[11px] text-center">
                Signatures
              </td>
            </tr>
            <PairRows items={signatureRows} />
          </tbody>
        </table>
      )}
    </section>
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

function TechnicalTestBlock({ candidate, evaluations }: { candidate: Candidate; evaluations: Evaluation[] }) {
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
    <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.35]">
      <div className="iaf-th font-bold text-[13px] uppercase tracking-wide text-center py-1.5 mb-2 border">
        Technical Test Result
      </div>
      <table className="w-full border-collapse border mb-1.5">
        <tbody>
          <tr>
            <td className="border px-1.5 py-1">
              <span className="font-semibold">Score: </span>
              <b>{s.percentage != null ? `${s.percentage}%` : '—'}</b>
              {s.correct_answers != null && s.total_questions != null
                ? ` (${s.correct_answers}/${s.total_questions})`
                : ''}
            </td>
            <td className="border px-1.5 py-1">
              <span className="font-semibold">Verdict: </span>
              <b>{tech.verdict || '—'}</b>
            </td>
            <td className="border px-1.5 py-1">
              <span className="font-semibold">Date: </span>
              {fmtDate(tech.updated_at || tech.created_at)}
            </td>
          </tr>
        </tbody>
      </table>
      {rows.length > 0 && (
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <td className="iaf-th border px-1 py-0.5 text-center w-[8%]">Q</td>
              <td className="iaf-th border px-1 py-0.5">Question</td>
              <td className="iaf-th border px-1 py-0.5 w-[28%]">Answer</td>
              <td className="iaf-th border px-1 py-0.5 text-center w-[10%]">Mark</td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.n}>
                <td className="border px-1 py-0.5 text-center">{row.n}</td>
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
    </section>
  );
}

export function HoReviewPacket({ candidate, evaluations }: HoReviewPacketProps) {
  const typeCounts: Record<string, number> = {};
  const interviews = evaluations
    .filter((ev) => ev.type !== 'TECHNICAL_TEST')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((ev) => {
      typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1;
      return { ev, label: interviewLabel(ev, typeCounts[ev.type]) };
    });

  return (
    <div className="iaf-doc">
      <InterviewApplicationFormDocument candidate={candidate} />

      {interviews.length > 0 && (
        <section className="iaf-sheet iaf-form font-sans text-[11px] leading-[1.35]">
          <div className="iaf-th font-bold text-[13px] uppercase tracking-wide text-center py-1.5 mb-2 border">
            Interview Notes
          </div>
          <p className="text-[10px] mb-2">
            {candidate.full_name} · {interviews.length} interview{interviews.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-2">
            {interviews.map(({ ev, label }) => {
              const s = ev.scores || {};
              const marks = s.total_score
                ?? ((Number(s.attitude) || 0) + (Number(s.communication) || 0) + (Number(s.knowledge) || 0) || '');
              const pending = ev.status !== 'EVALUATED';
              return (
                <table key={ev.id} className="w-full border-collapse border">
                  <tbody>
                    <tr>
                      <td colSpan={3} className="iaf-th border px-1.5 py-1 font-bold uppercase text-[11px]">
                        {label}
                        {s.interviewer_name ? ` · ${s.interviewer_name}` : ''}
                        {ev.verdict ? ` · ${String(ev.verdict).replace(/_/g, ' ')}` : pending ? ' · Pending' : ''}
                      </td>
                    </tr>
                    <tr>
                      <td className="border px-1.5 py-1 w-[28%]">
                        Date: <b>{fmtDate(ev.updated_at || ev.created_at)}</b>
                      </td>
                      <td className="border px-1.5 py-1">
                        Attitude {s.attitude ?? '–'} · Communication {s.communication ?? '–'} · Knowledge {s.knowledge ?? '–'}
                      </td>
                      <td className="border px-1.5 py-1 w-[18%] text-center">
                        Marks: <b>{marks || '–'}</b>/10
                      </td>
                    </tr>
                    {(ev.interview_mode || ev.location_or_link || ev.scheduled_time) ? (
                      <tr>
                        <td className="border px-1.5 py-1" colSpan={3}>
                          {[
                            ev.interview_mode && `Mode: ${String(ev.interview_mode).replace(/_/g, ' ')}`,
                            ev.scheduled_time && `Scheduled: ${fmtDate(ev.scheduled_time)}`,
                            ev.location_or_link && `Location: ${ev.location_or_link}`,
                          ].filter(Boolean).join(' · ')}
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="border px-1.5 py-1.5 whitespace-pre-wrap" colSpan={3}>
                        {ev.remarks?.trim() || (pending ? 'Not evaluated yet.' : 'No remarks.')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })}
          </div>
        </section>
      )}

      <TechnicalTestBlock candidate={candidate} evaluations={evaluations} />

      <BackgroundVerificationBlock candidate={candidate} />
    </div>
  );
}
