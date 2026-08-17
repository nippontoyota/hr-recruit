import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, CheckCircle2, MapPin, Phone, Mail, XCircle } from 'lucide-react';
import { getCandidatePortal, submitCandidatePortalResponse, type CandidatePortalOut, type CandidatePortalEvaluationOut } from '../../api/portal';
import { Button } from '../../components/ui';
import { PublicShell } from '../../components/layout/PublicShell';
import { PublicStatusPanel } from '../../components/candidates/PublicStatusPanel';
import { extractError } from '../../lib/utils';
import { formatDateTime } from '../../lib/dateTime';

function formatDate(value: string | null) {
  return value ? formatDateTime(value) : 'To be decided';
}

function ResponseBadge({ value }: { value: string | null }) {
  return value === 'CONFIRMED' ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-xs font-semibold text-success"><CheckCircle2 className="h-4 w-4" /> Confirmed</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-xs font-semibold text-danger"><XCircle className="h-4 w-4" /> Declined</span>
  );
}

function InterviewCard({ evaluation, submitting, onResponse }: { evaluation: CandidatePortalEvaluationOut; submitting: boolean; onResponse: (action: 'INTERVIEW_CONFIRM' | 'INTERVIEW_DECLINE', id: string) => void }) {
  return (
    <article className="page-card p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Interview invitation</p>
      <h2 className="mt-1 text-lg font-semibold text-text-primary">{evaluation.type.replace(/_/g, ' ')}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3"><Calendar className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" /><div><p className="text-xs text-text-secondary">Date and time</p><p className="text-sm font-medium text-text-primary">{formatDate(evaluation.scheduled_time)}</p></div></div>
        <div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" /><div><p className="text-xs text-text-secondary">Mode and location</p><p className="text-sm font-medium text-text-primary">{evaluation.interview_mode === 'PHYSICAL' ? 'In person' : evaluation.interview_mode === 'ONLINE' ? 'Online' : 'To be decided'}</p>{evaluation.location_or_link && <p className="mt-1 break-words text-sm text-text-secondary">{evaluation.location_or_link}</p>}</div></div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button disabled={submitting} onClick={() => onResponse('INTERVIEW_CONFIRM', evaluation.id)} className="sm:w-auto">Confirm attendance</Button>
        <Button disabled={submitting} variant="secondary" onClick={() => onResponse('INTERVIEW_DECLINE', evaluation.id)} className="sm:w-auto">Decline interview</Button>
      </div>
    </article>
  );
}

export default function CandidatePortalPage() {
  const { token } = useParams<{ token: string }>();
  const [portalData, setPortalData] = useState<CandidatePortalOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [finalResponse, setFinalResponse] = useState<string | null>(null);

  const fetchPortal = useCallback(async () => {
    if (!token) { setLoadError('This link is missing its candidate reference.'); setLoading(false); return; }
    try {
      setLoadError(null);
      setPortalData(await getCandidatePortal(token));
    } catch (err) {
      setLoadError(extractError(err, 'This link is invalid, expired, or no longer active.'));
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void fetchPortal(); }, [fetchPortal]);

  const handleResponse = async (action: 'INTERVIEW_CONFIRM' | 'INTERVIEW_DECLINE' | 'OFFER_ACCEPT' | 'OFFER_DECLINE', evalId?: string) => {
    if (!token || submitting) return;
    const isDecline = action.endsWith('DECLINE');
    const label = action.startsWith('INTERVIEW') ? 'decline this interview invitation' : 'decline this offer';
    if (isDecline && !window.confirm(`Please confirm: ${label}. This response may not be reversible through this link.`)) return;
    setSubmitting(true); setResponseError(null);
    try {
      await submitCandidatePortalResponse(token, action, evalId);
      setFinalResponse(action);
      await fetchPortal();
    } catch (err) {
      setResponseError(extractError(err, 'Your response was not recorded. Please try again.'));
    } finally { setSubmitting(false); }
  };

  if (loading) return <PublicShell title="Candidate portal"><PublicStatusPanel kind="loading" message="Loading your candidate portal…" /></PublicShell>;
  if (loadError || !portalData) return <PublicShell title="Candidate portal"><PublicStatusPanel kind="expired" title="Link unavailable" message={`${loadError || 'This portal link is no longer active.'} Ask your HR recruiter for help or a fresh link.`} actionLabel="Try again" onAction={() => { setLoading(true); void fetchPortal(); }} /></PublicShell>;

  const pendingInterviews = portalData.evaluations.filter((evaluation) => !evaluation.candidate_response);
  const respondedInterviews = portalData.evaluations.filter((evaluation) => evaluation.candidate_response);
  const offerPending = portalData.offer_status && !['ACCEPTED', 'DECLINED'].includes(portalData.offer_status);

  return (
    <PublicShell title="Candidate portal" step="Review and respond">
      <div className="space-y-6">
        <section className="page-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Candidate portal</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">{portalData.full_name}</h1>
          {portalData.position_applied_for && <p className="mt-1 text-sm text-text-secondary">Applying for {portalData.position_applied_for}</p>}
          <div className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
            <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{portalData.phone}</span>
            {portalData.email && <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{portalData.email}</span>}
            {portalData.branch_location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{portalData.branch_location}</span>}
          </div>
        </section>

        {finalResponse && <PublicStatusPanel kind="submitted" title="Response recorded" message={finalResponse.endsWith('DECLINE') ? 'Your decline has been recorded. Your HR recruiter can help if you need to discuss it.' : 'Your response has been recorded. This page now shows the latest status.'} />}
        {responseError && <PublicStatusPanel kind="retry" message={responseError} actionLabel="Retry portal" onAction={() => { setLoading(true); void fetchPortal(); }} />}

        {pendingInterviews.length > 0 && <section className="space-y-4"><h2 className="text-lg font-semibold text-text-primary">Action required</h2>{pendingInterviews.map((evaluation) => <InterviewCard key={evaluation.id} evaluation={evaluation} submitting={submitting} onResponse={handleResponse} />)}</section>}

        {offerPending && <section className="page-card p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Offer response</p><h2 className="mt-1 text-lg font-semibold text-text-primary">Please respond to your offer</h2><p className="mt-2 text-sm text-text-secondary">Your response is pending. Do not submit it more than once while it is being recorded.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button disabled={submitting} onClick={() => handleResponse('OFFER_ACCEPT')}>Accept offer</Button><Button disabled={submitting} variant="secondary" onClick={() => handleResponse('OFFER_DECLINE')}>Decline offer</Button></div></section>}
        {portalData.offer_status && !offerPending && <section className="page-card p-5"><h2 className="font-semibold text-text-primary">Offer response: {portalData.offer_status.replace(/_/g, ' ')}</h2><p className="mt-1 text-sm text-text-secondary">Your final offer response is shown here.</p></section>}

        {respondedInterviews.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold text-text-primary">Your interview schedule</h2>{respondedInterviews.map((evaluation) => <article key={evaluation.id} className="page-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-text-primary">{evaluation.type.replace(/_/g, ' ')}</h3><p className="mt-1 text-sm text-text-secondary">{formatDate(evaluation.scheduled_time)}{evaluation.location_or_link ? ` · ${evaluation.location_or_link}` : ''}</p></div><ResponseBadge value={evaluation.candidate_response} /></article>)}</section>}
      </div>
    </PublicShell>
  );
}
