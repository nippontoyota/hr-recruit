import type { Candidate, Evaluation } from '../../types';
import { formatDate, formatTime } from '../../lib/dateTime';
import { interviewTitle } from '../../lib/interviewTitle';

interface InterviewCommentSheetProps {
  candidate: Candidate;
  evaluation: Evaluation;
}

const Line = ({ label, value = '' }: { label: string; value?: string }) => (
  <div className="comment-sheet-line">
    <span className="comment-sheet-label">{label}</span>
    <span className="comment-sheet-value">{value || '\u00a0'}</span>
  </div>
);

const RatingRow = ({ label, max }: { label: string; max: number }) => (
  <tr>
    <td>{label}</td>
    <td className="comment-sheet-checks">
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className="comment-sheet-checkbox" aria-hidden="true" />
      ))}
    </td>
    <td className="comment-sheet-rating-note">Circle one</td>
  </tr>
);

export function InterviewCommentSheet({ candidate, evaluation }: InterviewCommentSheetProps) {
    const scores = evaluation.scores || {};
    const interviewer = String(scores.interviewer_name || '').trim();
    const scheduled = evaluation.scheduled_time;
    const mode = evaluation.interview_mode === 'PHYSICAL' ? 'In person' : evaluation.interview_mode === 'ONLINE' ? 'Online' : '';
    const isTechnical = evaluation.type === 'TECHNICAL_TEST';

    return (
      <div className="comment-sheet-page">
        <header className="comment-sheet-header">
          <div>
            <p className="comment-sheet-eyebrow">NIPPON TOYOTA</p>
            <h1>Interview Comment Sheet</h1>
            <p className="comment-sheet-subtitle">Confidential interviewer record</p>
          </div>
          <img
            src="/nippon-toyota-logo.png"
            alt="Nippon Toyota"
            className="comment-sheet-logo"
          />
        </header>

        <section className="comment-sheet-section">
          <h2>Interview details</h2>
          <div className="comment-sheet-grid comment-sheet-grid-3">
            <Line label="Candidate name" value={candidate.full_name} />
            <Line label="Candidate ID" value={candidate.candidate_id} />
            <Line label="Position" value={candidate.position_applied_for || candidate.department} />
            <Line label="Interview stage" value={interviewTitle(evaluation)} />
            <Line label="Interview date" value={formatDate(scheduled)} />
            <Line label="Interview time" value={formatTime(scheduled)} />
          </div>
          <div className="comment-sheet-grid comment-sheet-grid-3 comment-sheet-grid-spaced">
            <Line label="Interviewer" value={interviewer} />
            <Line label="Interview mode" value={mode} />
            <Line label="Location / meeting link" value={evaluation.location_or_link || ''} />
          </div>
        </section>

        <section className="comment-sheet-section">
          <h2>Assessment</h2>
          <table className="comment-sheet-rating-table">
            <thead>
              <tr>
                <th>Criteria</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <RatingRow label={isTechnical ? 'Technical knowledge' : 'Attitude'} max={4} />
              <RatingRow label={isTechnical ? 'Problem solving' : 'Communication'} max={3} />
              <RatingRow label={isTechnical ? 'Role suitability' : 'Knowledge'} max={3} />
            </tbody>
          </table>
          <p className="comment-sheet-scale">Rating guide: 1 = needs improvement, highest number = excellent</p>
        </section>

        <section className="comment-sheet-section comment-sheet-writing-section">
          <h2>Remarks</h2>
          <Line label="Remarks" />
          <div className="comment-sheet-remarks-box" />
        </section>

        <section className="comment-sheet-footer-section">
          <div>
            <h2>Recommendation</h2>
            <div className="comment-sheet-options">
              <span><span className="comment-sheet-checkbox" /> Selected</span>
              <span><span className="comment-sheet-checkbox" /> Hold</span>
              <span><span className="comment-sheet-checkbox" /> Rejected</span>
            </div>
          </div>
          <div className="comment-sheet-signatures">
            <Line label="Interviewer signature" />
            <Line label="Date" />
          </div>
        </section>

        <footer className="comment-sheet-note">
          Complete all applicable sections and return this sheet to HR after the interview.
        </footer>
      </div>
    );
}
