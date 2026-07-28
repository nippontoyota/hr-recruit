import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ShieldAlert, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, LoadingSpinner } from '../../components/ui';
import { PublicShell } from '../../components/layout/PublicShell';
import { getPublicTestQuestions, submitPublicTest } from '../../api/evaluations';
import { cn, extractError } from '../../lib/utils';
import { toast } from 'sonner';

interface Question {
  id: string;
  text: string;
  options: Record<string, string>;
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

  // Test state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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
    } catch (err: any) {
      setError(extractError(err, 'This technical test link is invalid, expired, or has already been used.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qid: string, optKey: string) => {
    setAnswers(prev => ({ ...prev, [qid]: optKey }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      toast.warning(`You have answered ${answeredCount} of ${questions.length} questions. Please answer all questions before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPublicTest(token, answers);
      setResult(res);
      setSubmitted(true);
      toast.success('Technical test submitted successfully!');
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit test'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-muted/5 flex flex-col">
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-3xl bg-surface sm:border-l-[3px] sm:border-r-[3px] border-dashed border-primary/40 min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-5">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight">Test Link Invalid</h3>
            <p className="text-base text-muted-foreground mt-3 max-w-md">
              {error || 'This technical test is no longer available, or has already been submitted.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-muted/5 flex flex-col">
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-3xl bg-surface sm:border-l-[3px] sm:border-r-[3px] border-dashed border-primary/40 min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-6 shadow-sm border border-success/20">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-bold text-foreground tracking-tight mb-3">Test Submitted</h3>
            <p className="text-base text-muted-foreground max-w-md mb-10 leading-relaxed">
              Your responses have been securely logged in the system. You may now close this page.
            </p>
            
            <div className="bg-muted/30 border border-border/50 p-6 rounded-2xl w-full max-w-sm space-y-4">
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
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const selectedOpt = answers[q.id];

  return (
    <div className="min-h-screen bg-muted/5 flex flex-col">
      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-3xl bg-surface sm:border-l-[3px] sm:border-r-[3px] border-dashed border-primary/40 min-h-screen flex flex-col">
          
          {/* Progress Header */}
          <div className="bg-surface px-6 py-5 flex justify-between items-center text-xs font-bold text-muted-foreground border-b border-border/40">
            <span className="tracking-widest">QUESTION {currentIdx + 1} OF {questions.length}</span>
            <div className="flex gap-1 w-32 sm:w-48 bg-muted/60 h-2 rounded-full overflow-hidden border border-border/50">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Block */}
          <div className="p-6 sm:p-10 flex-1 space-y-8">
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

          {/* Actions Footer */}
          <div className="bg-surface px-6 sm:px-10 py-5 border-t border-border/40 flex justify-between items-center">
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
                onClick={handleSubmit}
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
  );
}
