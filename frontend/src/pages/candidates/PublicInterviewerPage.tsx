import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal, PdfViewer } from '../../components/ui';
import { getPublicEvaluation, submitPublicEvaluation } from '../../api/evaluations';
import { defaultInterviewTitle, interviewTitle } from '../../lib/interviewTitle';
import type { EvaluationPublicDetails, EvaluationVerdict } from '../../types';
import { cn, extractError, resumeEmbedUrl } from '../../lib/utils';
import { PublicShell } from '../../components/layout/PublicShell';
import { PublicStatusPanel } from '../../components/candidates/PublicStatusPanel';

const PERSONAL_KEYS = ['age', 'gender', 'maritalStatus', 'dateOfBirth', 'permDistrict', 'presDistrict'];
const LANGUAGE_KEYS = ['languagesRead', 'languagesWrite', 'languagesSpeak', 'languagesOther'];
const EDUCATION_KEYS = [
  'class10School', 'class10Board', 'class10Percentage', 'class10PassingYear', 'class10Mode',
  'class12School', 'class12Stream', 'class12Percentage', 'class12PassingYear', 'class12Mode',
  'gradCourse', 'gradCollege', 'gradPercentage', 'gradPassingYear', 'gradMode',
  'postGradCourse', 'postGradCollege', 'postGradPercentage', 'postGradPassingYear', 'postGradMode',
];
const EMPLOYMENT_KEYS = [
  'previousExperience', 'totalExperience', 'expectedSalary', 'currentSalary', 'noticePeriod',
  'expectedJoiningDate', 'preferredRegion', 'sourceOfOpening',
  'prevCompanyName', 'prevPosition', 'prev1Reporting', 'prev1From', 'prev1To', 'prev1Salary', 'prev1Reason',
  'prev2Name', 'prev2Position', 'prev2Reporting', 'prev2From', 'prev2To', 'prev2Salary', 'prev2Reason',
  'prev3Name', 'prev3Position', 'prev3Reporting', 'prev3From', 'prev3To', 'prev3Salary', 'prev3Reason',
  'prev4Name', 'prev4Position', 'prev4Reporting', 'prev4From', 'prev4To', 'prev4Salary', 'prev4Reason',
];
const GENERAL_KEYS = [
  'prevTerminated', 'physicalDisability', 'nervousDisorder', 'eyeVision', 'criminalConviction', 'confidentToDrive',
];

function formatFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (typeof value[0] === 'object') {
      return value
        .map((job: Record<string, string>) =>
          [job.company, job.position, job.fromDate && job.toDate ? `${job.fromDate}–${job.toDate}` : '']
            .filter(Boolean)
            .join(' · ')
        )
        .filter(Boolean)
        .join('\n');
    }
    return value.filter(Boolean).join(', ') || '—';
  }
  return String(value);
}

function activeEntries(raw: Record<string, unknown> | undefined, keys: string[]) {
  if (!raw) return [];
  return keys
    .map((key) => [key, raw[key]] as const)
    .filter(([, val]) => val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0));
}

const StarInput = ({
  label,
  val,
  setVal,
  maxStars,
}: {
  label: string;
  val: number;
  setVal: (v: number) => void;
  maxStars: number;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">
        {val}/{maxStars}
      </span>
    </div>
    <div className="flex gap-1">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button type="button" key={star} onClick={() => setVal(star)} className="p-0.5">
          <Star
            className={cn(
              'w-7 h-7',
              star <= val ? 'fill-amber-400 text-amber-500' : 'fill-muted text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-muted/40"
      >
        {title}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-border/60">{children}</div>}
    </div>
  );
}

function FieldGrid({ entries }: { entries: ReadonlyArray<readonly [string, unknown]> }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground pt-3">Nothing recorded yet.</p>;
  }
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
      {entries.map(([key, val]) => {
        const text = formatFieldValue(val);
        const wide = text.length > 48 || text.includes('\n');
        return (
          <div key={key} className={cn('min-w-0', wide && 'sm:col-span-2')}>
            <dt className="text-xs text-muted-foreground">{formatFieldKey(key)}</dt>
            <dd className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">{text}</dd>
          </div>
        );
      })}
    </dl>
  );
}

