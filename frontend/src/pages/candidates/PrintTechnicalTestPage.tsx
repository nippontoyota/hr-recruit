import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidateById } from '../../api/candidates';
import { getDepartmentQuestions } from '../../api/evaluations';
import { LoadingSpinner, PdfViewer } from '../../components/ui';
import type { Candidate } from '../../types';

export default function PrintTechnicalTestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const data = await getCandidateById(id);
        if (data) {
          const candidate = data as Candidate;
          const dept = candidate.position_applied_for || 'Call Centre';
          const questions = await getDepartmentQuestions(dept);

          // Call our new Go Microservice (Maroto V2) to generate PDF
          const response = await fetch('/api/v1/pdf/tech-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidate: {
                full_name: candidate.full_name,
                position_applied_for: candidate.position_applied_for || 'Unknown Position'
              },
              questions: questions
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to generate PDF: ${response.statusText}`);
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load candidate or test data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-sm text-gray-500">Generating Maroto PDF...</span>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-danger">{error || 'Candidate not found'}</p>
        <button onClick={() => navigate(-1)} className="ml-4 underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
        <h1 className="font-semibold text-lg">Technical Test PDF (Maroto V2)</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm">
            Go Back
          </button>
          <a
            href={pdfUrl}
            download={`TechnicalTest_${id}.pdf`}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            Download PDF
          </a>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfViewer url={pdfUrl} />
      </div>
    </div>
  );
}
