import { useEffect, useState, useRef } from 'react';
import { usePrint } from '../../hooks/usePrint';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidateById } from '../../api/candidates';
import { getDepartmentQuestions } from '../../api/evaluations';
import { LoadingSpinner } from '../../components/ui';
import { Home, ArrowLeft } from 'lucide-react';
import type { Candidate } from '../../types';
import { isAbortError } from '../../lib/utils';

export default function PrintTechnicalTestPage() {
  const { id } = useParams();
  const componentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = usePrint({
    contentRef: componentRef,
    documentTitle: `TechnicalTest`,
  });
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const data = await getCandidateById(id, controller.signal);
        if (controller.signal.aborted) return;
        if (data) {
          setCandidate(data as Candidate);
          const qs = await getDepartmentQuestions({ candidateId: data.id });
          if (controller.signal.aborted) return;
          setQuestions(qs);
        }
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError('Failed to load candidate or test data.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!loading && candidate && questions.length > 0) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, candidate, questions, handlePrint]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-danger">{error || 'Candidate not found'}</p>
        <button onClick={() => navigate(-1)} className="ml-4 underline">Go Back</button>
      </div>
    );
  }

  return (
    <div ref={componentRef} className="bg-white min-h-screen font-sans text-black print-container print:p-0 p-8 flex flex-col items-center">
      <div className="w-[800px] max-w-full">
        {/* Non-printing navigation bar */}
        <div className="no-print mb-4 p-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/candidates')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075E54] text-white hover:bg-[#064e46] font-bold text-xs shadow-xs"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50 text-gray-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
          <button
            onClick={() => handlePrint()}
            className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800"
          >
            Print Test Paper
          </button>
        </div>

        {/* Header Block */}
        <div className="flex justify-between items-start mb-1 relative">
          {/* Logo / Company Name */}
          <div className="pt-0">
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-0">
              TOYOTA
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 leading-tight">
              Motor Corporation
            </h2>
            <p className="text-[9px] mt-1 italic text-gray-600">
              *candidates with one year experience and above
            </p>
          </div>

          {/* Right Info Box */}
          <div className="border-[2px] border-black w-[220px]">
            <div className="border-b-[2px] border-black text-center font-bold py-0 bg-gray-100 text-xs">
              Series B
            </div>
            <div className="border-b-[2px] border-black text-center font-bold py-0 text-[10px]">
              Version 2020.1
            </div>
            <div className="px-2 py-0 border-b border-black text-[10px] flex gap-1">
              <span className="font-semibold">Date:</span>
              <span className="flex-1 border-b border-gray-400 mt-2"></span>
            </div>
            <div className="px-2 py-0 text-[10px] flex gap-1">
              <span className="font-semibold">Time:</span>
              <span className="flex-1 border-b border-gray-400 mt-2"></span>
            </div>
          </div>
        </div>

        {/* HR Title */}
        <div className="border-b-[2px] border-black pb-0.5 mb-1 text-center">
          <h2 className="text-[12px] font-bold uppercase">Human Resources Department</h2>
        </div>

        {/* Candidate Info */}
        <div className="border-b-[2px] border-black pb-0.5 mb-1">
          <div className="flex text-[11px] mb-0.5 px-1">
            <span className="font-semibold mr-2 whitespace-nowrap">Name of the Candidate:</span>
            <span className="flex-1 font-medium font-sans uppercase border-b border-gray-400 leading-tight flex items-end">
              {candidate.full_name}
            </span>
          </div>
          <div className="flex text-[11px] px-1">
            <span className="font-semibold mr-2 whitespace-nowrap">Position Applied For:</span>
            <span className="flex-1 font-medium font-sans uppercase border-b border-gray-400 leading-tight flex items-end">
              {candidate.position_applied_for}
            </span>
          </div>
        </div>

        {/* Paper Title */}
        <div className="border-b-[2px] border-black pb-0.5 mb-1 text-center">
          <h3 className="text-[12px] font-bold">Question Paper - {candidate.position_applied_for || candidate.department || 'Technical Test'}</h3>
        </div>

        {/* Questions Table */}
        <table className="w-full border-collapse border-[2px] border-black text-[13px] leading-snug">
          <thead>
            <tr className="border-b-[2px] border-black">
              <th className="border-r-[2px] border-black w-10"></th>
              <th className="border-r-[2px] border-black text-left p-1"></th>
              <th className="border-r-[2px] border-black w-16 text-center font-bold text-[11px] leading-tight p-1 bg-gray-50">
                Max.<br />Marks
              </th>
              <th className="w-20 text-center font-bold text-[11px] leading-tight p-1 bg-gray-50">
                Marks<br />Obtained
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => (
              <tr key={q.id} className="border-b-[2px] border-black">
                <td className="border-r-[2px] border-black text-center align-top pt-1 font-medium">
                  {idx + 1}
                </td>
                <td className="border-r-[2px] border-black p-1 align-top">
                  <div className="font-bold mb-1">{q.text}</div>
                  {Object.keys(q.options || {}).length > 0 ? (
                    <div className="pl-1 text-xs">
                      {Object.entries(q.options).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex gap-1.5 items-start mb-0.5">
                          <span className="font-medium">{k.toUpperCase()}.</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-6"></div>
                  )}
                </td>
                <td className="border-r-[2px] border-black text-center align-middle font-bold text-[14px]">
                  1
                </td>
                <td className="text-center align-middle">
                  {/* Blank space for handwriting */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
