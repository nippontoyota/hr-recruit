import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { FileText, ExternalLink, Download } from 'lucide-react';
import { getCandidateResume } from '../../api/candidates';
import type { ResumeDocument } from '../../types';
import { Modal, LoadingSpinner, Button, PdfViewer } from '../ui';

interface ResumeTarget {
  candidateId: string;
  candidateName: string;
}

interface ResumeViewerContextValue {
  openResume: (candidateId: string, candidateName: string) => void;
}

const ResumeViewerContext = createContext<ResumeViewerContextValue | null>(null);

function isPdfDocument(doc: ResumeDocument): boolean {
  return (
    doc.content_type === 'application/pdf' ||
    doc.file_name.toLowerCase().endsWith('.pdf')
  );
}

function ResumeViewerModal({
  target,
  onClose,
}: {
  target: ResumeTarget | null;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<ResumeDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setDoc(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);

    getCandidateResume(target.candidateId)
      .then((resume) => {
        if (!cancelled) setDoc(resume);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Failed to load resume.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title="Resume"
      size="full"
    >
      <div className="h-full min-h-[70vh] flex flex-col">
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm font-semibold text-danger text-center">{error}</p>
          </div>
        )}

        {!loading && !error && doc && isPdfDocument(doc) && (
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border shrink-0">
              <span className="text-sm font-medium text-text-primary">
                Resume Document
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(doc.download_url, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <PdfViewer url={doc.download_url} />
            </div>
          </div>
        )}

        {!loading && !error && doc && !isPdfDocument(doc) && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <FileText className="w-12 h-12 text-primary" />
            <div>
              <p className="text-lg font-semibold text-text-primary">{doc.file_name}</p>
              <p className="text-sm text-text-secondary mt-1">
                Word documents open in a new tab for preview.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => window.open(doc.download_url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Resume
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ResumeViewerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ResumeTarget | null>(null);

  const openResume = useCallback((candidateId: string, candidateName: string) => {
    setTarget({ candidateId, candidateName });
  }, []);

  return (
    <ResumeViewerContext.Provider value={{ openResume }}>
      {children}
      <ResumeViewerModal target={target} onClose={() => setTarget(null)} />
    </ResumeViewerContext.Provider>
  );
}

export function useResumeViewer() {
  const context = useContext(ResumeViewerContext);
  if (!context) {
    throw new Error('useResumeViewer must be used within ResumeViewerProvider');
  }
  return context;
}
