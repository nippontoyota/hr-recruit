import { useState, useEffect, useMemo } from 'react';
import type { Candidate, Evaluation } from '../../types';
import { PdfViewer, LoadingSpinner } from '../../components/ui';
import { getDepartmentQuestions } from '../../api/evaluations';
import { useAuth } from '../../auth/AuthContext';

interface CandidateSummaryDocumentProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  hidePrintButton?: boolean;
}

export function CandidateSummaryDocument({ candidate, evaluations, hidePrintButton = false }: CandidateSummaryDocumentProps) {
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avoid regenerating the PDF every time the candidate object reference changes during background polling.
  // We only track the core identifying data that would require a new PDF if changed.
  const payloadHash = useMemo(() => {
    return JSON.stringify({
      id: candidate?.id,
      name: candidate?.full_name,
      pos: candidate?.position_applied_for,
      // The backend attaches ?t=<timestamp> to photo_url which changes on every poll.
      // We must strip it out so the hash remains stable!
      photo: candidate?.profile?.photo_url?.split('?')[0],
      // We rely on the `updated_at` timestamp of the candidate instead to know if data actually changed.
      updated_at: (candidate as any)?.updated_at || candidate?.created_at,
      evals_count: evaluations?.length,
      evals_hash: evaluations?.map(e => `${e.id}-${e.verdict}`).join(',')
    });
  }, [candidate, evaluations]);

  useEffect(() => {
    if (!candidate) return;
    
    // If we already have a pdfUrl and the hash hasn't changed, don't regenerate.
    // The dependency array ensures this effect only runs when payloadHash changes.

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
              applied_at: candidate.created_at,
              photo_url: candidate.profile?.photo_url
            },
            raw_data: candidate.profile?.raw_data || {},
            evaluations: evaluations || [],
            questions: questions
          })
        });

        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error(err);
        setError('Could not load candidate summary document.');
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      // Intentionally not revoking object URL immediately to prevent flickering on quick re-renders
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadHash]);

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
        {user?.role !== 'LOCAL_HR' && candidate.salary_data && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-md p-4">
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-3">Salary Annexure Data</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(candidate.salary_data).map(([key, value]) => {
                if (key.toLowerCase().includes('id') || key.toLowerCase().includes('email')) return null;
                return (
                  <div key={key}>
                    <p className="text-xs text-emerald-600 font-semibold">{key}</p>
                    <p className="text-sm text-emerald-900">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <PdfViewer url={pdfUrl} />
      </div>
    </div>
  );
}