import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ShieldAlert, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, LoadingSpinner } from '../../components/ui';
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-border p-8 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="w-14 h-14 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Test Link Invalid</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {error || 'This technical test is no longer available, or has already been submitted.'}
          </p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nippon Toyota — HR Team</p>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-success/20 p-8 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="w-14 h-14 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-success">Test Submitted Successfully</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Thank you for completing the technical test. Your responses have been graded and logged in the system.
          </p>
          <div className="bg-muted/40 border border-border p-4 rounded-xl mb-6 text-xs w-full">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Department:</span>
              <strong className="text-foreground">{department}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Test Result:</span>
              <strong className={cn("font-bold uppercase", result.verdict === 'PASS' ? "text-success" : "text-danger")}>
                {result.verdict} ({result.score})
              </strong>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nippon Toyota — HR Team</p>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const selectedOpt = answers[q.id];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Test Page Header */}
      <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">NT</div>
          <h1 className="font-bold text-base text-foreground tracking-tight">Nippon Toyota — Technical Assessment</h1>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase">
          {department} DEPARTMENT
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/10">
        <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-md overflow-hidden flex flex-col">
          
          {/* Progress Header */}
          <div className="bg-sidebar px-6 py-4 border-b border-border flex justify-between items-center text-xs font-semibold text-muted-foreground">
            <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
            <div className="flex gap-1 w-32 bg-muted h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Block */}
          <div className="p-6 sm:p-8 flex-1 space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug flex gap-2">
              <span className="text-primary">{currentIdx + 1}.</span>
              {q.text}
            </h3>

            <div className="space-y-3">
              {Object.entries(q.options).map(([optKey, optVal]) => {
                const isSelected = selectedOpt === optKey;
                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(q.id, optKey)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border border-border bg-background/50 hover:bg-muted/30 transition-all duration-200 flex items-center gap-3 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none",
                      isSelected && "border-primary bg-primary/5 text-primary"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0 font-bold",
                      isSelected ? "bg-primary border-transparent text-primary-foreground" : "bg-muted"
                    )}>
                      {optKey.toUpperCase()}
                    </span>
                    {optVal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="bg-sidebar px-6 py-4 border-t border-border flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="border border-border text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="text-xs"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                isLoading={submitting}
                className="text-xs"
              >
                Submit Test
              </Button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
