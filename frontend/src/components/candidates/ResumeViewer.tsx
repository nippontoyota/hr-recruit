import { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { fetchCandidateResumeBlob } from '../../api/candidates';
import { resumeEmbedUrl } from '../../lib/utils';
import { Modal, LoadingSpinner, Button, PdfViewer } from '../ui';

interface ResumeTarget {
  candidateId: string;
  candidateName: string;
}

interface LoadedResume {
  blobUrl: string;
  sourceUrl: string;
  fileName: string;
  contentType: string;
}

interface ResumeViewerContextValue {
  openResume: (candidateId: string, candidateName: string) => void;
}

const ResumeViewerContext = createContext<ResumeViewerContextValue | null>(null);

function isPdfContent(contentType: string, fileName: string): boolean {
  return (
    contentType === 'application/pdf' ||
    fileName.toLowerCase().endsWith('.pdf')
  );
}

function ResumeViewerModal({
  target,
  onClose,
}: {
  target: ResumeTarget | null;
  onClose: () => void;
}) {
  const [resume, setResume] = useState<LoadedResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!target) {
      revokeBlobUrl();
      setResume(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    revokeBlobUrl();
    setLoading(true);
    setError(null);
    setResume(null);

    fetchCandidateResumeBlob(target.candidateId, controller.signal)
      .then(({ blob, fileName, contentType, sourceUrl }) => {
        if (controller.signal.aborted) return;
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setResume({ blobUrl, sourceUrl, fileName, contentType });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load resume.';
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      revokeBlobUrl();
    };
  }, [target, revokeBlobUrl]);

  const handleDownload = () => {
    if (!resume) return;
    const link = document.createElement('a');
    link.href = resume.blobUrl;
    link.download = resume.fileName;
    link.click();
  };

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title="Resume"
      size="full"
    >
      <div className="h-full min-h-[70vh] flex flex-col">
        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-text-secondary">Loading resume…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm font-semibold text-danger text-center">{error}</p>
          </div>
        )}

        {!loading && !error && resume && isPdfContent(resume.contentType, resume.fileName) && (
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border shrink-0">
              <span className="text-sm font-medium text-text-primary truncate pr-4">
                {resume.fileName}
              </span>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <PdfViewer url={resume.blobUrl} />
            </div>
          </div>
        )}

        {!loading && !error && resume && !isPdfContent(resume.contentType, resume.fileName) && (
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border shrink-0">
              <span className="text-sm font-medium text-text-primary truncate pr-4">
                {resume.fileName}
              </span>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <iframe
                src={resumeEmbedUrl(resume.sourceUrl)}
                title="Resume"
                className="w-full h-full min-h-[70vh]"
              />
            </div>
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

  const contextValue = useMemo(() => ({ openResume }), [openResume]);

  return (
    <ResumeViewerContext.Provider value={contextValue}>
      {children}
      <ResumeViewerModal target={target} onClose={() => setTarget(null)} />
    </ResumeViewerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useResumeViewer() {
  const context = useContext(ResumeViewerContext);
  if (!context) {
    console.error('useResumeViewer must be used within ResumeViewerProvider. If you are in development, this is likely an HMR artifact.');
    return {
      openResume: () => {
        console.error('Resume viewer context not found. Please refresh the page.');
      },
    };
  }
  return context;
}
