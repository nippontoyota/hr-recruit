import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { Button } from '../../components/ui';
import { getPublicTestQuestions, submitPublicTest } from '../../api/evaluations';
import { cn, extractError, isAbortError } from '../../lib/utils';
import { toast } from 'sonner';
import { PublicShell } from '../../components/layout/PublicShell';
import { PublicStatusPanel } from '../../components/candidates/PublicStatusPanel';

interface Question {
  id: string;
  text: string;
  options: Record<string, string>;
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PublicTestPage() {
  const { token } = useParams<{ token: string }>();
  const [department, setDepartment] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ verdict: string; score: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchQuestions = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getPublicTestQuestions(token);
      setDepartment(res.department);
      setQuestions(res.questions);
      if (res.expires_at) {
        setDeadline(new Date(res.expires_at));
      } else if (res.duration_seconds) {
        setDeadline(new Date(Date.now() + res.duration_seconds * 1000));
      }
    } catch (err: any) {
      if (isAbortError(err)) return;
      setError(extractError(err, 'This technical test link is invalid, expired, or has already been used.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async (allowPartial = false) => {
    if (!token || submitting || submitted) return;
    const answeredCount = Object.keys(answers).length;
    if (!allowPartial && answeredCount < questions.length) {
      toast.warning(`You have answered ${answeredCount} of ${questions.length} questions. Please answer all questions before submitting.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitPublicTest(token, answers);
      setResult(res);
      setSubmitted(true);
      toast.success('Technical test submitted successfully!');
    } catch (err) {
      const message = extractError(err, 'Failed to submit test. Your answers are still on this page; please retry.');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [token, submitting, submitted, answers, questions.length]);

  useEffect(() => {
    if (!deadline || submitted) return;

    const tick = () => {
      const left = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        toast.warning('Time is up. Submitting your test…');
        handleSubmit(true);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, submitted, handleSubmit]);

  const handleSelectOption = (qid: string, optKey: string) => {
    setAnswers(prev => ({ ...prev, [qid]: optKey }));
  };

  /*  */if (loading) {
    return <PublicShell title="Technical test"><PublicStatusPanel kind="loading" message="Loading your technical test…" /></PublicShell>;
  }

  if (error || questions.length === 0) {
    return <PublicShell title="Technical test"><PublicStatusPanel kind="expired" title="Technical test unavailable" message={`${error || 'This test is no longer available, or has already been submitted.'} Ask your HR recruiter for a fresh link if needed.`} actionLabel="Try again" onAction={() => { setError(null); void fetchQuestions(); }} /></PublicShell>;
  }

  if (submitted && result) {
    return (
      <PublicShell title="Technical test" step="Submitted">
        <PublicStatusPanel kind="submitted" title="Technical test submitted" message="Your responses have been securely logged. You may now close this page." />
        <div className="page-card mx-auto mt-4 w-full max-w-sm space-y-4 p-6">
              <div className="flex justify-between items-center border-b border-border/40 pb-3">
                <span className="text-sm font-medium text-muted-foreground">Department</span>
                <strong className="text-sm font-bold text-foreground uppercase">{department}</strong>
              </div>
              
              {result.verdict && result.score && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Result</span>
                  <strong className={cn("text-sm font-bold uppercase px-3 py-1 rounded-full", result.verdict === 'PASS' ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                    {result.verdict} ({result.score})
                  </strong>
                </div>
              )}
        </div>
      </PublicShell>
    );
  }

  const q = questions[currentIdx];
  const selectedOpt = answers[q.id];
  const timerDisplay = secondsLeft !== null ? formatTimer(secondsLeft) : '08:00';
  const timerUrgent = secondsLeft !== null && secondsLeft <= 60;

  return (
    <PublicShell title="Technical test" step={`Question ${currentIdx + 1} of ${questions.length}`} maxWidth="2xl">
      <div className="flex flex-col items-center">
        <div className="w-full max-w-3xl bg-surface sm:border-l-[3px] sm:border-r-[3px] border-dashed border-primary/40 min-h-screen flex flex-col">
          
          <div className="bg-surface px-4 sm:px-6 py-4 flex justify-between items-center gap-3 text-xs font-bold text-muted-foreground border-b border-border/40">
            <span className="tracking-widest shrink-0">QUESTION {currentIdx + 1} OF {questions.length}</span>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="hidden text-xs font-semibold text-text-secondary sm:inline">{questions.length - Object.keys(answers).length} unanswered</span>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-sm tabular-nums shrink-0',
                  timerUrgent
                    ? 'border-danger/40 bg-danger/10 text-danger'
                    : 'border-border/60 bg-muted/30 text-foreground'
                )}
                aria-label="Time remaining"
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>{timerDisplay}</span>
              </div>
              <div className="flex gap-1 w-24 sm:w-48 bg-muted/60 h-2 rounded-full overflow-hidden border border-border/50 shrink-0">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 flex-1 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-text-secondary">
              <span>Answered {Object.keys(answers).length} of {questions.length}</span>
              {secondsLeft !== null && secondsLeft <= 120 && <strong className="text-warning">Less than two minutes remain. Submit when ready.</strong>}
            </div>
            <nav aria-label="Question navigator" className="flex flex-wrap gap-2">
              {questions.map((question, index) => <button key={question.id} type="button" aria-label={`Go to question ${index + 1}`} aria-current={index === currentIdx ? 'step' : undefined} onClick={() => setCurrentIdx(index)} className={cn('h-8 w-8 rounded-md border text-xs font-semibold', index === currentIdx ? 'border-primary bg-primary text-primary-foreground' : answers[question.id] ? 'border-success/50 bg-success/10 text-success' : 'border-border text-text-secondary')}>{index + 1}</button>)}
            </nav>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug flex gap-3">
              <span className="text-primary">{currentIdx + 1}.</span>
              {q.text}
            </h3>

            <div className="space-y-4">
              {Object.keys(q.options).length > 0 ? (
                Object.entries(q.options).map(([optKey, optVal]) => {
                  const isSelected = selectedOpt === optKey;
                  return (
                    <button
                      key={optKey}
                      type="button"
                      onClick={() => handleSelectOption(q.id, optKey)}
                      className={cn(
                        "w-full text-left p-5 rounded-2xl border bg-surface hover:bg-muted/20 transition-all duration-200 flex items-center gap-4 text-sm sm:text-base font-semibold focus:outline-none",
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary shadow-sm" 
                          : "border-border/60 text-text-primary hover:border-border"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center text-[11px] shrink-0 font-bold transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-muted/50 border-border text-text-secondary"
                      )}>
                        {optKey.toUpperCase()}
                      </span>
                      {optVal}
                    </button>
                  );
                })
              ) : (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full h-48 p-5 bg-surface border border-border/60 rounded-2xl text-base focus:ring-2 focus:ring-primary/20 transition-all focus:outline-none resize-none font-medium text-foreground placeholder:text-muted-foreground/60 shadow-inner"
                  placeholder="Type your answer here..."
                />
              )}
            </div>
          </div>

          <div className="bg-surface px-6 sm:px-10 py-5 border-t border-border/40 flex flex-col gap-3">
            {submitError && <PublicStatusPanel kind="retry" message={`${submitError} Your answers have not been cleared.`} actionLabel="Retry submit" onAction={() => void handleSubmit(true)} />}
            <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="border border-border/60 text-sm font-semibold h-11 px-5 rounded-xl hover:bg-muted/30"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Previous
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="text-sm font-bold h-11 px-7 rounded-xl shadow-md"
              >
                Next <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSubmit(false)}
                isLoading={submitting}
                className="text-sm font-bold h-11 px-7 rounded-xl shadow-md"
              >
                Submit Test
              </Button>
            )}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
