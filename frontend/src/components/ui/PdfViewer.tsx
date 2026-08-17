import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface PdfViewerProps {
  url: string;
}

/** Tall enough for ~3 A4 pages at 100% so the wrapper, not Chrome's PDF plugin, owns scrolling. */
const PDF_FRAME_HEIGHT_PX = 4000;

export const PdfViewer = ({ url }: PdfViewerProps) => {
  const [rendering, setRendering] = useState(true);
  const [allowPdfControls, setAllowPdfControls] = useState(false);
  const src = url.includes('#') ? url : `${url}#toolbar=1&navpanes=0&scrollbar=1`;

  useEffect(() => {
    setRendering(true);
    setAllowPdfControls(false);
  }, [url]);

  return (
    <div
      className="pdf-viewer-container relative w-full h-full min-h-[70vh] max-h-[85vh] bg-[#525659] border border-border rounded-lg overflow-y-auto"
      onClick={() => setAllowPdfControls(true)}
      onMouseLeave={() => setAllowPdfControls(false)}
    >
      {rendering && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/90 pointer-events-none">
          <LoadingSpinner className="w-8 h-8 mb-3" />
          <p className="text-sm text-text-secondary">Rendering PDF…</p>
        </div>
      )}
      <iframe
        src={src}
        title="PDF Document Viewer"
        className={`block w-full border-0 ${allowPdfControls ? '' : 'pointer-events-none'}`}
        style={{ height: PDF_FRAME_HEIGHT_PX }}
        onLoad={() => setRendering(false)}
      />
    </div>
  );
};
