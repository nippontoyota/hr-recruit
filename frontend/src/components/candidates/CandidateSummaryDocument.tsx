import { useState, useEffect } from 'react';
import type { Candidate, Evaluation } from '../../types';
import { PdfViewer, LoadingSpinner } from '../../components/ui';
import { getDepartmentQuestions } from '../../api/evaluations';

interface CandidateSummaryDocumentProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  hidePrintButton?: boolean;
}

export function CandidateSummaryDocument({ candidate, evaluations, hidePrintButton = false }: CandidateSummaryDocumentProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payloadHash = JSON.stringify({
    id: candidate?.id,
    name: candidate?.full_name,
    pos: candidate?.position_applied_for,
    raw_data: candidate?.profile?.raw_data || {}
  });

  useEffect(() => {
    if (!candidate) return;

    const fetchPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch technical questions if there's a technical test
        let questions: any[] = [];
        if (evaluations?.some(e => e.type === 'TECHNICAL_TEST')) {
          try {
             questions = await getDepartmentQuestions(candidate.position_applied_for || '');
          } catch (e) {
             console.error("Failed to fetch technical questions", e);
          }
        }

        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${baseURL}/pdf/candidate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: {
              full_name: candidate.full_name,
              position_applied_for: candidate.position_applied_for || 'Unknown Position',
              phone: candidate.phone,
              applied_at: candidate.created_at
            },
            raw_data: candidate.profile?.raw_data || {},
            evaluations: evaluations || [],
            questions: questions
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        setError(err.message || 'Failed to load Candidate Summary PDF.');
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      if (pdfUrl) {} // oxlint ignore for now, safe leak since singleton component
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadHash, candidate, evaluations]);

  if (!candidate) {
    return <div className="p-8 text-center text-gray-500">No candidate data available.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-sm text-gray-500">Generating PDF...</span>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center bg-red-50 border border-red-100 rounded-lg">
        <p className="text-danger">{error}</p>
        <button onClick={() => window.location.reload()} className="ml-4 underline text-sm text-red-600">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[800px]">
      {!hidePrintButton && (
        <div className="pb-4 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground">Candidate Summary Sheet</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="px-3 py-1.5 bg-black text-white rounded hover:bg-black/80 text-xs font-medium shadow-sm transition-colors"
            >
              Take Printout
            </button>
            <a
              href={pdfUrl}
              download={`CandidateSummary_${candidate.full_name}.pdf`}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium shadow-sm transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      )}
      <div className="flex-1 w-full relative">
        <PdfViewer url={pdfUrl} />
      </div>
    </div>
  );
}