const STAR_METRICS = [
  { key: 'attitude', label: 'Attitude', max: 4 },
  { key: 'communication', label: 'Communication', max: 3 },
  { key: 'knowledge', label: 'Knowledge', max: 3 },
] as const;

function StarReadout({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <Star
          key={star}
          className={cn(
            'w-4 h-4',
            star <= value ? 'fill-amber-400 text-amber-500' : 'fill-muted text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

function verdictClass(verdict?: string) {
  if (verdict === 'SELECTED' || verdict === 'PASS') return 'bg-success/10 text-success border-success/30';
  if (verdict === 'ON_HOLD') return 'bg-warning/10 text-warning border-warning/30';
  if (verdict === 'REJECTED' || verdict === 'FAIL') return 'bg-danger/10 text-danger border-danger/30';
  return 'bg-muted text-muted-foreground border-border';
}

export default function PublicInterviewerPage() {
  const { token } = useParams<{ token: string }>();
  const [details, setDetails] = useState<EvaluationPublicDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mobileTab, setMobileTab] = useState<'scorecard' | 'details'>('scorecard');
  const [resumeOpen, setResumeOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    profile: true,
    personal: false,
    education: false,
    employment: false,
    general: false,
    history: true,
  });

  const [verdict, setVerdict] = useState<EvaluationVerdict | null>(null);
  const [remarks, setRemarks] = useState('');
  const [attitudeScore, setAttitudeScore] = useState(0);
  const [commScore, setCommScore] = useState(0);
  const [knowledgeScore, setKnowledgeScore] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async (initial: boolean) => {
      try {
        if (initial) setLoading(true);
        const res = await getPublicEvaluation(token);
        if (cancelled) return;
        setDetails(res);
        if (res.is_already_submitted) setSubmitted(true);
      } catch (err) {
        if (!cancelled && initial) {
          setError(extractError(err, 'This evaluation link is invalid or already used.'));
        }
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };
    void load(true);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load(false);
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [token]);

  const raw = details?.candidate_raw_data;
  const personal = useMemo(() => activeEntries(raw, PERSONAL_KEYS), [raw]);
  const languages = useMemo(() => activeEntries(raw, LANGUAGE_KEYS), [raw]);
  const education = useMemo(() => activeEntries(raw, EDUCATION_KEYS), [raw]);
  const employment = useMemo(() => {
    const rows = activeEntries(raw, EMPLOYMENT_KEYS);
    if (raw?.previousJobs) rows.push(['previousJobs', raw.previousJobs]);
    return rows;
  }, [raw]);
  const general = useMemo(() => activeEntries(raw, GENERAL_KEYS), [raw]);

  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (attitudeScore === 0 || commScore === 0 || knowledgeScore === 0 || !verdict) {
      toast.error('Complete all ratings and select a verdict');
      return;
    }
    setSubmitting(true);
    try {
      await submitPublicEvaluation(token, {
        verdict,
        remarks,
        scores: {
          attitude: attitudeScore,
          communication: commScore,
          knowledge: knowledgeScore,
          total_score: attitudeScore + commScore + knowledgeScore,
          interviewer_name: details?.interviewer_name,
        },
      });
      setSubmitted(true);
      toast.success('Evaluation saved');
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PublicShell title="Interview scorecard"><PublicStatusPanel kind="loading" message="Loading the interview scorecard…" /></PublicShell>;
  }

  if (error || !details) {
    return <PublicShell title="Interview scorecard"><PublicStatusPanel kind="expired" title="Scorecard link unavailable" message={`${error || 'This scorecard link is invalid or expired.'} Ask the recruitment team for a new link if needed.`} /></PublicShell>;
  }

  if (submitted) {
    return <PublicShell title="Interview scorecard" step="Submitted"><PublicStatusPanel kind="submitted" title="Scorecard recorded" message={`Remarks for ${details.candidate_name} are saved. You can close this page.`} /></PublicShell>;
  }

  const resumeUrl = details.candidate_resume_url;
  const resumeIsPdf = Boolean(resumeUrl && /\.pdf(\?|$)/i.test(resumeUrl));

  const packet = (
    <div className="space-y-3">
      <Section title="Profile" open={openSections.profile} onToggle={() => toggle('profile')}>
        <div className="flex gap-4 pt-4">
          {details.candidate_photo_url ? (
            <img
              src={details.candidate_photo_url}
              alt=""
              className="w-20 h-24 object-cover rounded-md border border-border shrink-0"
            />
          ) : (
            <div className="w-20 h-24 rounded-md border border-dashed border-border bg-muted/40 shrink-0" />
          )}
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-foreground">{details.candidate_name}</p>
            <p className="text-sm text-muted-foreground">{details.candidate_position}</p>
            {details.candidate_experience && (
              <p className="text-sm">{details.candidate_experience}</p>
            )}
            {details.candidate_education && (
              <p className="text-sm">{details.candidate_education}</p>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          {details.candidate_current_salary && (
            <div>
              <dt className="text-xs text-muted-foreground">Current salary</dt>
              <dd className="text-sm font-medium">{details.candidate_current_salary}</dd>
            </div>
          )}
          {details.candidate_expected_salary && (
            <div>
              <dt className="text-xs text-muted-foreground">Expected salary</dt>
              <dd className="text-sm font-medium">{details.candidate_expected_salary}</dd>
            </div>
          )}
          {details.candidate_notice_period && (
            <div>
              <dt className="text-xs text-muted-foreground">Notice period</dt>
              <dd className="text-sm font-medium">{details.candidate_notice_period}</dd>
            </div>
          )}
          {details.candidate_location && (
            <div>
              <dt className="text-xs text-muted-foreground">Branch</dt>
              <dd className="text-sm font-medium">{details.candidate_location}</dd>
            </div>
          )}
        </dl>
        {resumeUrl && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setResumeOpen(true)}>
            <FileText className="w-4 h-4 mr-1.5" /> View resume
          </Button>
        )}
      </Section>

      <Section title="Personal" open={openSections.personal} onToggle={() => toggle('personal')}>
        <FieldGrid entries={[...personal, ...languages]} />
      </Section>
      <Section title="Education" open={openSections.education} onToggle={() => toggle('education')}>
        <FieldGrid entries={education} />
      </Section>
      <Section title="Employment" open={openSections.employment} onToggle={() => toggle('employment')}>
        <FieldGrid entries={employment} />
      </Section>
      <Section title="General" open={openSections.general} onToggle={() => toggle('general')}>
        <FieldGrid entries={general} />
      </Section>
      <Section title="Previous interviews" open={openSections.history} onToggle={() => toggle('history')}>
        {details.previous_remarks.length === 0 ? (
          <p className="text-sm text-muted-foreground pt-3">No prior remarks yet.</p>
        ) : (
          <ul className="space-y-3 pt-3">
            {details.previous_remarks.map((rem, i) => {
              const scores = rem.scores;
              const title = interviewTitle({
                type: rem.type as EvaluationPublicDetails['type'],
                scores,
              });
              const hasStars = STAR_METRICS.some(({ key }) => scores?.[key] != null);
              const hasTest =
                scores?.percentage != null ||
                scores?.correct_answers != null ||
                scores?.total_questions != null;
              return (
                <li key={`${rem.type}-${i}`} className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        {title}
                      </p>
                      {rem.interviewer_name ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{rem.interviewer_name}</p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        'shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                        verdictClass(rem.verdict)
                      )}
                    >
                      {(rem.verdict || '').replace(/_/g, ' ') || '—'}
                    </span>
                  </div>

                  {hasStars ? (
                    <div className="grid grid-cols-1 gap-2">
                      {STAR_METRICS.map(({ key, label, max }) => {
                        if (scores?.[key] == null) return null;
                        const value = Number(scores[key]) || 0;
                        return (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">
                              {label}{' '}
                              <span className="font-medium text-foreground">
                                {value}/{max}
                              </span>
                            </span>
                            <StarReadout value={value} max={max} />
                          </div>
                        );
                      })}
                      {scores?.total_score != null ? (
                        <p className="text-xs font-medium text-foreground">
                          Total {scores.total_score}/10
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {hasTest ? (
                    <p className="text-sm font-medium">
                      Score{' '}
                      {scores?.percentage != null
                        ? `${Math.round(Number(scores.percentage))}%`
                        : '—'}
                      {scores?.correct_answers != null && scores?.total_questions != null
                        ? ` (${scores.correct_answers}/${scores.total_questions})`
                        : ''}
                    </p>
                  ) : null}

                  {rem.remarks ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{rem.remarks}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No remarks.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );

  const scorecard = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">{defaultInterviewTitle(details.type)}</p>
        {details.interviewer_name && (
          <p className="text-sm font-medium mt-1">Interviewer: {details.interviewer_name}</p>
        )}
      </div>
      <div className="space-y-4">
        <StarInput label="Attitude" val={attitudeScore} setVal={setAttitudeScore} maxStars={4} />
        <StarInput label="Communication" val={commScore} setVal={setCommScore} maxStars={3} />
        <StarInput label="Knowledge" val={knowledgeScore} setVal={setKnowledgeScore} maxStars={3} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-2">Remarks</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Strengths, concerns, recommendation…"
          className="w-full min-h-[140px] rounded-lg border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Verdict</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['SELECTED', 'Selected', 'border-success text-success'],
              ['ON_HOLD', 'Hold', 'border-warning text-warning'],
              ['REJECTED', 'Rejected', 'border-danger text-danger'],
            ] as const
          ).map(([id, label, cls]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVerdict(id)}
              className={cn(
                'px-4 py-2 rounded-lg border text-xs font-bold uppercase',
                verdict === id ? cls : 'border-border text-muted-foreground'
              )}
            >
              {verdict === id && <Check className="w-3 h-3 inline mr-1" />}
              {label}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" isLoading={submitting}>
        Save evaluation
      </Button>
    </form>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Nippon Toyota
          </p>
          <h1 className="text-base font-semibold truncate">{details.candidate_name}</h1>
          <p className="text-xs text-muted-foreground truncate">{details.candidate_position}</p>
        </div>
        {resumeUrl && (
          <Button variant="secondary" size="sm" onClick={() => setResumeOpen(true)}>
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Resume
          </Button>
        )}
      </header>

      <div className="lg:hidden border-b border-border px-4 py-2 flex gap-2 bg-surface">
        <button
          type="button"
          onClick={() => setMobileTab('scorecard')}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-lg',
            mobileTab === 'scorecard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          Scorecard
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('details')}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-lg',
            mobileTab === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          Candidate
        </button>
      </div>

      <main className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6 p-4 lg:p-8">
        <div className={cn(mobileTab === 'details' ? 'block' : 'hidden', 'lg:block')}>{packet}</div>
        <div className={cn(mobileTab === 'scorecard' ? 'block' : 'hidden', 'lg:block')}>
          <div className="lg:sticky lg:top-6 border border-border rounded-xl bg-surface p-5">{scorecard}</div>
        </div>
      </main>

      <Modal isOpen={resumeOpen} onClose={() => setResumeOpen(false)} title="Resume" size="lg">
        <div className="flex flex-col h-[75vh]">
          {resumeUrl && (
            <div className="flex justify-end px-3 py-2 border-b border-border shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(resumeUrl, '_blank', 'noopener,noreferrer')}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download
              </Button>
            </div>
          )}
          <div className="flex-1 min-h-0 p-2">
            {resumeUrl && resumeIsPdf ? (
              <PdfViewer url={resumeUrl} />
            ) : resumeUrl ? (
              <iframe
                src={resumeEmbedUrl(resumeUrl)}
                title="Resume"
                className="w-full h-full rounded-lg border border-border"
              />
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
