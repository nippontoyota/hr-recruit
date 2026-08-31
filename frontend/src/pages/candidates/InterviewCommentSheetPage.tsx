import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, FileWarning, Home } from 'lucide-react';
import { getCandidateById } from '../../api/candidates';
import { getCandidateEvaluations } from '../../api/evaluations';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { InterviewCommentSheet } from '../../components/candidates/InterviewCommentSheet';
import { isAbortError } from '../../lib/utils';
import { downloadInterviewCommentSheetPdf } from '../../lib/generateInterviewCommentSheetPdf';
import { toast } from 'sonner';
import type { Candidate, Evaluation } from '../../types';

export default function InterviewCommentSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!candidate || !evaluation || downloading) return;
    setDownloading(true);
    try {
      await downloadInterviewCommentSheetPdf(candidate, evaluation);
    } catch (err) {
      console.error('Error generating interview comment sheet:', err);
      toast.error('Could not create the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const [candidateData, evaluations] = await Promise.all([
          getCandidateById(id, controller.signal),
          getCandidateEvaluations(id),
        ]);
        if (controller.signal.aborted) return;
        const requestedId = searchParams.get('evaluation');
        const selected = evaluations.find((item) => item.id === requestedId) || evaluations[0];
        setCandidate(candidateData || null);
        setEvaluation(selected || null);
        setError(!candidateData || !selected);
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return;
        console.error('Error loading interview comment sheet:', err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchData();
    return () => controller.abort();
  }, [id, searchParams]);

  if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

  if (error || !candidate || !evaluation) {
    return (
      <div className="p-8 bg-white text-black">
        <EmptyState
          icon={<FileWarning className="w-12 h-12 text-muted-foreground" />}
          title="Comment sheet unavailable"
          description="The candidate or interview stage could not be loaded. Go back and try again."
        />
      </div>
    );
  }

  return (
    <div className="comment-sheet-screen-wrap">
      <div className="no-print comment-sheet-toolbar">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('/candidates')} className="comment-sheet-toolbar-button comment-sheet-toolbar-primary">
            <Home className="w-3.5 h-3.5" /> Home
          </button>
          <button type="button" onClick={() => navigate(-1)} className="comment-sheet-toolbar-button">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
        <button type="button" onClick={() => void handleDownload()} disabled={downloading} className="comment-sheet-toolbar-button comment-sheet-toolbar-primary">
          <Download className="w-4 h-4" /> {downloading ? 'Creating PDF...' : 'Download PDF'}
        </button>
      </div>
      <div className="comment-sheet-preview">
        <InterviewCommentSheet candidate={candidate} evaluation={evaluation} />
      </div>
    </div>
  );
}
