import { useState, useEffect } from 'react';
import type { Candidate, Evaluation } from '../../types';
import { PdfViewer, LoadingSpinner } from '../../components/ui';

interface CandidateSummaryDocumentProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  hidePrintButton?: boolean;
}

export function CandidateSummaryDocument({ candidate, hidePrintButton = false }: CandidateSummaryDocumentProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidate) return;

    const fetchPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/pdf/candidate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: {
              full_name: candidate.full_name,
              position_applied_for: candidate.position_applied_for || 'Unknown Position'
            },
            raw_data: candidate.profile?.raw_data || {}
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
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [candidate]);

  if (!candidate) {
    return <div className="p-8 text-center text-gray-500">No candidate data available.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center bg-gray-50 border rounded-lg">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-sm text-gray-500">Generating Maroto PDF...</span>
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
    <div className="bg-gray-100 border rounded-lg overflow-hidden flex flex-col" style={{ height: '800px' }}>
      {!hidePrintButton && (
        <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
          <h2 className="font-semibold text-gray-800">Candidate Summary PDF (Maroto V2)</h2>
          <a
            href={pdfUrl}
            download={`CandidateSummary_${candidate.full_name}.pdf`}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            Download PDF
          </a>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative">
        <PdfViewer url={pdfUrl} />
      </div>
    </div>
  );
}