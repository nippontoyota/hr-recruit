import { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { fetchCandidateResumeBlob, uploadCandidateResume, invalidateCandidateCache } from '../../api/candidates';
import { isAbortError, extractError } from '../../lib/utils';
import { Modal, LoadingSpinner, Button, PdfViewer, DocxViewer } from '../ui';

const MAX_RESUME_BYTES = 15 * 1024 * 1024;

interface ResumeTarget {
  candidateId: string;
  candidateName: string;
  allowReplace: boolean;
  onReplaced?: () => void;
}

interface LoadedResume {
  blob: Blob;
  blobUrl: string;
  sourceUrl: string;
  fileName: string;
  contentType: string;
}

interface OpenResumeOptions {
  allowReplace?: boolean;
  onReplaced?: () => void;
}

interface ResumeViewerContextValue {
  openResume: (candidateId: string, candidateName: string, options?: OpenResumeOptions) => void;
}

const ResumeViewerContext = createContext<ResumeViewerContextValue | null>(null);

function isPdfContent(contentType?: string, fileName?: string): boolean {
  const ct = (contentType || '').toLowerCase();
  const fn = (fileName || '').toLowerCase();
  return ct.includes('pdf') || fn.endsWith('.pdf') || fn.includes('.pdf?');
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
  const [replacing, setReplacing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const blobUrlRef = useRef<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

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
        setResume({ blob, blobUrl, sourceUrl, fileName, contentType });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        const message = err instanceof Error ? err.message : 'Failed to load resume.';
        if (!message) return;
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      revokeBlobUrl();
    };
  }, [target, reloadToken, revokeBlobUrl]);

  const handleDownload = () => {
    if (!resume) return;
    const link = document.createElement('a');
    link.href = resume.blobUrl;
    link.download = resume.fileName;
    link.click();
  };

  const handleReplaceClick = () => {
    replaceInputRef.current?.click();
  };

  const handleReplaceSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !target) return;

    if (file.size > MAX_RESUME_BYTES) {
      toast.error('Resume must be under 15MB');
      return;
    }

    setReplacing(true);
    toast.loading('Uploading replacement resume...', { id: 'resume-replace' });
    try {
      await uploadCandidateResume(target.candidateId, file);
      invalidateCandidateCache(target.candidateId);
      toast.success('Resume replaced', { id: 'resume-replace' });
      setReloadToken((n) => n + 1);
      target.onReplaced?.();
    } catch (err) {
      toast.error(extractError(err, 'Failed to replace resume'), { id: 'resume-replace' });
    } finally {
      setReplacing(false);
    }
  };

  const replaceControl = target?.allowReplace ? (
    <>
      <Button variant="secondary" size="sm" onClick={handleReplaceClick} isLoading={replacing} disabled={replacing}>
        <Upload className="w-4 h-4 mr-2" />
        Replace resume
      </Button>
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleReplaceSelect}
        className="hidden"
      />
    </>
  ) : null;

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
              <div className="flex items-center gap-2 shrink-0">
                {replaceControl}
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto relative p-4 flex justify-center bg-slate-200">
              <PdfViewer blob={resume.blob} url={resume.blobUrl} className="max-w-[210mm]" />
            </div>
          </div>
        )}

        {!loading && !error && resume && !isPdfContent(resume.contentType, resume.fileName) && (
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border shrink-0">
              <span className="text-sm font-medium text-text-primary truncate pr-4">
                {resume.fileName}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {replaceControl}
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto relative p-4 flex justify-center bg-slate-200">
              <DocxViewer blob={resume.blob} className="max-w-[210mm] shadow-lg rounded" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ResumeViewerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ResumeTarget | null>(null);

  const openResume = useCallback((candidateId: string, candidateName: string, options?: OpenResumeOptions) => {
    setTarget({ candidateId, candidateName, allowReplace: options?.allowReplace ?? true, onReplaced: options?.onReplaced });
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
      openResume: (() => {
        console.error('Resume viewer context not found. Please refresh the page.');
      }) as ResumeViewerContextValue['openResume'],
    };
  }
  return context;
}
