import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { LoadingSpinner } from './LoadingSpinner';

interface DocxViewerProps {
  blob: Blob;
  className?: string;
}

export function DocxViewer({ blob, className = '' }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!blob || !containerRef.current) return;

    setRendering(true);
    setError(null);
    containerRef.current.innerHTML = '';

    renderAsync(blob, containerRef.current, undefined, {
      className: 'docx-preview-doc',
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      useBase64URL: true,
    })
      .then(() => {
        if (!active) return;
        setRendering(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to render document.';
        setError(msg);
        setRendering(false);
      });

    return () => {
      active = false;
    };
  }, [blob]);

  return (
    <div className={`docx-viewer-root relative w-full bg-slate-100 flex flex-col items-center min-h-[300px] ${className}`}>
      {rendering && (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
          <LoadingSpinner size="md" />
          <p className="text-xs font-medium">Rendering document…</p>
        </div>
      )}
      {error && (
        <div className="py-8 text-center text-xs text-danger font-medium">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="docx-render-container w-full flex flex-col items-center gap-4 [&_.docx-preview-doc]:shadow-md [&_.docx-preview-doc]:bg-white [&_.docx-preview-doc]:rounded [&_.docx-preview-doc]:my-2 [&_.docx-preview-doc]:max-w-full"
      />
    </div>
  );
}
