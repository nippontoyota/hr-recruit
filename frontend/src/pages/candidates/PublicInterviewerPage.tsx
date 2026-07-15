import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react';
import { Button, LoadingSpinner } from '../../components/ui';
import { getPublicEvaluation, submitPublicEvaluation } from '../../api/evaluations';
import type { EvaluationPublicDetails, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { toast } from 'sonner';

export default function PublicInterviewerPage() {
  const { token } = useParams<{ token: string }>();
  const [details, setDetails] = useState<EvaluationPublicDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [verdict, setVerdict] = useState<EvaluationVerdict>('SELECTED');
  const [remarks, setRemarks] = useState('');
  const [techScore, setTechScore] = useState(0);
  const [commScore, setCommScore] = useState(0);
  const [expScore, setExpScore] = useState(0);
  const [fitScore, setFitScore] = useState(0);

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchDetails = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getPublicEvaluation(token);
      setDetails(res);
    } catch (err: any) {
      setError(extractError(err, 'This evaluation link is invalid, expired, or has already been used.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!remarks.trim()) {
      toast.error('Please fill in your evaluation remarks');
      return;
    }
    setSubmitting(true);
    try {
      await submitPublicEvaluation(token, {
        verdict,
        remarks,
        scores: {
          technical: techScore,
          communication: commScore,
          experience: expScore,
          cultural_fit: fitScore
        }
      });
      setSubmitted(true);
      toast.success('Evaluation scorecard submitted successfully');
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ label, val, setVal }: { label: string; val: number; setVal: (v: number) => void }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setVal(star)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-all duration-200",
                star <= val ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" : "fill-muted text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-border p-8 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="w-14 h-14 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Link Expired or Invalid</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {error || 'This evaluation link has expired, already been completed, or is invalid. Please ask Branch HR for a new evaluation link.'}
          </p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nippon Toyota — HR Team</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-success/20 p-8 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="w-14 h-14 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-success">Scorecard Submitted!</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Thank you! Your scorecard remarks for <strong className="text-foreground">{details.candidate_name}</strong> have been recorded successfully.
          </p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nippon Toyota — HR Team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brand Header */}
      <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">NT</div>
          <h1 className="font-bold text-base text-foreground tracking-tight">Nippon Toyota — Interviewer Evaluation</h1>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase">
          {details.type.replace(/_/g, ' ')}
        </span>
      </header>

      {/* Main split dashboard layout */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 p-6 overflow-hidden">
        
        {/* LEFT: Candidate Context & Prior Remarks */}
        <div className="flex flex-col gap-6 overflow-y-auto">
          {/* Candidate Card */}
          <div className="border border-border bg-surface/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-4">Candidate Profile</h2>
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <span className="text-muted-foreground block mb-0.5">Full Name</span>
                <strong className="text-foreground text-sm">{details.candidate_name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Position Applied</span>
                <strong className="text-foreground text-sm">{details.candidate_position}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Total Experience</span>
                <strong className="text-foreground text-sm">{details.candidate_experience || 'Fresher'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Highest Qualification</span>
                <strong className="text-foreground text-sm">{details.candidate_education || 'N/A'}</strong>
              </div>
            </div>
            
            {details.candidate_resume_url && (
              <div className="border-t border-border/50 pt-4 mt-2">
                <Button variant="ghost" size="sm" className="border border-border shadow-xs text-xs font-bold" onClick={() => window.open(details.candidate_resume_url, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Resume in New Tab
                </Button>
              </div>
            )}
          </div>

          {/* Prior Remarks Timeline */}
          <div className="border border-border bg-surface/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-4">Prior Evaluations History</h2>
            {details.previous_remarks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3">No prior interview remarks recorded for this candidate.</p>
            ) : (
              <div className="space-y-4">
                {details.previous_remarks.map((rem, i) => (
                  <div key={i} className="bg-background border border-border/60 p-4 rounded-xl text-xs space-y-2 relative">
                    <div className="flex justify-between items-center font-bold text-foreground border-b border-border/40 pb-1.5">
                      <span>{rem.type ? rem.type.replace(/_/g, ' ') : ''}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] uppercase border", 
                        rem.verdict === 'SELECTED' || rem.verdict === 'PASS' ? "bg-success/10 text-success border-success/20" : 
                        rem.verdict === 'ON_HOLD' ? "bg-warning/10 text-warning border-warning/20" : 
                        "bg-danger/10 text-danger border-danger/20"
                      )}>
                        {rem.verdict}
                      </span>
                    </div>
                    <p className="text-muted-foreground italic">"{rem.remarks}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Scorecard Entry Form */}
        <div className="border border-border bg-surface/50 rounded-2xl p-6 shadow-sm overflow-y-auto flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-lg font-bold text-foreground">Scorecard Submission</h2>
            <p className="text-xs text-muted-foreground">Rate the candidate's core metrics based on your interview session.</p>

            <div className="grid grid-cols-2 gap-6">
              <StarRating label="Technical Skills" val={techScore} setVal={setTechScore} />
              <StarRating label="Communication" val={commScore} setVal={setCommScore} />
              <StarRating label="Experience & Fit" val={expScore} setVal={setExpScore} />
              <StarRating label="Cultural Fit" val={fitScore} setVal={setFitScore} />
            </div>

            <div className="h-px w-full bg-border" />

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 text-xs">
                <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Interviewer Verdict</label>
                <select value={verdict} onChange={(e) => setVerdict(e.target.value as EvaluationVerdict)} className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20">
                  <option value="SELECTED">Selected / Recommended</option>
                  <option value="ON_HOLD">Put On Hold</option>
                  <option value="REJECTED">Reject Candidate</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Evaluation Remarks <span className="text-danger">*</span></label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} required placeholder="Provide a detailed summary of candidate strengths, gaps, and technical competence..." className="w-full min-h-[140px] bg-background border border-border rounded-xl p-4 focus:ring-2 focus:ring-primary/20 resize-y" />
            </div>

            <div className="pt-4 border-t border-border">
              <Button type="submit" variant="primary" className="w-full shadow-sm" isLoading={submitting}>
                Submit Scorecard
              </Button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
